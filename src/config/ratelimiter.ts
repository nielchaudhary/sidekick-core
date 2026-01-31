export class Ratelimiter {
  static readonly CAPACITY = 60;
  static readonly REFILL_RATE = 60;

  private tokens = Ratelimiter.CAPACITY;

  lastRefillTime = Date.now();

  allowRequest(): boolean {
    const currentTime = Date.now();

    const elapsed = currentTime - this.lastRefillTime / 1000;

    this.tokens = Math.min(Ratelimiter.CAPACITY, elapsed + this.tokens * Ratelimiter.REFILL_RATE);

    this.lastRefillTime = currentTime;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }
}
