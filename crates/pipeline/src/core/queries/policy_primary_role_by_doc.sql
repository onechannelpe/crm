ranked_primary_role_by_doc AS (
    SELECT
        cr.doc_id,
        cr.company_id,
        cr.role_name,
        cr.role_start_date,
        cr.rep_doc_type,
        cr.rep_doc_number,
        cr.rep_name,
        ROW_NUMBER() OVER (
            PARTITION BY cr.doc_id
            ORDER BY
                CASE WHEN NULLIF(cr.role_start_date, '') IS NULL THEN 1 ELSE 0 END,
                cr.role_start_date DESC,
                cr.role_id ASC
        ) AS rank_position
    FROM company_role cr
    WHERE cr.doc_id IS NOT NULL
),
primary_role_by_doc AS (
    SELECT
        doc_id,
        company_id,
        role_name,
        role_start_date,
        rep_doc_type,
        rep_doc_number,
        rep_name
    FROM ranked_primary_role_by_doc
    WHERE rank_position = 1
)
