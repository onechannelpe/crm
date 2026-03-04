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
    raw_hash
FROM shard.stage_rows;

CREATE INDEX tmp_stage_person_dni_idx ON tmp_stage(person_dni);
CREATE INDEX tmp_stage_company_ruc_idx ON tmp_stage(company_ruc);
CREATE INDEX tmp_stage_role_lookup_idx
    ON tmp_stage(company_ruc, rep_doc_type, rep_doc_number, role_name, role_start_date);

CREATE TEMP TABLE tmp_person_dedup AS
SELECT
    person_dni,
    MAX(CASE WHEN person_natural_ruc IS NOT NULL THEN person_natural_ruc ELSE '' END) AS person_natural_ruc,
    MAX(CASE WHEN person_full_name <> '' THEN person_full_name ELSE '' END) AS person_full_name
FROM tmp_stage
WHERE person_dni IS NOT NULL
GROUP BY person_dni;

CREATE TEMP TABLE tmp_company_dedup AS
SELECT
    company_ruc,
    MAX(CASE WHEN company_name <> '' THEN company_name ELSE '' END) AS company_name
FROM tmp_stage
WHERE company_ruc IS NOT NULL
GROUP BY company_ruc;
