ranked_primary_role_by_company AS (
    SELECT
        cr.company_id,
        cr.rep_doc_type,
        cr.rep_doc_number,
        cr.rep_name,
        cr.role_name,
        cr.role_start_date,
        ROW_NUMBER() OVER (
            PARTITION BY cr.company_id
            ORDER BY
                CASE WHEN NULLIF(cr.role_start_date, '') IS NULL THEN 1 ELSE 0 END,
                cr.role_start_date DESC,
                cr.role_id ASC
        ) AS rank_position
    FROM company_role cr
),
primary_role_by_company AS (
    SELECT
        company_id,
        rep_doc_type,
        rep_doc_number,
        rep_name,
        role_name,
        role_start_date
    FROM ranked_primary_role_by_company
    WHERE rank_position = 1
)
