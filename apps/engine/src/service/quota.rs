use chrono::{DateTime, Utc};
use dashmap::DashMap;

pub struct QuotaTracker {
    quotas: DashMap<i64, UserQuota>,
    default_limit: u32,
}

struct UserQuota {
    daily_limit: u32,
    used_today: u32,
    last_reset: DateTime<Utc>,
}

impl QuotaTracker {
    pub fn new(default_limit: u32) -> Self {
        Self {
            quotas: DashMap::new(),
            default_limit,
        }
    }

    pub fn check_and_consume(&self, user_id: i64) -> Result<u32, ()> {
        let mut entry = self
            .quotas
            .entry(user_id)
            .or_insert_with(|| UserQuota::new(self.default_limit));

        entry.reset_if_needed();

        if entry.used_today < entry.daily_limit {
            entry.used_today += 1;
            Ok(entry.daily_limit - entry.used_today)
        } else {
            Err(())
        }
    }

    pub fn get_quota(&self, user_id: i64) -> (u32, u32, u32) {
        let mut entry = self
            .quotas
            .entry(user_id)
            .or_insert_with(|| UserQuota::new(self.default_limit));

        entry.reset_if_needed();

        let limit = entry.daily_limit;
        let used = entry.used_today;
        let remaining = limit.saturating_sub(used);

        (limit, used, remaining)
    }

    pub fn set_limit(&self, user_id: i64, new_limit: u32) {
        self.quotas
            .entry(user_id)
            .and_modify(|q| q.daily_limit = new_limit)
            .or_insert_with(|| UserQuota::new(new_limit));
    }
}

impl UserQuota {
    fn new(limit: u32) -> Self {
        Self {
            daily_limit: limit,
            used_today: 0,
            last_reset: Utc::now(),
        }
    }

    fn reset_if_needed(&mut self) {
        let now = Utc::now();
        let today = now.date_naive();
        let last_reset_date = self.last_reset.date_naive();

        if today != last_reset_date {
            self.used_today = 0;
            self.last_reset = now;
        }
    }
}
