use crm_engine::index::store::SearchIndex;
use crm_engine::ingest::csv_mmap;
use crm_engine::query::lookup;
use std::time::Instant;

fn bench<F: FnMut(usize) -> usize>(label: &str, iterations: usize, mut f: F) {
    let start = Instant::now();
    let mut checksum = 0usize;
    for i in 0..iterations {
        checksum = checksum.wrapping_add(f(i));
    }
    let elapsed = start.elapsed().as_secs_f64();
    let qps = iterations as f64 / elapsed;
    println!("{label}: iter={iterations} elapsed={elapsed:.3}s qps={qps:.0} checksum={checksum}");
}

#[test]
#[ignore]
fn lookup_probe_real_data() {
    let data_path =
        std::env::var("ENGINE_DATA_PATH").unwrap_or_else(|_| "data/contacts.csv".into());
    let records = csv_mmap::load(&data_path).expect("load real dataset");
    let index = SearchIndex::build(records);

    let mut dnis: Vec<String> = index
        .by_dni
        .keys()
        .take(512)
        .map(ToString::to_string)
        .collect();
    dnis.sort_unstable();
    let mut rucs: Vec<String> = index
        .by_ruc
        .keys()
        .take(512)
        .map(ToString::to_string)
        .collect();
    rucs.sort_unstable();
    let mut phones: Vec<String> = index
        .by_phone
        .keys()
        .take(512)
        .map(ToString::to_string)
        .collect();
    phones.sort_unstable();
    let mut names: Vec<String> = index
        .records
        .iter()
        .filter_map(|r| r.name.as_deref())
        .filter_map(|name| name.split_whitespace().next())
        .take(64)
        .map(ToString::to_string)
        .collect();
    names.sort_unstable();

    bench("dni", 200_000, |i| {
        lookup::by_dni(&index, &dnis[i % dnis.len()]).len()
    });
    bench("ruc", 200_000, |i| {
        lookup::by_ruc(&index, &rucs[i % rucs.len()]).len()
    });
    bench("phone", 200_000, |i| {
        lookup::by_phone(&index, &phones[i % phones.len()]).len()
    });
    if names.is_empty() {
        println!("name: skipped (dataset has no name tokens)");
    } else {
        bench("name", 20, |i| {
            lookup::by_name(&index, &names[i % names.len()], 20).len()
        });
    }
}
