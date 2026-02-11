//! HTTP request handlers
//! 
//! Handles incoming requests and coordinates with lookup service.
//! Keeps HTTP concerns separate from business logic.

use crate::{
    errors::{ApiError, ApiResult},
    service::PhoneLookupService,
    types::{LookupResponse, ServiceStats},
};
use axum::{
    extract::{Path, State},
    response::Json,
};
use std::sync::Arc;

/// Lookup phone by DNI
pub async fn lookup_dni_handler(
    Path(dni): Path<String>,
    State(service): State<Arc<PhoneLookupService>>,
) -> ApiResult<Json<LookupResponse>> {
    // Basic validation to fail fast
    if dni.trim().is_empty() {
        return Err(ApiError::InvalidQuery("DNI cannot be empty".to_string()));
    }
    
    if dni.len() > 20 {
        return Err(ApiError::InvalidQuery("DNI too long".to_string()));
    }
    
    let response = service.lookup_by_dni(&dni);
    Ok(Json(response))
}

/// Lookup phone by RUC
pub async fn lookup_ruc_handler(
    Path(ruc): Path<String>,
    State(service): State<Arc<PhoneLookupService>>,
) -> ApiResult<Json<LookupResponse>> {
    if ruc.trim().is_empty() {
        return Err(ApiError::InvalidQuery("RUC cannot be empty".to_string()));
    }
    
    if ruc.len() > 20 {
        return Err(ApiError::InvalidQuery("RUC too long".to_string()));
    }
    
    let response = service.lookup_by_ruc(&ruc);
    Ok(Json(response))
}

/// Lookup owner by phone number
pub async fn lookup_phone_handler(
    Path(phone): Path<String>,
    State(service): State<Arc<PhoneLookupService>>,
) -> ApiResult<Json<LookupResponse>> {
    if phone.trim().is_empty() {
        return Err(ApiError::InvalidQuery("Phone cannot be empty".to_string()));
    }
    
    if phone.len() > 15 {
        return Err(ApiError::InvalidQuery("Phone number too long".to_string()));
    }
    
    let response = service.lookup_by_phone(&phone);
    Ok(Json(response))
}

/// Health check endpoint
pub async fn health_handler() -> Json<serde_json::Value> {
    Json(serde_json::json!({
        "status": "healthy",
        "service": "phone_lookup_api",
        "version": "2.0",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

/// Service statistics endpoint
pub async fn stats_handler(
    State(service): State<Arc<PhoneLookupService>>,
) -> Json<ServiceStats> {
    Json(service.stats.clone())
}
