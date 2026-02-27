INSERT INTO entity_evidence(entity_kind, entity_pk, snapshot_id, source_row_number, raw_hash)
SELECT DISTINCT
    'company',
    cp.company_id,
    ?1,
    ts.source_row_number,
    ts.raw_hash
FROM tmp_stage ts
JOIN company_profile cp ON cp.ruc = ts.company_ruc
WHERE ts.company_ruc IS NOT NULL
ON CONFLICT(entity_kind, entity_pk, snapshot_id, source_row_number) DO NOTHING;
