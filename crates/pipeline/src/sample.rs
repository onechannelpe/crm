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
