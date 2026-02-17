use crate::errors::ApiError;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug)]
pub struct HmacVerifier {
    secret: Vec<u8>,
    max_skew_secs: i64,
}

impl HmacVerifier {
    pub fn new(secret: String, max_skew_secs: i64) -> Self {
        Self {
            secret: secret.into_bytes(),
            max_skew_secs,
        }
    }

    pub fn verify(
        &self,
        timestamp: &str,
        signature_hex: &str,
        body: &[u8],
    ) -> Result<(), ApiError> {
        let ts = timestamp
            .parse::<i64>()
            .map_err(|_| ApiError::Unauthorized("invalid timestamp".into()))?;
        let now = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_err(|_| ApiError::Internal)?
            .as_secs() as i64;
        if (now - ts).abs() > self.max_skew_secs {
            return Err(ApiError::Unauthorized("timestamp out of range".into()));
        }

        let mut mac = HmacSha256::new_from_slice(&self.secret).map_err(|_| ApiError::Internal)?;
        mac.update(&(ts as u64).to_be_bytes());
        mac.update(body);

        let provided = hex::decode(signature_hex)
            .map_err(|_| ApiError::Unauthorized("invalid signature encoding".into()))?;
        mac.verify_slice(&provided)
            .map_err(|_| ApiError::Unauthorized("invalid signature".into()))
    }
}
