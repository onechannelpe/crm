pub fn normalize_email(value: &str) -> Option<String> {
    let at = value.find('@')?;
    if at == 0 {
        return None;
    }
    let local = &value[..at];
    let domain = &value[at + 1..];
    if domain.is_empty() || !domain.contains('.') {
        return None;
    }
    let local_lower = local.to_ascii_lowercase();
    let domain_lower = domain.to_ascii_lowercase();
    if is_placeholder_local(&local_lower) || is_placeholder_domain(&domain_lower) {
        return None;
    }
    Some(format!("{local_lower}@{domain_lower}"))
}

fn is_placeholder_local(local: &str) -> bool {
    // Structural: catches entire classes without enumeration.
    if local.len() < 3 {
        return true; // "a", "g", "bb", "yo", "na", "no", "sn", "sc", etc.
    }
    if local.bytes().all(|b| b.is_ascii_digit()) {
        return true; // "123", "007", etc.
    }
    if local.starts_with("notiene") {
        return true; // "notiene", "notienecorreo", "notiene74", etc.
    }
    // Named: Spanish carrier/registry sentinel values confirmed in source data.
    // Add new entries here when a source introduces a new placeholder pattern.
    matches!(
        local,
        "dummy"
            | "email"
            | "mail"
            | "null"
            | "noemail"
            | "sincorreo"
            | "notengo"
            | "ninguno"
            | "cliente"
            | "direccionerrada"
    )
}

fn is_placeholder_domain(domain: &str) -> bool {
    // Named placeholder domains.
    if matches!(
        domain,
        "dummy.com" | "email.com.pe" | "notiene.com" | "sincorreo.com" | "sincorreo.com.pe"
    ) {
        return true;
    }
    // Typo variants of common domains confirmed in source data.
    // These produce undeliverable addresses that would pollute the search index.
    matches!(
        domain,
        "gamil.com"
            | "gmai.com"
            | "gmial.com"
            | "gmail.co"
            | "gmail.con"
            | "gmil.com"
            | "hotmai.com"
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn email_valid_passes_through_normalized() {
        assert_eq!(
            normalize_email("Juan.Garcia@Gmail.COM"),
            Some("juan.garcia@gmail.com".to_owned())
        );
    }

    #[test]
    fn email_empty_returns_none() {
        assert_eq!(normalize_email(""), None);
        assert_eq!(normalize_email("@gmail.com"), None);
        assert_eq!(normalize_email("juan@"), None);
        assert_eq!(normalize_email("juan@nodot"), None);
    }

    #[test]
    fn short_local_rejected() {
        // Structural rule: local < 3 chars covers na, no, sn, sc, bb, yo, etc.
        assert_eq!(normalize_email("a@gmail.com"), None);
        assert_eq!(normalize_email("bb@gmail.com"), None);
        assert_eq!(normalize_email("yo@gmail.com"), None);
        assert_eq!(normalize_email("no@hotmail.com"), None);
        assert_eq!(normalize_email("sn@claro.com"), None);
        assert_eq!(normalize_email("sc@claro.com.pe"), None);
    }

    #[test]
    fn numeric_local_rejected() {
        assert_eq!(normalize_email("123@gmail.com"), None);
        assert_eq!(normalize_email("007@hotmail.com"), None);
    }

    #[test]
    fn notiene_prefix_rejected() {
        assert_eq!(normalize_email("notiene@gmail.com"), None);
        assert_eq!(normalize_email("notienecorreo@gmail.com"), None);
        assert_eq!(normalize_email("notiene74@gmail.com"), None);
        assert_eq!(normalize_email("NOTIENE@hotmail.com"), None);
    }

    #[test]
    fn named_placeholder_locals_rejected() {
        for local in &[
            "dummy",
            "email",
            "mail",
            "null",
            "noemail",
            "sincorreo",
            "notengo",
            "ninguno",
            "cliente",
            "direccionerrada",
        ] {
            let addr = format!("{local}@gmail.com");
            assert_eq!(normalize_email(&addr), None, "expected None for {addr}");
        }
    }

    #[test]
    fn placeholder_domains_rejected() {
        for domain in &[
            "dummy.com",
            "email.com.pe",
            "notiene.com",
            "sincorreo.com",
            "sincorreo.com.pe",
        ] {
            let addr = format!("user@{domain}");
            assert_eq!(normalize_email(&addr), None, "expected None for {addr}");
        }
    }

    #[test]
    fn typo_domains_rejected() {
        for domain in &[
            "gamil.com",
            "gmai.com",
            "gmial.com",
            "gmail.co",
            "gmail.con",
            "gmil.com",
            "hotmai.com",
        ] {
            let addr = format!("user@{domain}");
            assert_eq!(normalize_email(&addr), None, "expected None for {addr}");
        }
    }
}
