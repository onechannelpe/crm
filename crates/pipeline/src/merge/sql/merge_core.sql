INSERT INTO document(doc_type, doc_number)
SELECT doc_type, doc_number
FROM tmp_doc_dedup
WHERE 1 = 1
ON CONFLICT(doc_type, doc_number) DO NOTHING;

-- Higher-ranked identity data wins; ties prefer the newer write.
INSERT INTO document_attribute(doc_id, full_name, full_name_rank, natural_ruc10)
SELECT
    d.doc_id,
    td.full_name,
    {reliability_rank},
    NULLIF(td.natural_ruc, '')
FROM tmp_doc_dedup td
JOIN document d
    ON d.doc_type = td.doc_type
    AND d.doc_number = td.doc_number
ON CONFLICT(doc_id) DO UPDATE SET
    full_name = CASE
        WHEN excluded.full_name <> ''
            AND excluded.full_name_rank >= document_attribute.full_name_rank
            THEN excluded.full_name
        ELSE document_attribute.full_name
    END,
    full_name_rank = CASE
        WHEN excluded.full_name <> ''
            AND excluded.full_name_rank >= document_attribute.full_name_rank
            THEN excluded.full_name_rank
        ELSE document_attribute.full_name_rank
    END,
    natural_ruc10 = COALESCE(
        excluded.natural_ruc10,
        document_attribute.natural_ruc10
    )
WHERE
    (
        excluded.full_name <> ''
        AND excluded.full_name_rank >= document_attribute.full_name_rank
        AND excluded.full_name <> document_attribute.full_name
    )
    OR (
        excluded.natural_ruc10 IS NOT NULL
        AND excluded.natural_ruc10 IS NOT document_attribute.natural_ruc10
    );

INSERT INTO company(
    ruc,
    legal_name,
    legal_name_rank,
    status,
    condition,
    company_type,
    economic_activity,
    ubigeo_code,
    department,
    province,
    district
)
SELECT
    company_ruc,
    company_name,
    {reliability_rank},
    NULLIF(company_status, ''),
    NULLIF(company_condition, ''),
    NULLIF(company_type, ''),
    NULLIF(economic_activity, ''),
    NULLIF(company_ubigeo, ''),
    NULLIF(company_department, ''),
    NULLIF(company_province, ''),
    NULLIF(company_district, '')
FROM tmp_company_dedup
WHERE 1 = 1
ON CONFLICT(ruc) DO UPDATE SET
    -- Legal name is identity data; current-state fields use the newest value.
    legal_name = CASE
        WHEN excluded.legal_name <> ''
            AND excluded.legal_name_rank >= company.legal_name_rank
            THEN excluded.legal_name
        ELSE company.legal_name
    END,
    legal_name_rank = CASE
        WHEN excluded.legal_name <> ''
            AND excluded.legal_name_rank >= company.legal_name_rank
            THEN excluded.legal_name_rank
        ELSE company.legal_name_rank
    END,
    status = COALESCE(excluded.status, company.status),
    condition = COALESCE(excluded.condition, company.condition),
    company_type = COALESCE(excluded.company_type, company.company_type),
    economic_activity = COALESCE(
        excluded.economic_activity,
        company.economic_activity
    ),
    ubigeo_code = COALESCE(excluded.ubigeo_code, company.ubigeo_code),
    department = COALESCE(excluded.department, company.department),
    province = COALESCE(excluded.province, company.province),
    district = COALESCE(excluded.district, company.district)
WHERE
    (
        excluded.legal_name <> ''
        AND excluded.legal_name_rank >= company.legal_name_rank
        AND excluded.legal_name <> company.legal_name
    )
    OR excluded.status IS NOT NULL
    OR excluded.condition IS NOT NULL
    OR excluded.company_type IS NOT NULL
    OR excluded.economic_activity IS NOT NULL
    OR excluded.ubigeo_code IS NOT NULL
    OR excluded.department IS NOT NULL
    OR excluded.province IS NOT NULL
    OR excluded.district IS NOT NULL;

CREATE TEMP TABLE tmp_resolved_facts AS
SELECT
    ts.source_row_number,
    cp.company_id,
    ts.company_ruc,
    ts.person_dni,
    ts.rep_doc_type,
    ts.rep_doc_number,
    ts.rep_name,
    ts.role_name,
    ts.role_start_date,
    ts.email,
    CASE
        WHEN ts.rep_doc_type <> '' AND ts.rep_doc_number <> ''
            THEN rep_doc.doc_id
        WHEN ts.person_dni IS NOT NULL
            THEN dni_doc.doc_id
        ELSE NULL
    END AS doc_id
FROM tmp_stage ts
LEFT JOIN company cp
    ON cp.ruc = ts.company_ruc
LEFT JOIN document rep_doc
    ON rep_doc.doc_type = ts.rep_doc_type
    AND rep_doc.doc_number = ts.rep_doc_number
LEFT JOIN document dni_doc
    ON dni_doc.doc_type = 'DNI'
    AND dni_doc.doc_number = ts.person_dni;

CREATE INDEX tmp_resolved_facts_row_idx
    ON tmp_resolved_facts(source_row_number);

CREATE INDEX tmp_resolved_facts_doc_idx
    ON tmp_resolved_facts(doc_id);

CREATE INDEX tmp_resolved_facts_company_idx
    ON tmp_resolved_facts(company_id);

CREATE TEMP TABLE tmp_role_source AS
SELECT DISTINCT
    rf.doc_id,
    rf.company_id,
    rf.rep_doc_type,
    rf.rep_doc_number,
    rf.rep_name,
    rf.role_name,
    rf.role_start_date
FROM tmp_resolved_facts rf
WHERE
    rf.company_id IS NOT NULL
    AND (
        rf.role_name <> ''
        OR rf.rep_doc_number <> ''
        OR rf.rep_name <> ''
    );

-- Representative names follow the same identity-data rank rule.
INSERT INTO company_role(
    doc_id,
    company_id,
    rep_doc_type,
    rep_doc_number,
    rep_name,
    rep_name_rank,
    role_name,
    role_start_date
)
SELECT
    doc_id,
    company_id,
    rep_doc_type,
    rep_doc_number,
    rep_name,
    {reliability_rank},
    role_name,
    role_start_date
FROM tmp_role_source
WHERE 1 = 1
ON CONFLICT(
    company_id,
    rep_doc_type,
    rep_doc_number,
    role_name,
    role_start_date
) DO UPDATE SET
    doc_id = COALESCE(company_role.doc_id, excluded.doc_id),
    rep_name = CASE
        WHEN excluded.rep_name <> ''
            AND excluded.rep_name_rank >= company_role.rep_name_rank
            THEN excluded.rep_name
        ELSE company_role.rep_name
    END,
    rep_name_rank = CASE
        WHEN excluded.rep_name <> ''
            AND excluded.rep_name_rank >= company_role.rep_name_rank
            THEN excluded.rep_name_rank
        ELSE company_role.rep_name_rank
    END
WHERE
    (
        company_role.doc_id IS NULL
        AND excluded.doc_id IS NOT NULL
    )
    OR (
        excluded.rep_name <> ''
        AND excluded.rep_name_rank >= company_role.rep_name_rank
        AND excluded.rep_name <> company_role.rep_name
    );
