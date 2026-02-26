use crate::PipelineError;
use crate::domain::canonical::CanonicalRow;
use crate::domain::record_hash::hash_record;
use crate::stages::consolidate::IngestCounters;
use csv::StringRecord;
use rusqlite::{Transaction, params};

pub(crate) fn ingest_one_row(
    tx: &Transaction<'_>,
    snapshot_id: i64,
    source_row_number: i64,
    delimiter: &str,
    record: &StringRecord,
    row: CanonicalRow,
    counters: &mut IngestCounters,
) -> Result<bool, PipelineError> {
    if !row.rep_doc_number.is_empty()
        && row.person_dni.is_none()
        && row.rep_doc_type.eq_ignore_ascii_case("DNI")
    {
        counters.invalid_dni_rows += 1;
    }

    if row.person_dni.is_none()
        && row.company_ruc.is_none()
        && row.role_name.is_empty()
        && row.rep_doc_number.is_empty()
        && row.phones.is_empty()
    {
        if row.company_ruc.is_none() && !row.company_name.is_empty() {
            counters.invalid_ruc_rows += 1;
        }
        return Ok(false);
    }

    let person_id = upsert_person(
        tx,
        row.person_dni.as_deref(),
        row.person_natural_ruc.as_deref(),
        &row.person_full_name,
    )?;
    let company_id = upsert_company(tx, row.company_ruc.as_deref(), &row.company_name)?;

    let role_id = if let Some(company_id) = company_id {
        if !row.role_name.is_empty() || !row.rep_doc_number.is_empty() || !row.rep_name.is_empty() {
            upsert_role(
                tx,
                person_id,
                company_id,
                &row.rep_doc_type,
                &row.rep_doc_number,
                &row.rep_name,
                &row.role_name,
                &row.role_start_date,
            )?
        } else {
            None
        }
    } else {
        None
    };

    if row.had_phone_input && row.phones.is_empty() {
        counters.invalid_phone_rows += 1;
    }
    for phone in &row.phones {
        if let Some(role_id) = role_id {
            upsert_role_phone(tx, role_id, phone, snapshot_id)?;
        } else if let Some(person_id) = person_id {
            upsert_person_phone(tx, person_id, phone, snapshot_id)?;
        } else if let Some(company_id) = company_id {
            upsert_company_phone(tx, company_id, phone, snapshot_id)?;
        }
    }

    let raw_hash = hash_record(record, delimiter);
    if let Some(person_id) = person_id {
        insert_evidence(
            tx,
            "person",
            person_id,
            snapshot_id,
            source_row_number,
            &raw_hash,
        )?;
    }
    if let Some(company_id) = company_id {
        insert_evidence(
            tx,
            "company",
            company_id,
            snapshot_id,
            source_row_number,
            &raw_hash,
        )?;
    }
    if let Some(role_id) = role_id {
        insert_evidence(
            tx,
            "role",
            role_id,
            snapshot_id,
            source_row_number,
            &raw_hash,
        )?;
    }

    Ok(true)
}

pub(crate) fn persist_metrics(
    tx: &Transaction<'_>,
    snapshot_id: i64,
    counters: &IngestCounters,
) -> Result<(), PipelineError> {
    let mut statement = tx.prepare_cached(
        r#"
        INSERT INTO snapshot_metrics(
            snapshot_id, total_rows, accepted_rows, invalid_dni_rows, invalid_ruc_rows, invalid_phone_rows
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6)
        ON CONFLICT(snapshot_id) DO UPDATE SET
            total_rows=excluded.total_rows,
            accepted_rows=excluded.accepted_rows,
            invalid_dni_rows=excluded.invalid_dni_rows,
            invalid_ruc_rows=excluded.invalid_ruc_rows,
            invalid_phone_rows=excluded.invalid_phone_rows
        "#,
    )?;
    statement.execute(params![
        snapshot_id,
        counters.total_rows,
        counters.accepted_rows,
        counters.invalid_dni_rows,
        counters.invalid_ruc_rows,
        counters.invalid_phone_rows
    ])?;
    Ok(())
}

