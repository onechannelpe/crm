INSERT INTO entity_evidence(entity_kind, entity_pk, snapshot_id, source_row_number, raw_hash)
SELECT DISTINCT
    'role',
    r.role_id,
    ?1,
    ts.source_row_number,
    ts.raw_hash
FROM tmp_stage ts
JOIN company_profile cp ON cp.ruc = ts.company_ruc
JOIN person_company_role r
    ON r.company_id = cp.company_id
    AND r.rep_doc_type = ts.rep_doc_type
    AND r.rep_doc_number = ts.rep_doc_number
    AND r.role_name = ts.role_name
    AND r.role_start_date = ts.role_start_date
WHERE ts.company_ruc IS NOT NULL
    AND (
        ts.role_name <> ''
        OR ts.rep_doc_number <> ''
        OR ts.rep_name <> ''
    )
ON CONFLICT(entity_kind, entity_pk, snapshot_id, source_row_number) DO NOTHING;
