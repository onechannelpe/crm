mod common;
mod enriched;
mod exact;
mod text;

pub use enriched::search_phone_enriched;
pub use exact::{search_dni, search_phone, search_ruc};
pub use text::{search_company_name, search_person_name};
