INSERT INTO person_profile(dni, natural_ruc10, full_name, email)
SELECT
    person_dni,
    NULLIF(person_natural_ruc, ''),
    person_full_name,
    email
FROM tmp_person_dedup
WHERE 1 = 1
ON CONFLICT(dni) DO UPDATE SET
    natural_ruc10 = CASE
        WHEN excluded.natural_ruc10 IS NOT NULL AND excluded.natural_ruc10 <> '' THEN excluded.natural_ruc10
        ELSE person_profile.natural_ruc10
    END,
    full_name = CASE
        WHEN excluded.full_name <> '' THEN excluded.full_name
        ELSE person_profile.full_name
    END,
    email = CASE
        WHEN excluded.email IS NOT NULL AND person_profile.email IS NULL THEN excluded.email
        ELSE person_profile.email
    END
WHERE
    (excluded.natural_ruc10 IS NOT NULL AND excluded.natural_ruc10 <> '' AND excluded.natural_ruc10 <> person_profile.natural_ruc10)
    OR (excluded.full_name <> '' AND excluded.full_name <> person_profile.full_name)
    OR (excluded.email IS NOT NULL AND person_profile.email IS NULL);

INSERT INTO person_profile(dni, natural_ruc10, full_name)
SELECT
    NULL,
    NULLIF(person_natural_ruc, ''),
    person_full_name
FROM tmp_stage
WHERE person_dni IS NULL
    AND NULLIF(person_natural_ruc, '') IS NOT NULL
ON CONFLICT(natural_ruc10) DO UPDATE SET
    full_name = CASE
        WHEN excluded.full_name <> '' THEN excluded.full_name
        ELSE person_profile.full_name
    END
WHERE excluded.full_name <> '' AND excluded.full_name <> person_profile.full_name;

INSERT INTO company_profile(ruc, legal_name)
SELECT
    company_ruc,
    company_name
FROM tmp_company_dedup
WHERE 1 = 1
ON CONFLICT(ruc) DO UPDATE SET
    legal_name = CASE
        WHEN excluded.legal_name <> '' THEN excluded.legal_name
        ELSE company_profile.legal_name
    END
WHERE excluded.legal_name <> '' AND excluded.legal_name <> company_profile.legal_name;

CREATE TEMP TABLE tmp_role_source AS
SELECT DISTINCT
    pp.person_id AS person_id,
    cp.company_id AS company_id,
    ts.rep_doc_type,
    ts.rep_doc_number,
    ts.rep_name,
    ts.role_name,
    ts.role_start_date,
    CASE WHEN pp.person_id IS NULL THEN 'unresolved' ELSE 'resolved' END AS resolution_status
FROM tmp_stage ts
JOIN company_profile cp ON cp.ruc = ts.company_ruc
LEFT JOIN person_profile pp ON pp.dni = ts.person_dni
WHERE
    ts.company_ruc IS NOT NULL
    AND (
        ts.role_name <> ''
        OR ts.rep_doc_number <> ''
        OR ts.rep_name <> ''
    );

INSERT INTO person_company_role(
    person_id,
    company_id,
    rep_doc_type,
    rep_doc_number,
    rep_name,
    role_name,
    role_start_date,
    resolution_status
)
SELECT
    person_id,
    company_id,
    rep_doc_type,
    rep_doc_number,
    rep_name,
    role_name,
    role_start_date,
    resolution_status
FROM tmp_role_source
WHERE 1 = 1
ON CONFLICT(company_id, rep_doc_type, rep_doc_number, role_name, role_start_date) DO UPDATE SET
    person_id = COALESCE(person_company_role.person_id, excluded.person_id),
    rep_name = CASE
        WHEN excluded.rep_name <> '' THEN excluded.rep_name
        ELSE person_company_role.rep_name
    END,
    resolution_status = excluded.resolution_status
WHERE
    (person_company_role.person_id IS NULL AND excluded.person_id IS NOT NULL)
    OR (excluded.rep_name <> '' AND excluded.rep_name <> person_company_role.rep_name)
    OR (excluded.resolution_status <> person_company_role.resolution_status);
