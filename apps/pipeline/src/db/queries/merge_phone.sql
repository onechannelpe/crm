CREATE TEMP TABLE tmp_phone_rows AS
SELECT
    ts.person_dni,
    ts.company_ruc,
    ts.rep_doc_type,
    ts.rep_doc_number,
    ts.role_name,
    ts.role_start_date,
    je.value AS phone
FROM tmp_stage ts, json_each(ts.phones_json) je;

INSERT INTO person_phone(person_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence)
SELECT DISTINCT
    pp.person_id,
    tp.phone,
    {snapshot_id},
    {snapshot_id},
    100
FROM tmp_phone_rows tp
JOIN person_profile pp ON pp.dni = tp.person_dni
LEFT JOIN person_company_role r
    ON r.company_id IN (SELECT company_id FROM company_profile WHERE ruc = tp.company_ruc)
    AND r.rep_doc_type = tp.rep_doc_type
    AND r.rep_doc_number = tp.rep_doc_number
    AND r.role_name = tp.role_name
    AND r.role_start_date = tp.role_start_date
WHERE r.role_id IS NULL
ON CONFLICT(person_id, phone) DO UPDATE SET
    last_seen_snapshot_id = excluded.last_seen_snapshot_id;

INSERT INTO company_phone(company_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence)
SELECT DISTINCT
    cp.company_id,
    tp.phone,
    {snapshot_id},
    {snapshot_id},
    100
FROM tmp_phone_rows tp
JOIN company_profile cp ON cp.ruc = tp.company_ruc
LEFT JOIN person_profile pp ON pp.dni = tp.person_dni
LEFT JOIN person_company_role r
    ON r.company_id = cp.company_id
    AND r.rep_doc_type = tp.rep_doc_type
    AND r.rep_doc_number = tp.rep_doc_number
    AND r.role_name = tp.role_name
    AND r.role_start_date = tp.role_start_date
WHERE r.role_id IS NULL AND pp.person_id IS NULL
ON CONFLICT(company_id, phone) DO UPDATE SET
    last_seen_snapshot_id = excluded.last_seen_snapshot_id;

INSERT INTO role_phone(role_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence)
SELECT DISTINCT
    r.role_id,
    tp.phone,
    {snapshot_id},
    {snapshot_id},
    70
FROM tmp_phone_rows tp
JOIN company_profile cp ON cp.ruc = tp.company_ruc
JOIN person_company_role r
    ON r.company_id = cp.company_id
    AND r.rep_doc_type = tp.rep_doc_type
    AND r.rep_doc_number = tp.rep_doc_number
    AND r.role_name = tp.role_name
    AND r.role_start_date = tp.role_start_date
ON CONFLICT(role_id, phone) DO UPDATE SET
    last_seen_snapshot_id = excluded.last_seen_snapshot_id;
