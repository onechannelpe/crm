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

pub fn validate_document_number(value: &str) -> Result<(), ApiError> {
    if value.len() < 8 || value.len() > 12 || !is_digits(value) {
        return Err(ApiError::Validation(
            "document number must be 8-12 digits".into(),
        ));
    }
    Ok(())
}

pub fn validate_doc_type(value: &str) -> Result<(), ApiError> {
    let normalized = value.trim().to_ascii_uppercase();
    if normalized.is_empty() || normalized.len() > 24 {
        return Err(ApiError::Validation(
            "document type must be 1-24 characters".into(),
        ));
    }
    if !normalized
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '_' || c == '.')
    {
        return Err(ApiError::Validation(
            "document type must be alphanumeric/underscore/dot".into(),
        ));
    }
    Ok(())
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
    let (doc_type, doc_number) = value.split_once(':').ok_or_else(|| {
        ApiError::Validation("document query must be in DOC_TYPE:DOC_NUMBER format".into())
    })?;
    let doc_type = doc_type.trim().to_ascii_uppercase();
    let doc_number = doc_number.trim().to_owned();
    validate_doc_type(&doc_type)?;
    validate_document_number(&doc_number)?;
    Ok((doc_type, doc_number))
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
