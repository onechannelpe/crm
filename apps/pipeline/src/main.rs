use crm_pipeline::cli;
use crm_pipeline::pipeline;
use std::env;

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    let result = cli::parse_args(&args).and_then(pipeline::run);

    if let Err(err) = result {
        eprintln!("{err}");
        std::process::exit(1);
    }
}
