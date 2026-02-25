use crm_pipeline::pipeline::runner;
use std::env;

fn main() {
    let args: Vec<String> = env::args().skip(1).collect();
    let result = runner::parse_args(&args).and_then(runner::run);

    if let Err(err) = result {
        eprintln!("{err}");
        std::process::exit(1);
    }
}
