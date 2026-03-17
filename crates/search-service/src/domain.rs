use crate::contracts::SearchType;
use engine_infra::error::ApiError;

pub fn validate_dni(value: &str) -> Result<(), ApiError> {
    if value.len() < 8 || value.len() > 12 || !value.chars().all(|c| c.is_ascii_digit()) {
        return Err(ApiError::Validation("dni must be 8-12 digits".into()));
    }
    Ok(())
}

pub fn validate_ruc(value: &str) -> Result<(), ApiError> {
    if value.len() != 11 || !value.chars().all(|c| c.is_ascii_digit()) {
        return Err(ApiError::Validation("ruc must be exactly 11 digits".into()));
    }
    Ok(())
}

pub fn validate_phone(value: &str) -> Result<(), ApiError> {
    if value.len() < 7 || value.len() > 15 || !value.chars().all(|c| c.is_ascii_digit()) {
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

pub fn search_cost(search_type: SearchType) -> u32 {
    match search_type {
        SearchType::Dni | SearchType::Ruc | SearchType::Phone => 1,
        SearchType::PhoneEnriched => 2,
        SearchType::PersonName | SearchType::CompanyName => 3,
    }
}
