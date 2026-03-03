use crate::errors::ApiError;
use hmac::{Hmac, Mac};
use sha2::Sha256;
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

type HmacSha256 = Hmac<Sha256>;

#[derive(Debug)]
pub struct HmacVerifier {
    keys: HashMap<String, Vec<u8>>,
    max_skew_secs: i64,
}

impl HmacVerifier {
    pub fn new(keys: HashMap<String, String>, max_skew_secs: i64) -> Self {
        let keys = keys
            .into_iter()
            .map(|(key_id, secret)| (key_id, secret.into_bytes()))
            .collect::<HashMap<_, _>>();
        Self {
            keys,
            max_skew_secs,
        }
    }

    pub fn verify(
        &self,
        key_id: &str,
        timestamp: &str,
        signature_hex: &str,
        body: &[u8],
    ) -> Result<(), ApiError> {
        let secret = self
            .keys
            .get(key_id)
            .ok_or_else(|| ApiError::Unauthorized("unknown key id".into()))?;
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

        let mut mac = HmacSha256::new_from_slice(secret).map_err(|_| ApiError::Internal)?;
        mac.update(&(ts as u64).to_be_bytes());
        mac.update(body);

        let provided = hex::decode(signature_hex)
            .map_err(|_| ApiError::Unauthorized("invalid signature encoding".into()))?;
        mac.verify_slice(&provided)
            .map_err(|_| ApiError::Unauthorized("invalid signature".into()))
    }
}
