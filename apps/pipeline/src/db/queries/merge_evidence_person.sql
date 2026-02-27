INSERT INTO entity_evidence(entity_kind, entity_pk, snapshot_id, source_row_number, raw_hash)
SELECT DISTINCT
    'person',
    pp.person_id,
    ?1,
    ts.source_row_number,
    ts.raw_hash
FROM tmp_stage ts
JOIN person_profile pp ON pp.dni = ts.person_dni
WHERE ts.person_dni IS NOT NULL
ON CONFLICT(entity_kind, entity_pk, snapshot_id, source_row_number) DO NOTHING;
