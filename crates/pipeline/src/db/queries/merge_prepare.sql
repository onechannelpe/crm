CREATE TEMP TABLE tmp_stage AS
SELECT
    source_row_number,
    NULLIF(person_dni, '') AS person_dni,
    NULLIF(person_natural_ruc, '') AS person_natural_ruc,
    person_full_name,
    email,
    NULLIF(company_ruc, '') AS company_ruc,
    company_name,
    role_name,
    role_start_date,
    rep_doc_type,
    rep_doc_number,
    rep_name,
    phones_json,
    had_phone_input,
    raw_hash,
    company_status,
    company_condition,
    company_type,
    economic_activity,
    company_ubigeo,
    company_department,
    company_province,
    company_district
FROM shard.stage_rows;

CREATE INDEX tmp_stage_rep_doc_idx ON tmp_stage(rep_doc_type, rep_doc_number);
CREATE INDEX tmp_stage_company_ruc_idx ON tmp_stage(company_ruc);
CREATE INDEX tmp_stage_role_lookup_idx
    ON tmp_stage(company_ruc, rep_doc_type, rep_doc_number, role_name, role_start_date);

-- Deduplicate documents from rep doc rows and DNI-only rows.
CREATE TEMP TABLE tmp_doc_dedup AS
SELECT
    rep_doc_type AS doc_type,
    rep_doc_number AS doc_number,
    MAX(CASE WHEN rep_name <> '' THEN rep_name
             WHEN person_full_name <> '' THEN person_full_name
             ELSE '' END) AS full_name,
    MAX(CASE WHEN person_natural_ruc IS NOT NULL THEN person_natural_ruc ELSE '' END) AS natural_ruc
FROM tmp_stage
WHERE NULLIF(rep_doc_type, '') IS NOT NULL AND NULLIF(rep_doc_number, '') IS NOT NULL
GROUP BY rep_doc_type, rep_doc_number
UNION ALL
SELECT
    'DNI' AS doc_type,
    person_dni AS doc_number,
    MAX(CASE WHEN person_full_name <> '' THEN person_full_name ELSE '' END) AS full_name,
    MAX(CASE WHEN person_natural_ruc IS NOT NULL THEN person_natural_ruc ELSE '' END) AS natural_ruc
FROM tmp_stage
WHERE person_dni IS NOT NULL
  AND (NULLIF(rep_doc_type, '') IS NULL OR NULLIF(rep_doc_number, '') IS NULL)
GROUP BY person_dni;

CREATE INDEX tmp_doc_dedup_idx ON tmp_doc_dedup(doc_type, doc_number);

CREATE TEMP TABLE tmp_company_dedup AS
SELECT
    company_ruc,
    MAX(CASE WHEN company_name <> '' THEN company_name ELSE '' END) AS company_name,
    MAX(CASE WHEN company_status <> '' THEN company_status ELSE '' END) AS company_status,
    MAX(CASE WHEN company_condition <> '' THEN company_condition ELSE '' END) AS company_condition,
    MAX(CASE WHEN company_type <> '' THEN company_type ELSE '' END) AS company_type,
    MAX(CASE WHEN economic_activity <> '' THEN economic_activity ELSE '' END) AS economic_activity,
    MAX(CASE WHEN company_ubigeo <> '' THEN company_ubigeo ELSE '' END) AS company_ubigeo,
    MAX(CASE WHEN company_department <> '' THEN company_department ELSE '' END) AS company_department,
    MAX(CASE WHEN company_province <> '' THEN company_province ELSE '' END) AS company_province,
    MAX(CASE WHEN company_district <> '' THEN company_district ELSE '' END) AS company_district
FROM tmp_stage
WHERE company_ruc IS NOT NULL
GROUP BY company_ruc;
