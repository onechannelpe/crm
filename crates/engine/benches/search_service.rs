use criterion::{Criterion, criterion_group, criterion_main};
use engine::benchmark::read_workload;
use search::contracts::{SearchIntent, SearchRequest};
use search::service::SearchService;
use std::path::PathBuf;

fn bench_search_service(c: &mut Criterion) {
    let db_path = std::env::var("BENCH_CONTACTS_DB")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("/srv/crm/bench/datasets/smoke/contacts.sqlite"));

    if !db_path.exists() {
        eprintln!(
            "skipping search_service benchmarks: db path missing at {}",
            db_path.display()
        );
        return;
    }

    let workload_path = PathBuf::from("crates/engine/benches/workloads/default.json");
    let workload = match read_workload(&workload_path) {
        Ok(w) => w,
        Err(e) => {
            eprintln!("skipping search_service benchmarks: {e}");
            return;
        }
    };

    let pool = match shared::sqlite::make_readonly_pool(
        db_path
            .to_str()
            .unwrap_or("/srv/crm/bench/datasets/smoke/contacts.sqlite"),
    ) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("skipping search_service benchmarks: failed to open db: {e}");
            return;
        }
    };
    let service = SearchService::new(pool, 100);

    let mut group = c.benchmark_group("search_service");
    group.sample_size(100);

    group.bench_function("dni", |b| {
        b.iter(|| {
            for value in &workload.dni {
                let req = SearchRequest {
                    intent: SearchIntent::People,
                    query: value.clone(),
                    limit: 50,
                };
                let _ = service.search(&req);
            }
        });
    });

    group.bench_function("person_name", |b| {
        b.iter(|| {
            for value in &workload.person_name {
                let req = SearchRequest {
                    intent: SearchIntent::People,
                    query: value.clone(),
                    limit: 50,
                };
                let _ = service.search(&req);
            }
        });
    });

    group.finish();
}

criterion_group!(benches, bench_search_service);
criterion_main!(benches);
