INSERT INTO document(doc_type, doc_number)
SELECT doc_type, doc_number FROM tmp_doc_dedup
WHERE 1 = 1
ON CONFLICT(doc_type, doc_number) DO NOTHING;

INSERT INTO document_attribute(doc_id, full_name, natural_ruc10)
SELECT d.doc_id, td.full_name, NULLIF(td.natural_ruc, '')
FROM tmp_doc_dedup td
JOIN document d ON d.doc_type = td.doc_type AND d.doc_number = td.doc_number
ON CONFLICT(doc_id) DO UPDATE SET
    full_name = CASE
        WHEN excluded.full_name <> '' THEN excluded.full_name
        ELSE document_attribute.full_name
    END,
    natural_ruc10 = COALESCE(excluded.natural_ruc10, document_attribute.natural_ruc10)
WHERE
    (excluded.full_name <> '' AND excluded.full_name <> document_attribute.full_name)
    OR (excluded.natural_ruc10 IS NOT NULL AND excluded.natural_ruc10 <> document_attribute.natural_ruc10);

INSERT INTO company(ruc, legal_name, status, condition, company_type, economic_activity, ubigeo_code, department, province, district)
SELECT
    company_ruc,
    company_name,
    NULLIF(company_status, ''),
    NULLIF(company_condition, ''),
    NULLIF(company_type, ''),
    NULLIF(economic_activity, ''),
    NULLIF(company_ubigeo, ''),
    NULLIF(company_department, ''),
    NULLIF(company_province, ''),
    NULLIF(company_district, '')
FROM tmp_company_dedup
WHERE 1 = 1
ON CONFLICT(ruc) DO UPDATE SET
    legal_name = CASE
        WHEN excluded.legal_name <> '' THEN excluded.legal_name
        ELSE company.legal_name
    END,
    status = COALESCE(excluded.status, company.status),
    condition = COALESCE(excluded.condition, company.condition),
    company_type = COALESCE(excluded.company_type, company.company_type),
    economic_activity = COALESCE(excluded.economic_activity, company.economic_activity),
    ubigeo_code = COALESCE(excluded.ubigeo_code, company.ubigeo_code),
    department = COALESCE(excluded.department, company.department),
    province = COALESCE(excluded.province, company.province),
    district = COALESCE(excluded.district, company.district)
WHERE
    (excluded.legal_name <> '' AND excluded.legal_name <> company.legal_name)
    OR excluded.status IS NOT NULL
    OR excluded.condition IS NOT NULL
    OR excluded.company_type IS NOT NULL
    OR excluded.economic_activity IS NOT NULL
    OR excluded.ubigeo_code IS NOT NULL
    OR excluded.department IS NOT NULL
    OR excluded.province IS NOT NULL
    OR excluded.district IS NOT NULL;

CREATE TEMP TABLE tmp_resolved_facts AS
SELECT
    ts.source_row_number,
    cp.company_id,
    ts.company_ruc,
    ts.person_dni,
    ts.rep_doc_type,
    ts.rep_doc_number,
    ts.rep_name,
    ts.role_name,
    ts.role_start_date,
    ts.email,
    CASE
        WHEN ts.rep_doc_type <> '' AND ts.rep_doc_number <> '' THEN rep_doc.doc_id
        WHEN ts.person_dni IS NOT NULL THEN dni_doc.doc_id
        ELSE NULL
    END AS doc_id
FROM tmp_stage ts
LEFT JOIN company cp ON cp.ruc = ts.company_ruc
LEFT JOIN document rep_doc
    ON rep_doc.doc_type = ts.rep_doc_type AND rep_doc.doc_number = ts.rep_doc_number
LEFT JOIN document dni_doc
    ON dni_doc.doc_type = 'DNI' AND dni_doc.doc_number = ts.person_dni;

CREATE INDEX tmp_resolved_facts_row_idx ON tmp_resolved_facts(source_row_number);
CREATE INDEX tmp_resolved_facts_doc_idx ON tmp_resolved_facts(doc_id);
CREATE INDEX tmp_resolved_facts_company_idx ON tmp_resolved_facts(company_id);

CREATE TEMP TABLE tmp_role_source AS
SELECT DISTINCT
    rf.doc_id,
    rf.company_id,
    rf.rep_doc_type,
    rf.rep_doc_number,
    rf.rep_name,
    rf.role_name,
    rf.role_start_date
FROM tmp_resolved_facts rf
WHERE
    rf.company_id IS NOT NULL
    AND (
        rf.role_name <> ''
        OR rf.rep_doc_number <> ''
        OR rf.rep_name <> ''
    );

INSERT INTO company_role(doc_id, company_id, rep_doc_type, rep_doc_number, rep_name, role_name, role_start_date)
SELECT
    doc_id,
    company_id,
    rep_doc_type,
    rep_doc_number,
    rep_name,
    role_name,
    role_start_date
FROM tmp_role_source
WHERE 1 = 1
ON CONFLICT(company_id, rep_doc_type, rep_doc_number, role_name, role_start_date) DO UPDATE SET
    doc_id = COALESCE(company_role.doc_id, excluded.doc_id),
    rep_name = CASE
        WHEN excluded.rep_name <> '' THEN excluded.rep_name
        ELSE company_role.rep_name
    END
WHERE
    (company_role.doc_id IS NULL AND excluded.doc_id IS NOT NULL)
    OR (excluded.rep_name <> '' AND excluded.rep_name <> company_role.rep_name);
