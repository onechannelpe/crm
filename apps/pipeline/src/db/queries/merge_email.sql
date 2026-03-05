CREATE TEMP TABLE tmp_email_rows AS
SELECT DISTINCT
    pp.person_id,
    ts.email
FROM tmp_stage ts
JOIN tmp_row_delta delta ON delta.source_row_number = ts.source_row_number
JOIN person_profile pp ON pp.dni = ts.person_dni
WHERE ts.email IS NOT NULL
  AND ts.person_dni IS NOT NULL;

INSERT INTO person_email(person_id, email, source_id, reliability)
SELECT
    person_id,
    email,
    {source_id},
    {reliability_rank}
FROM tmp_email_rows
WHERE 1=1
ON CONFLICT(person_id, email) DO UPDATE SET
    reliability = MAX(person_email.reliability, excluded.reliability),
    source_id = CASE
        WHEN excluded.reliability >= person_email.reliability THEN excluded.source_id
        ELSE person_email.source_id
    END;
