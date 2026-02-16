use crate::error::RequestError;
use crate::index::store::SearchIndex;
use crate::query::lookup;
use crate::types::{HealthResponse, SearchRequest, SearchResponse, SearchType};
use crate::validation;
use axum::response::Json;
use axum::{Extension, Json as AxumJson};
use std::sync::Arc;

pub async fn handle_search(
    Extension(index): Extension<Arc<SearchIndex>>,
    AxumJson(body): AxumJson<SearchRequest>,
) -> Result<Json<SearchResponse>, RequestError> {
    let results = match body.search_type {
        SearchType::Dni => {
            validation::validate_dni(&body.value)?;
            lookup::by_dni(&index, &body.value)
        }
        SearchType::Ruc => {
            validation::validate_ruc(&body.value)?;
            lookup::by_ruc(&index, &body.value)
        }
        SearchType::Phone => {
            validation::validate_phone(&body.value)?;
            lookup::by_phone(&index, &body.value)
        }
        SearchType::Name => {
            validation::validate_name(&body.value)?;
            lookup::by_name(&index, &body.value, body.limit)
        }
    };

    let count = results.len();
    Ok(Json(SearchResponse { results, count }))
}

pub async fn handle_health(Extension(index): Extension<Arc<SearchIndex>>) -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        records: index.record_count(),
    })
}