pub(crate) fn upsert_snapshot(
    tx: &Transaction<'_>,
    source_key: &str,
    source_name: &str,
    snapshot_label: &str,
    snapshot_date: &str,
    file_path: &str,
    reliability_rank: i64,
) -> Result<i64, PipelineError> {
    let mut source_statement = tx.prepare_cached(
        r#"
        INSERT INTO source_registry(source_key, source_name, reliability_rank)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(source_key) DO UPDATE SET
            source_name=excluded.source_name,
            reliability_rank=excluded.reliability_rank
        RETURNING source_id
        "#,
    )?;
    let source_id: i64 = source_statement
        .query_row(params![source_key, source_name, reliability_rank], |row| {
            row.get(0)
        })?;

    let mut snapshot_statement = tx.prepare_cached(
        r#"
        INSERT INTO source_snapshot(source_id, snapshot_label, snapshot_date, file_path, status)
        VALUES (?1, ?2, ?3, ?4, 'registered')
        ON CONFLICT(source_id, snapshot_label) DO UPDATE SET
            snapshot_date=excluded.snapshot_date,
            file_path=excluded.file_path
        RETURNING snapshot_id
        "#,
    )?;
    let snapshot_id: i64 = snapshot_statement.query_row(
        params![source_id, snapshot_label, snapshot_date, file_path],
        |row| row.get(0),
    )?;
    Ok(snapshot_id)
}

fn upsert_person(
    tx: &Transaction<'_>,
    dni: Option<&str>,
    natural_ruc10: Option<&str>,
    full_name: &str,
) -> Result<Option<i64>, PipelineError> {
    if let Some(dni) = dni {
        let mut statement = tx.prepare_cached(
            r#"
            INSERT INTO person_profile(dni, natural_ruc10, full_name)
            VALUES (?1, ?2, ?3)
            ON CONFLICT(dni) DO UPDATE SET
                natural_ruc10 = CASE
                    WHEN excluded.natural_ruc10 IS NOT NULL AND excluded.natural_ruc10 <> ''
                        THEN excluded.natural_ruc10
                    ELSE person_profile.natural_ruc10
                END,
                full_name = CASE
                    WHEN excluded.full_name <> '' THEN excluded.full_name
                    ELSE person_profile.full_name
                END
            RETURNING person_id
            "#,
        )?;
        let id: i64 =
            statement.query_row(params![dni, natural_ruc10, full_name], |row| row.get(0))?;
        return Ok(Some(id));
    }

    if full_name.is_empty() {
        return Ok(None);
    }
    let mut statement = tx.prepare_cached(
        "INSERT INTO person_profile(dni, natural_ruc10, full_name) VALUES (NULL, ?1, ?2) RETURNING person_id",
    )?;
    let person_id: i64 =
        statement.query_row(params![natural_ruc10, full_name], |row| row.get(0))?;
    Ok(Some(person_id))
}

fn upsert_company(
    tx: &Transaction<'_>,
    ruc: Option<&str>,
    legal_name: &str,
) -> Result<Option<i64>, PipelineError> {
    let Some(ruc) = ruc else {
        return Ok(None);
    };

    let mut statement = tx.prepare_cached(
        r#"
        INSERT INTO company_profile(ruc, legal_name)
        VALUES (?1, ?2)
        ON CONFLICT(ruc) DO UPDATE SET
            legal_name = CASE
                WHEN excluded.legal_name <> '' THEN excluded.legal_name
                ELSE company_profile.legal_name
            END
        RETURNING company_id
        "#,
    )?;
    let company_id: i64 = statement.query_row(params![ruc, legal_name], |row| row.get(0))?;
    Ok(Some(company_id))
}

