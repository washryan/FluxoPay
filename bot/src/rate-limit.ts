export class InMemoryRateLimiter {
  private readonly entries = new Map<string, number[]>();
  constructor(private readonly maximum: number, private readonly windowMs: number) {}

  allow(key: string, now = Date.now()) {
    const cutoff = now - this.windowMs;
    const recent = (this.entries.get(key) ?? []).filter((time) => time > cutoff);
    if (recent.length >= this.maximum) { this.entries.set(key, recent); return false; }
    recent.push(now); this.entries.set(key, recent); return true;
  }
}
