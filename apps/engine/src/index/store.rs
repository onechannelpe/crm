use crate::types::Record;
use hashbrown::HashMap;
use hashbrown::hash_map::Entry;
use std::sync::Arc;

pub enum IndexHits {
    // Most DNI keys map to exactly one row. Keeping the single-hit case inline
    // avoids allocating a Vec per key and materially reduces RSS.
    One(u32),
    Many(Vec<u32>),
}

pub struct SearchIndex {
    pub records: Vec<Record>,
    pub by_dni: HashMap<Arc<str>, IndexHits>,
    pub by_ruc: HashMap<Arc<str>, IndexHits>,
    pub by_phone: HashMap<Arc<str>, IndexHits>,
}

impl SearchIndex {
    pub fn build(records: Vec<Record>) -> Self {
        let total = records.len();
        assert!(
            u32::try_from(total).is_ok(),
            "record count exceeds u32 index range"
        );
        let mut by_dni: HashMap<Arc<str>, IndexHits> = HashMap::with_capacity(total);
        let mut by_ruc: HashMap<Arc<str>, IndexHits> = HashMap::with_capacity(total / 32);
        let mut by_phone: HashMap<Arc<str>, IndexHits> = HashMap::with_capacity(total);

        for (i, record) in records.iter().enumerate() {
            let id = i as u32;
            push_hit(&mut by_dni, record.dni.clone(), id);

            if let Some(ref ruc) = record.org_ruc {
                push_hit(&mut by_ruc, ruc.clone(), id);
            }

            if let Some(ref phone) = record.phone_primary {
                push_hit(&mut by_phone, phone.clone(), id);
            }

            if let Some(ref phone) = record.phone_secondary {
                push_hit(&mut by_phone, phone.clone(), id);
            }
        }

        tracing::info!(
            "indexes: {} dni, {} ruc, {} phones",
            by_dni.len(),
            by_ruc.len(),
            by_phone.len()
        );

        Self {
            records,
            by_dni,
            by_ruc,
            by_phone,
        }
    }

    pub fn record_count(&self) -> usize {
        self.records.len()
    }
}

fn push_hit(index: &mut HashMap<Arc<str>, IndexHits>, key: Arc<str>, id: u32) {
    match index.entry(key) {
        Entry::Vacant(v) => {
            v.insert(IndexHits::One(id));
        }
        Entry::Occupied(mut o) => {
            let slot = o.get_mut();
            match slot {
                IndexHits::One(prev) => {
                    // Transition to heap-backed storage only when we discover
                    // a second hit for the same key.
                    let old = *prev;
                    *slot = IndexHits::Many(vec![old, id]);
                }
                IndexHits::Many(ids) => ids.push(id),
            }
        }
    }
}
