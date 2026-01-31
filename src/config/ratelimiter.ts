export class RateLimiter {
  // Maximum tokens + burst capacity
  static readonly CAPACITY = 60;

  static readonly REFILL_RATE = 60;

  // Current number of available tokens, starts full so first burst up to CAPACITY is allowed immediately
  private tokens = RateLimiter.CAPACITY;

  // Last time we refilled tokens, used to calculate how much time has passed between calls
  private lastRefill = Date.now();

  /**
   * Attempts to consume 1 token.
   * Returns:
   *  - true  = request allowed
   *  - false = rate limit exceeded
   */
  allow(): boolean {
    const now = Date.now();

    // Time passed since last refill (in seconds)
    // Example: 250ms  - 0.25s
    const elapsed = (now - this.lastRefill) / 1000;

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
    this.tokens = Math.min(RateLimiter.CAPACITY, this.tokens + elapsed * RateLimiter.REFILL_RATE);

    // Update refill timestamp for next calculation
    this.lastRefill = now;

    /**
     * If we have at least 1 token:
     *   consume it and allow the request
     *
     * Otherwise:
     *   reject request (rate limit hit)
     */
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }
}
