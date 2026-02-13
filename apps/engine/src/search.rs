use crate::search_index::SearchIndex;
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
        .filter(|r| r.name.to_lowercase().contains(&query_lower))
        .take(cap)
        .map(SearchResult::from)
        .collect()
}

fn lookup(index: &SearchIndex, indices: Option<&Vec<usize>>) -> Vec<SearchResult> {
    indices
        .map(|ids| {
            ids.iter()
                .filter_map(|&i| index.records.get(i))
                .map(SearchResult::from)
                .collect()
        })
        .unwrap_or_default()
}
