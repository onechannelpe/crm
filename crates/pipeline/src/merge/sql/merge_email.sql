CREATE TEMP TABLE tmp_email_rows AS
SELECT DISTINCT
    rf.doc_id,
    rf.email AS email
FROM tmp_resolved_facts rf
JOIN tmp_row_delta delta ON delta.source_row_number = rf.source_row_number
WHERE rf.email IS NOT NULL
  AND rf.doc_id IS NOT NULL;

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