#[allow(clippy::too_many_arguments)]
fn upsert_role(
    tx: &Transaction<'_>,
    person_id: Option<i64>,
    company_id: i64,
    rep_doc_type: &str,
    rep_doc_number: &str,
    rep_name: &str,
    role_name: &str,
    role_start_date: &str,
) -> Result<Option<i64>, PipelineError> {
    let mut statement = tx.prepare_cached(
        r#"
        INSERT INTO person_company_role(
            person_id, company_id, rep_doc_type, rep_doc_number, rep_name, role_name, role_start_date, resolution_status
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
        ON CONFLICT(company_id, rep_doc_type, rep_doc_number, role_name, role_start_date) DO UPDATE SET
            person_id = COALESCE(person_company_role.person_id, excluded.person_id),
            rep_name = CASE
                WHEN excluded.rep_name <> '' THEN excluded.rep_name
                ELSE person_company_role.rep_name
            END,
            resolution_status = excluded.resolution_status
        RETURNING role_id
        "#,
    )?;
    let role_id: i64 = statement.query_row(
        params![
            person_id,
            company_id,
            rep_doc_type,
            rep_doc_number,
            rep_name,
            role_name,
            role_start_date,
            if person_id.is_some() {
                "resolved"
            } else {
                "unresolved"
            }
        ],
        |row| row.get(0),
    )?;
    Ok(Some(role_id))
}

fn upsert_person_phone(
    tx: &Transaction<'_>,
    person_id: i64,
    phone: &str,
    snapshot_id: i64,
) -> Result<(), PipelineError> {
    let mut statement = tx.prepare_cached(
        r#"
        INSERT INTO person_phone(person_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence)
        VALUES (?1, ?2, ?3, ?3, 100)
        ON CONFLICT(person_id, phone) DO UPDATE SET
            last_seen_snapshot_id=excluded.last_seen_snapshot_id
        "#,
    )?;
    statement.execute(params![person_id, phone, snapshot_id])?;
    Ok(())
}

fn upsert_company_phone(
    tx: &Transaction<'_>,
    company_id: i64,
    phone: &str,
    snapshot_id: i64,
) -> Result<(), PipelineError> {
    let mut statement = tx.prepare_cached(
        r#"
        INSERT INTO company_phone(company_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence)
        VALUES (?1, ?2, ?3, ?3, 100)
        ON CONFLICT(company_id, phone) DO UPDATE SET
            last_seen_snapshot_id=excluded.last_seen_snapshot_id
        "#,
    )?;
    statement.execute(params![company_id, phone, snapshot_id])?;
    Ok(())
}

fn upsert_role_phone(
    tx: &Transaction<'_>,
    role_id: i64,
    phone: &str,
    snapshot_id: i64,
) -> Result<(), PipelineError> {
    let mut statement = tx.prepare_cached(
        r#"
        INSERT INTO role_phone(role_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence)
        VALUES (?1, ?2, ?3, ?3, 70)
        ON CONFLICT(role_id, phone) DO UPDATE SET
            last_seen_snapshot_id=excluded.last_seen_snapshot_id
        "#,
    )?;
    statement.execute(params![role_id, phone, snapshot_id])?;
    Ok(())
}

fn insert_evidence(
    tx: &Transaction<'_>,
    entity_kind: &str,
    entity_pk: i64,
    snapshot_id: i64,
    source_row_number: i64,
    raw_hash: &str,
) -> Result<(), PipelineError> {
    let mut statement = tx.prepare_cached(
        r#"
        INSERT INTO entity_evidence(entity_kind, entity_pk, snapshot_id, source_row_number, raw_hash)
        VALUES (?1, ?2, ?3, ?4, ?5)
        ON CONFLICT(entity_kind, entity_pk, snapshot_id, source_row_number) DO NOTHING
        "#,
    )?;
    statement.execute(params![
        entity_kind,
        entity_pk,
        snapshot_id,
        source_row_number,
        raw_hash
    ])?;
    Ok(())
}
