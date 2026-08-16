use pipeline::sample::sample_with_header;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use std::{env, fs};

fn unique_temp_path(name: &str) -> PathBuf {
    let nonce = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    env::temp_dir().join(format!("pipeline-{name}-{nonce}.csv"))
}

fn write_csv(path: &PathBuf, rows: usize) {
    let mut content = String::from("h1,h2\n");
    for i in 0..rows {
        content.push_str(&format!("{i},v{i}\n"));
    }
    fs::write(path, content).expect("write fixture csv");
}

#[test]
fn cap_zero_keeps_header_only() {
    let src = unique_temp_path("src-cap-zero");
    let out = unique_temp_path("out-cap-zero");
    write_csv(&src, 20);

    sample_with_header(src.clone(), out.clone(), 0).expect("sample");
    let output = fs::read_to_string(&out).expect("read output");
    assert_eq!(output.lines().count(), 1);

    let _ = fs::remove_file(src);
    let _ = fs::remove_file(out);
}

#[test]
fn cap_above_data_keeps_all_rows() {
    let src = unique_temp_path("src-cap-above");
    let out = unique_temp_path("out-cap-above");
    write_csv(&src, 12);

    sample_with_header(src.clone(), out.clone(), 50).expect("sample");
    let output = fs::read_to_string(&out).expect("read output");
    assert_eq!(output.lines().count(), 13);

    let _ = fs::remove_file(src);
    let _ = fs::remove_file(out);
}

#[test]
fn deterministic_uniform_sample_is_stable_and_exact() {
    let src = unique_temp_path("src-stable");
    let out_a = unique_temp_path("out-stable-a");
    let out_b = unique_temp_path("out-stable-b");
    write_csv(&src, 500);

    sample_with_header(src.clone(), out_a.clone(), 25).expect("sample A");
    sample_with_header(src.clone(), out_b.clone(), 25).expect("sample B");
    let output_a = fs::read_to_string(&out_a).expect("read A");
    let output_b = fs::read_to_string(&out_b).expect("read B");

    assert_eq!(output_a, output_b);
    assert_eq!(output_a.lines().count(), 26);

    let _ = fs::remove_file(src);
    let _ = fs::remove_file(out_a);
    let _ = fs::remove_file(out_b);
}
