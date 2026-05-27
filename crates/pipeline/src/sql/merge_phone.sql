CREATE TEMP TABLE tmp_phone_rows AS
SELECT
    rf.doc_id,
    rf.company_id,
    je.value AS phone
FROM tmp_stage ts
JOIN tmp_resolved_facts rf ON rf.source_row_number = ts.source_row_number,
    json_each(ts.phones_json) je
WHERE ts.had_phone_input = 1
  AND ts.phones_json <> '[]'
  AND (rf.doc_id IS NOT NULL OR rf.company_id IS NOT NULL);

-- Phones attributed to a resolved document holder.
INSERT INTO document_phone(doc_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence)
SELECT DISTINCT
    tp.doc_id,
    tp.phone,
    {snapshot_id},
    {snapshot_id},
    {reliability_rank}
FROM tmp_phone_rows tp
WHERE tp.doc_id IS NOT NULL
ON CONFLICT(doc_id, phone) DO UPDATE SET
    last_seen_snapshot_id = excluded.last_seen_snapshot_id,
    confidence = MAX(document_phone.confidence, excluded.confidence);

-- Unresolved document phones fall through to company-level attribution.
INSERT INTO company_phone(company_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence)
SELECT DISTINCT
    tp.company_id,
    tp.phone,
    {snapshot_id},
    {snapshot_id},
    {reliability_rank}
FROM tmp_phone_rows tp
WHERE tp.doc_id IS NULL
  AND tp.company_id IS NOT NULL
ON CONFLICT(company_id, phone) DO UPDATE SET
    last_seen_snapshot_id = excluded.last_seen_snapshot_id,
    confidence = MAX(company_phone.confidence, excluded.confidence);
