use proptest::prelude::*;
use shared::hmac::{HmacVerifier, sign};
use std::collections::HashMap;
use std::time::{SystemTime, UNIX_EPOCH};

fn now_secs() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64
}

fn verifier(key_id: &str, secret: &str) -> HmacVerifier {
    HmacVerifier::new(
        HashMap::from([(key_id.to_string(), secret.to_string())]),
        300,
    )
}

proptest! {
    #[test]
    fn rejects_tampered_body(
        key_id  in "[a-z]{4,8}",
        secret  in "[a-zA-Z0-9]{8,32}",
        body    in prop::collection::vec(any::<u8>(), 1..256),
        tampered in prop::collection::vec(any::<u8>(), 1..256),
    ) {
        prop_assume!(body != tampered);
        let ts  = now_secs();
        let sig = sign(&secret, ts as u64, &body).expect("hmac sign");
        let v   = verifier(&key_id, &secret);
        prop_assert!(v.verify(&key_id, &ts.to_string(), &sig, &tampered).is_err());
    }

    #[test]
    fn rejects_unknown_key_id(
        key_id     in "[a-z]{4,8}",
        unknown_id in "[a-z]{4,8}",
        secret     in "[a-zA-Z0-9]{8,32}",
        body       in prop::collection::vec(any::<u8>(), 0..256),
    ) {
        prop_assume!(key_id != unknown_id);
        let ts  = now_secs();
        let sig = sign(&secret, ts as u64, &body).expect("hmac sign");
        let v   = verifier(&key_id, &secret);
        prop_assert!(v.verify(&unknown_id, &ts.to_string(), &sig, &body).is_err());
    }

    #[test]
    fn rejects_timestamp_outside_skew_window(
        key_id     in "[a-z]{4,8}",
        secret     in "[a-zA-Z0-9]{8,32}",
        body       in prop::collection::vec(any::<u8>(), 0..256),
        extra_skew in 1i64..=3600i64,
    ) {
        let stale_ts = now_secs() - 300 - extra_skew;
        let sig = sign(&secret, stale_ts as u64, &body).expect("hmac sign");
        let v   = verifier(&key_id, &secret);
        prop_assert!(v.verify(&key_id, &stale_ts.to_string(), &sig, &body).is_err());
    }
}
