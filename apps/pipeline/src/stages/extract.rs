use crate::PipelineError;
use std::fs::File;
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::path::PathBuf;

/// Read every stride-th data row to get `cap` rows uniformly distributed across
/// the file, preserving the header. Falls back to sequential read when the file
/// has fewer data rows than `cap`.
pub fn sample_with_header(src: PathBuf, out: PathBuf, cap: usize) -> Result<(), PipelineError> {
    // Pass 1: count data lines (everything after the header).
    let data_lines = {
        let file = File::open(&src)?;
        let mut reader = BufReader::new(file);
        let mut buf = Vec::new();
        let mut count = 0usize;
        let mut is_header = true;
        loop {
            buf.clear();
            if reader.read_until(b'\n', &mut buf)? == 0 {
                break;
            }
            if is_header {
                is_header = false;
            } else {
                count += 1;
            }
        }
        count
    };

    let stride = if data_lines <= cap { 1 } else { data_lines / cap };

    // Pass 2: write header + every stride-th data row.
    let in_file = File::open(&src)?;
    let mut reader = BufReader::new(in_file);
    let out_file = File::create(out)?;
    let mut writer = BufWriter::new(out_file);

    let mut buf = Vec::new();
    let mut is_header = true;
    let mut data_idx = 0usize;
    let mut taken = 0usize;

    loop {
        buf.clear();
        if reader.read_until(b'\n', &mut buf)? == 0 {
            break;
        }
        if is_header {
            writer.write_all(&buf)?;
            is_header = false;
            continue;
        }
        if taken >= cap {
            break;
        }
        if data_idx % stride == 0 {
            writer.write_all(&buf)?;
            taken += 1;
        }
        data_idx += 1;
    }
    writer.flush()?;
    Ok(())
}
