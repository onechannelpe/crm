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
