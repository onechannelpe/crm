use crate::PipelineError;
use std::fs::File;
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::path::PathBuf;

/// Deterministic one-pass uniform sampling over data rows while preserving the
/// header. Uses reservoir sampling to return exactly `cap` rows when available.
pub fn sample_with_header(src: PathBuf, out: PathBuf, cap: usize) -> Result<(), PipelineError> {
    let in_file = File::open(&src)?;
    let mut reader = BufReader::new(in_file);
    let out_file = File::create(out)?;
    let mut writer = BufWriter::new(out_file);

    // Preserve the original header row exactly as written.
    let mut buf = Vec::new();
    if reader.read_until(b'\n', &mut buf)? == 0 {
        writer.flush()?;
        return Ok(());
    }
    writer.write_all(&buf)?;
    if cap == 0 {
        writer.flush()?;
        return Ok(());
    }

    let seed = fnv1a64(src.to_string_lossy().as_bytes()) ^ 0x9E37_79B9_7F4A_7C15;
    let mut rng = DeterministicRng::new(seed);
    let mut data_idx = 0usize;
    let mut reservoir: Vec<(usize, Vec<u8>)> = Vec::with_capacity(cap);

    loop {
        buf.clear();
        if reader.read_until(b'\n', &mut buf)? == 0 {
            break;
        }
        if data_idx < cap {
            reservoir.push((data_idx, buf.clone()));
        } else {
            let pick = rng.next_bounded(data_idx + 1);
            if pick < cap {
                reservoir[pick] = (data_idx, buf.clone());
            }
        }
        data_idx += 1;
    }

    reservoir.sort_by_key(|(idx, _)| *idx);
    for (_, row) in reservoir {
        writer.write_all(&row)?;
    }

    writer.flush()?;
    Ok(())
}

struct DeterministicRng {
    state: u64,
}

impl DeterministicRng {
    fn new(seed: u64) -> Self {
        let state = if seed == 0 {
            0xA5A5_A5A5_A5A5_A5A5
        } else {
            seed
        };
        Self { state }
    }

    fn next_u64(&mut self) -> u64 {
        let mut x = self.state;
        x ^= x << 13;
        x ^= x >> 7;
        x ^= x << 17;
        self.state = x;
        x
    }

    fn next_bounded(&mut self, upper_exclusive: usize) -> usize {
        if upper_exclusive <= 1 {
            return 0;
        }
        (self.next_u64() as usize) % upper_exclusive
    }
}

fn fnv1a64(bytes: &[u8]) -> u64 {
    let mut hash = 0xcbf2_9ce4_8422_2325_u64;
    for byte in bytes {
        hash ^= u64::from(*byte);
        hash = hash.wrapping_mul(0x1000_0000_01b3);
    }
    hash
}

#[cfg(test)]
mod tests {
    use super::sample_with_header;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};
    use std::{env, fs};

    fn unique_temp_path(name: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        env::temp_dir().join(format!("crm-pipeline-{name}-{nonce}.csv"))
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
}
