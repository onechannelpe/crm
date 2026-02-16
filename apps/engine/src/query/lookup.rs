use crate::index::store::{IndexHits, SearchIndex};
use crate::types::SearchResult;

const MAX_NAME_RESULTS: usize = 50;

pub fn by_dni(index: &SearchIndex, dni: &str) -> Vec<SearchResult> {
    lookup(index, index.by_dni.get(dni))
}

pub fn by_ruc(index: &SearchIndex, ruc: &str) -> Vec<SearchResult> {
    lookup(index, index.by_ruc.get(ruc))
}

pub fn by_phone(index: &SearchIndex, phone: &str) -> Vec<SearchResult> {
    lookup(index, index.by_phone.get(phone))
}

pub fn by_name(index: &SearchIndex, query: &str, limit: usize) -> Vec<SearchResult> {
    let query_lower = query.to_lowercase();
    let cap = limit.min(MAX_NAME_RESULTS);

    index
        .records
        .iter()
        .filter(|r| {
            r.name.as_ref().is_some_and(|name| {
                // ASCII-only queries are common in this dataset; this branch avoids
                // allocating a lowercased copy for every candidate row.
                if query.is_ascii() && name.is_ascii() {
                    contains_ascii_case_insensitive(name.as_bytes(), query.as_bytes())
                } else {
                    name.to_lowercase().contains(&query_lower)
                }
            })
        })
        .take(cap)
        .map(SearchResult::from)
        .collect()
}

fn lookup(index: &SearchIndex, hits: Option<&IndexHits>) -> Vec<SearchResult> {
    match hits {
        Some(IndexHits::One(i)) => vec![SearchResult::from(&index.records[*i as usize])],
        Some(IndexHits::Many(ids)) => {
            let mut results = Vec::with_capacity(ids.len());
            for &i in ids {
                results.push(SearchResult::from(&index.records[i as usize]));
            }
            results
        }
        None => Vec::new(),
    }
}

fn contains_ascii_case_insensitive(haystack: &[u8], needle: &[u8]) -> bool {
    if needle.is_empty() {
        return true;
    }
    if needle.len() > haystack.len() {
        return false;
    }
    haystack
        .windows(needle.len())
        .any(|window| window.eq_ignore_ascii_case(needle))
}
