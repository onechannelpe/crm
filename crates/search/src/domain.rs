use crate::contracts::SearchIntent;
use shared::error::ApiError;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum QueryStrategy {
    Document {
        doc_type: String,
        doc_number: String,
    },
    Ruc(String),
    Phone(String),
    PersonName(String),
    CompanyName(String),
    MixedName(String),
}

fn is_digits(value: &str) -> bool {
    value.chars().all(|c| c.is_ascii_digit())
}

pub fn validate_ruc(value: &str) -> Result<(), ApiError> {
    if value.len() != 11 || !is_digits(value) {
        return Err(ApiError::Validation("ruc must be exactly 11 digits".into()));
    }
    Ok(())
}

pub fn validate_phone(value: &str) -> Result<(), ApiError> {
    if value.len() < 7 || value.len() > 15 || !is_digits(value) {
        return Err(ApiError::Validation("phone must be 7-15 digits".into()));
    }
    Ok(())
}

pub fn validate_text(value: &str) -> Result<(), ApiError> {
    let trimmed = value.trim();
    if trimmed.len() < 2 || trimmed.len() > 120 {
        return Err(ApiError::Validation(
            "text query must be 2-120 chars".into(),
        ));
    }
    let has_meaningful_token = trimmed
        .split_whitespace()
        .any(|t| t.chars().filter(|c| c.is_alphanumeric()).count() >= 3);
    if !has_meaningful_token {
        return Err(ApiError::Validation(
            "query must contain at least one term with 3 or more characters".into(),
        ));
    }
    Ok(())
}

fn parse_document_query(value: &str) -> Result<(String, String), ApiError> {
    let (raw_type, raw_number) = value
        .split_once(':')
        .ok_or_else(|| ApiError::Validation("document query must be TYPE:NUMBER".into()))?;
    let doc_type = raw_type.trim().to_ascii_uppercase();
    let doc_number = match doc_type.as_str() {
        "DNI" => collect_valid(raw_number.trim(), u8::is_ascii_digit, 8, 8),
        "CE" => collect_valid(raw_number.trim(), u8::is_ascii_alphanumeric, 4, 11),
        "PTP" => collect_valid(raw_number.trim(), u8::is_ascii_digit, 9, 9),
        "CSR" => collect_valid(raw_number.trim(), u8::is_ascii_digit, 5, 9),
        "CIRE" => collect_valid(raw_number.trim(), u8::is_ascii_alphanumeric, 4, 9),
        _ => None,
    }
    .ok_or_else(|| ApiError::Validation("invalid document type or number".into()))?;
    Ok((doc_type, doc_number))
}

fn collect_valid(value: &str, valid: fn(&u8) -> bool, min: usize, max: usize) -> Option<String> {
    let mut out = String::with_capacity(max.min(value.len()));
    for b in value.bytes() {
        if valid(&b) {
            out.push(b.to_ascii_uppercase() as char);
            if out.len() > max {
                return None;
            }
        }
    }
    (out.len() >= min).then_some(out)
}

pub fn plan_query(intent: SearchIntent, query: &str) -> Result<QueryStrategy, ApiError> {
    let value = query.trim();
    if value.is_empty() {
        return Err(ApiError::Validation("query is required".into()));
    }

    if value.contains(':') {
        let (doc_type, doc_number) = parse_document_query(value)?;
        return Ok(QueryStrategy::Document {
            doc_type,
            doc_number,
        });
    }

    if is_digits(value) {
        if value.len() == 11 {
            return Ok(QueryStrategy::Ruc(value.to_owned()));
        }
        if value.len() == 8 {
            return Ok(QueryStrategy::Document {
                doc_type: "DNI".to_owned(),
                doc_number: value.to_owned(),
            });
        }
        if (7..=15).contains(&value.len()) {
            return Ok(QueryStrategy::Phone(value.to_owned()));
        }
    }

    validate_text(value)?;
    match intent {
        SearchIntent::People => Ok(QueryStrategy::PersonName(value.to_owned())),
        SearchIntent::Companies => Ok(QueryStrategy::CompanyName(value.to_owned())),
        SearchIntent::Mixed => Ok(QueryStrategy::MixedName(value.to_owned())),
    }
}

pub fn search_cost_for_strategy(strategy: &QueryStrategy) -> u32 {
    match strategy {
        QueryStrategy::Document { .. } | QueryStrategy::Ruc(_) | QueryStrategy::Phone(_) => 1,
        QueryStrategy::PersonName(_) | QueryStrategy::CompanyName(_) => 2,
        QueryStrategy::MixedName(_) => 3,
    }
}

pub fn search_cost(intent: SearchIntent, query: &str) -> Result<u32, ApiError> {
    let strategy = plan_query(intent, query)?;
    Ok(search_cost_for_strategy(&strategy))
}
