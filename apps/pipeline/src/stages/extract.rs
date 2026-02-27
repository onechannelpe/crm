use crate::PipelineError;
use std::fs::File;
use std::io::{BufRead, BufReader, BufWriter, Write};
use std::path::PathBuf;

pub fn sample_with_header(src: PathBuf, out: PathBuf, cap: usize) -> Result<(), PipelineError> {
    let in_file = File::open(&src)?;
    let mut reader = BufReader::new(in_file);
    let out_file = File::create(out)?;
    let mut writer = BufWriter::new(out_file);

    let mut buf = Vec::new();
    let mut line_no = 0usize;
    loop {
        buf.clear();
        let bytes = reader.read_until(b'\n', &mut buf)?;
        if bytes == 0 {
            break;
        }
        if line_no >= cap {
            break;
        }
        let normalized = String::from_utf8_lossy(&buf);
        writer.write_all(normalized.as_bytes())?;
        line_no += 1;
    }
    writer.flush()?;
    Ok(())
}
