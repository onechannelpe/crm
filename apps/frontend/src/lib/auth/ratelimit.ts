export class TokenBucket {
  private storage = new Map<string, { count: number; refilledAt: number }>();

  constructor(
    public max: number,
    public refillIntervalSeconds: number,
  ) {}

  public consume(key: string, cost: number): boolean {
    const now = Date.now();
    let bucket = this.storage.get(key);

    if (!bucket) {
      bucket = { count: this.max - cost, refilledAt: now };
      this.storage.set(key, bucket);
      return true;
    }

    const refill = Math.floor(
      (now - bucket.refilledAt) / (this.refillIntervalSeconds * 1000),
    );
    bucket.count = Math.min(bucket.count + refill, this.max);
    bucket.refilledAt = now;

    if (bucket.count < cost) return false;

    bucket.count -= cost;
    this.storage.set(key, bucket);
    return true;
  }
}

export const globalBucket = new TokenBucket(100, 1);
