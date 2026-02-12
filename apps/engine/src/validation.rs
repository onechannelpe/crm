use crate::error::RequestError;

pub fn validate_dni(value: &str) -> Result<(), RequestError> {
    if value.len() != 8 || !value.chars().all(|c| c.is_ascii_digit()) {
        return Err(RequestError::Validation(
            "DNI must be exactly 8 digits".into(),
        ));
    }
    Ok(())
}

pub fn validate_ruc(value: &str) -> Result<(), RequestError> {
    if value.len() != 11 || !value.chars().all(|c| c.is_ascii_digit()) {
        return Err(RequestError::Validation(
            "RUC must be exactly 11 digits".into(),
        ));
    }
    Ok(())
}

pub fn validate_phone(value: &str) -> Result<(), RequestError> {
    if value.len() < 7
        || value.len() > 15
        || !value.chars().all(|c| c.is_ascii_digit() || c == '+')
    {
        return Err(RequestError::Validation(
            "phone must be 7-15 digits".into(),
        ));
    }
    Ok(())
}

pub fn validate_name(value: &str) -> Result<(), RequestError> {
    let trimmed = value.trim();
    if trimmed.is_empty() || trimmed.len() > 200 {
        return Err(RequestError::Validation(
            "name must be 1-200 characters".into(),
        ));
    }
    Ok(())
}
