CREATE TEMP TABLE tmp_phone_rows AS
SELECT
    ts.person_dni,
    ts.company_ruc,
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
WHERE tp.person_dni IS NULL
ON CONFLICT(company_id, phone) DO UPDATE SET
    last_seen_snapshot_id = excluded.last_seen_snapshot_id;
