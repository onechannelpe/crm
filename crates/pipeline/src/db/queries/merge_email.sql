-- Emails from rep doc rows
CREATE TEMP TABLE tmp_email_rows AS
SELECT DISTINCT
    d.doc_id,
    ts.email
FROM tmp_stage ts
JOIN tmp_row_delta delta ON delta.source_row_number = ts.source_row_number
JOIN document d ON d.doc_type = ts.rep_doc_type AND d.doc_number = ts.rep_doc_number
WHERE ts.email IS NOT NULL
  AND ts.rep_doc_type <> ''
  AND ts.rep_doc_number <> ''
UNION
-- Emails from DNI-only rows (RENIEC-like sources)
SELECT DISTINCT
    d.doc_id,
    ts.email
FROM tmp_stage ts
JOIN tmp_row_delta delta ON delta.source_row_number = ts.source_row_number
JOIN document d ON d.doc_type = 'DNI' AND d.doc_number = ts.person_dni
WHERE ts.email IS NOT NULL
  AND ts.person_dni IS NOT NULL
  AND (ts.rep_doc_type = '' OR ts.rep_doc_number = '');

INSERT INTO document_email(doc_id, email, source_id, reliability)
SELECT
    doc_id,
    email,
    {source_id},
    {reliability_rank}
FROM tmp_email_rows
WHERE 1=1
ON CONFLICT(doc_id, email) DO UPDATE SET
    reliability = MAX(document_email.reliability, excluded.reliability),
    source_id = CASE
        WHEN excluded.reliability >= document_email.reliability THEN excluded.source_id
        ELSE document_email.source_id
    END;
