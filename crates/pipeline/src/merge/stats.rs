#[derive(Default, Clone, Copy)]
pub struct MergePhaseStats {
    pub prepare_secs: f64,
    pub core_secs: f64,
    pub phone_secs: f64,
    pub email_secs: f64,
    pub cleanup_secs: f64,
    pub attach_detach_secs: f64,
}
