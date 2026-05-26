CREATE TEMP TABLE tmp_phone_rows AS
SELECT
    ts.person_dni,
    ts.company_ruc,
    ts.rep_doc_type,
    ts.rep_doc_number,
    je.value AS phone
FROM tmp_stage ts, json_each(ts.phones_json) je
WHERE ts.had_phone_input = 1
  AND ts.phones_json <> '[]';

-- Phones attributed to a document holder via rep doc
INSERT INTO document_phone(doc_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence)
SELECT DISTINCT
    d.doc_id,
    tp.phone,
    {snapshot_id},
    {snapshot_id},
    {reliability_rank}
FROM tmp_phone_rows tp
JOIN document d ON d.doc_type = tp.rep_doc_type AND d.doc_number = tp.rep_doc_number
WHERE tp.rep_doc_type IS NOT NULL AND tp.rep_doc_type <> ''
  AND tp.rep_doc_number IS NOT NULL AND tp.rep_doc_number <> ''
ON CONFLICT(doc_id, phone) DO UPDATE SET
    last_seen_snapshot_id = excluded.last_seen_snapshot_id,
    confidence = MAX(document_phone.confidence, excluded.confidence);

-- Phones from DNI-only rows (RENIEC-like sources with no rep doc)
INSERT INTO document_phone(doc_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence)
SELECT DISTINCT
    d.doc_id,
    tp.phone,
    {snapshot_id},
    {snapshot_id},
    {reliability_rank}
FROM tmp_phone_rows tp
JOIN document d ON d.doc_type = 'DNI' AND d.doc_number = tp.person_dni
WHERE tp.person_dni IS NOT NULL
  AND (tp.rep_doc_type IS NULL OR tp.rep_doc_type = ''
       OR tp.rep_doc_number IS NULL OR tp.rep_doc_number = '')
ON CONFLICT(doc_id, phone) DO UPDATE SET
    last_seen_snapshot_id = excluded.last_seen_snapshot_id,
    confidence = MAX(document_phone.confidence, excluded.confidence);

-- Phones with no resolved doc fall through to company_phone
INSERT INTO company_phone(company_id, phone, first_seen_snapshot_id, last_seen_snapshot_id, confidence)
SELECT DISTINCT
    cp.company_id,
    tp.phone,
    {snapshot_id},
    {snapshot_id},
    {reliability_rank}
FROM tmp_phone_rows tp
JOIN company_profile cp ON cp.ruc = tp.company_ruc
WHERE tp.person_dni IS NULL
  AND (tp.rep_doc_type IS NULL OR tp.rep_doc_type = ''
       OR tp.rep_doc_number IS NULL OR tp.rep_doc_number = '')
ON CONFLICT(company_id, phone) DO UPDATE SET
    last_seen_snapshot_id = excluded.last_seen_snapshot_id,
    confidence = MAX(company_phone.confidence, excluded.confidence);
