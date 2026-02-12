use crate::error::Error;
use axum::{extract::Request, middleware::Next, response::Response};

#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Role {
    Executive,
    Supervisor,
    Admin,
}

#[derive(Clone, Copy, Debug)]
pub struct UserContext {
    pub user_id: i64,
    pub role: Role,
}

impl UserContext {
    fn from_headers(headers: &axum::http::HeaderMap) -> Result<Self, Error> {
        let user_id = headers
            .get("x-user-id")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| s.parse::<i64>().ok())
            .ok_or(Error::Unauthorized)?;

        let role = headers
            .get("x-user-role")
            .and_then(|v| v.to_str().ok())
            .and_then(|s| match s {
                "executive" => Some(Role::Executive),
                "supervisor" => Some(Role::Supervisor),
                "admin" => Some(Role::Admin),
                _ => None,
            })
            .ok_or(Error::Unauthorized)?;

        Ok(Self { user_id, role })
    }
}

pub async fn extract_user(mut request: Request, next: Next) -> Result<Response, Error> {
    let user_ctx = UserContext::from_headers(request.headers())?;
    request.extensions_mut().insert(user_ctx);
    Ok(next.run(request).await)
}

pub async fn require_supervisor(request: Request, next: Next) -> Result<Response, Error> {
    let user_ctx = request
        .extensions()
        .get::<UserContext>()
        .copied()
        .ok_or(Error::Unauthorized)?;

    if !matches!(user_ctx.role, Role::Supervisor | Role::Admin) {
        return Err(Error::Forbidden);
    }

    Ok(next.run(request).await)
}

pub async fn require_admin(request: Request, next: Next) -> Result<Response, Error> {
    let user_ctx = request
        .extensions()
        .get::<UserContext>()
        .copied()
        .ok_or(Error::Unauthorized)?;

    if user_ctx.role != Role::Admin {
        return Err(Error::Forbidden);
    }

    Ok(next.run(request).await)
}
