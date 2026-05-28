#[tokio::main]
async fn main() {
    if let Err(e) = engine::runtime::run().await {
        eprintln!("error: {e}");
        std::process::exit(1);
    }
}
