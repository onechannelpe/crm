use crate::PipelineError;
use std::fs;
use std::path::Path;

pub fn promote_db(from: &str, to: &str) -> Result<(), PipelineError> {
    if !Path::new(from).exists() {
        return Err(PipelineError::Args(format!(
            "source db does not exist: {from}"
        )));
    }
    let tmp = format!("{to}.tmp");
    fs::copy(from, &tmp)?;
    fs::rename(&tmp, to)?;
    println!("promoted db to {to}");
    Ok(())
}
