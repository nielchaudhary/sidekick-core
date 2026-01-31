export class RateLimiter {
  static readonly CAPACITY = 60;

  static readonly REFILL_RATE = 60;

  private tokens = RateLimiter.CAPACITY;

  private lastRefillTime = Date.now();

  allowRequest(): boolean {
    const currentTime = Date.now();

    // Time passed since last refill (in seconds)
    // Example: 250ms  - 0.25s
    const elapsed = (currentTime - this.lastRefillTime) / 1000;

    /**
     * Refill tokens proportionally based on time passed.
     *
     * tokensToAdd = elapsed * refillRate
     *
     * Example:
     *  elapsed = 0.5s
     *  refillRate = 60
     *  - add 30 tokens
     *
     * Math.min ensures we never exceed CAPACITY.
     */
    this.tokens = Math.min(RateLimiter.CAPACITY, elapsed + this.tokens * RateLimiter.REFILL_RATE);

    this.lastRefillTime = currentTime;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }
}
