use crm_engine::ingest::csv_mmap;
use std::fs;
use std::time::{SystemTime, UNIX_EPOCH};

fn temp_csv_path(name: &str) -> String {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("time")
        .as_nanos();
    std::env::temp_dir()
        .join(format!("{}-{}.csv", name, nonce))
        .to_string_lossy()
        .to_string()
}

#[test]
fn loads_ruc_and_phones_from_current_dataset_shape() {
    let path = temp_csv_path("crm-engine-csv-loader");
    let csv =
        "dni,ruc,phones,operators,source\n12345678,20100047218,999111222;999111333,CLARO,seed\n";
    fs::write(&path, csv).expect("write csv");

    let records = csv_mmap::load(&path).expect("load csv");
    fs::remove_file(&path).expect("remove csv");

    assert_eq!(records.len(), 1);
    let row = &records[0];
    assert_eq!(row.dni.as_ref(), "12345678");
    assert_eq!(row.org_ruc.as_deref(), Some("20100047218"));
    assert_eq!(row.phone_primary.as_deref(), Some("999111222"));
    assert_eq!(row.phone_secondary.as_deref(), Some("999111333"));
    assert!(row.name.is_none());
}
