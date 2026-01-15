# Sidekick Platform Error Handling Module

Structured error handling with automatic categorization, severity classification, and HTTP status mapping.

---

## Types

### ErrorContext

| Property   | Type                      | Description                                        |
| ---------- | ------------------------- | -------------------------------------------------- |
| timestamp  | `Date`                    | When the error occurred                            |
| userId?    | `string`                  | User who triggered the error                       |
| requestId? | `string`                  | Request trace ID for correlation                   |
| operation? | `string`                  | Operation name (e.g., `createUser`, `fetchOrders`) |
| metadata?  | `Record<string, unknown>` | Additional contextual data                         |

### ErrorDetails

| Property   | Type             | Description                              |
| ---------- | ---------------- | ---------------------------------------- |
| message    | `string`         | Human-readable error message             |
| name       | `string`         | Error class name                         |
| code?      | `string\|number` | Error code (e.g., `ECONNREFUSED`, `401`) |
| stack?     | `string`         | Stack trace (development only)           |
| cause?     | `unknown`        | Original error that caused this one      |
| category   | `ErrorCategory`  | Auto-classified category                 |
| severity   | `ErrorSeverity`  | Severity level for alerting              |
| context?   | `ErrorContext`   | Contextual information                   |
| retryable  | `boolean`        | Whether the operation can be retried     |
| httpStatus | `number`         | Suggested HTTP response status           |

### SidekickPlatformErrorOptions

| Property    | Type                    | Description                                         |
| ----------- | ----------------------- | --------------------------------------------------- |
| message     | `string`                | Error message **(required)**                        |
| category?   | `ErrorCategory`         | Override auto-categorization (default: `INTERNAL`)  |
| severity?   | `ErrorSeverity`         | Override auto-severity (defaults based on category) |
| code?       | `string\|number`        | Custom error code                                   |
| cause?      | `unknown`               | Original error                                      |
| retryable?  | `boolean`               | Override retry behavior                             |
| httpStatus? | `number`                | Override HTTP status                                |
| context?    | `Partial<ErrorContext>` | Additional context                                  |

---

## Enums

### ErrorCategory

Classification categories for routing, logging, and response handling.

| Category           | Use Case                                     | HTTP Status |
| ------------------ | -------------------------------------------- | ----------- |
| `NETWORK`          | Connection failures, timeouts, DNS issues    | 503         |
| `DATABASE`         | MongoDB/SQL failures, query errors           | 503         |
| `VALIDATION`       | Invalid input, schema violations             | 400         |
| `AUTHENTICATION`   | Invalid/expired tokens, login failures       | 401         |
| `AUTHORIZATION`    | Insufficient permissions                     | 403         |
| `CONFIGURATION`    | Missing env vars, invalid config             | 500         |
| `EXTERNAL_SERVICE` | Third-party API failures (Stripe, AWS, etc.) | 502         |
| `INTERNAL`         | Application bugs, unexpected states          | 500         |
| `UNKNOWN`          | Unclassified errors                          | 500         |

### ErrorSeverity

Severity levels for alerting and prioritization.

| Severity   | When to Use                       | Action Required      |
| ---------- | --------------------------------- | -------------------- |
| `LOW`      | Validation errors, user mistakes  | Log only             |
| `MEDIUM`   | Network issues, external failures | Monitor, maybe alert |
| `HIGH`     | Auth failures, internal errors    | Alert team           |
| `CRITICAL` | Database down, config missing     | Immediate escalation |

---

## Class: SidekickPlatformError

Custom error class with built-in categorization and metadata.

### When to Use

- Throwing known/expected errors in your application code
- Wrapping errors at service boundaries
- When you need structured error information

### When NOT to Use

- For simple validation → use `SidekickPlatformError.validation()` instead
- When handling unknown errors → use `getErrorDetails()` or `wrapError()`

### Constructor

```typescript
new SidekickPlatformError(options: SidekickPlatformErrorOptions)
```

```typescript
// Direct instantiation (rare)
throw new SidekickPlatformError({
  message: 'Payment failed',
  category: ErrorCategory.EXTERNAL_SERVICE,
  code: 'STRIPE_DECLINED',
  context: { userId: '123', orderId: '456' },
});
```

---

## Factory Methods

Preferred way to create errors. Each method sets the appropriate category and HTTP status.

### `.validation(message, options?)`

Invalid input, schema violations, type errors. **Returns 400.**

```typescript
if (!email) throw SidekickPlatformError.validation('Email is required');
if (!isValidEmail(email)) throw SidekickPlatformError.validation('Invalid email format');
```

### `.authentication(message, options?)`

Invalid/expired tokens, failed logins. **Returns 401.**

```typescript
throw SidekickPlatformError.authentication('Token expired');
throw SidekickPlatformError.authentication('Invalid credentials');
```

### `.authorization(message, options?)`

Permission/access denied errors. **Returns 403.**

```typescript
if (!user.isAdmin) throw SidekickPlatformError.authorization('Admin access required');
```

### `.notFound(message, options?)`

Resource doesn't exist. **Returns 404.**

```typescript
const user = await User.findById(id);
if (!user) throw SidekickPlatformError.notFound('User not found');
```

### `.internal(message, options?)`

Unexpected application errors/bugs. **Returns 500.**

```typescript
throw SidekickPlatformError.internal('Unexpected state in order processor');
```

### `.configuration(message, options?)`

Missing env vars or invalid config. **Returns 500.**

```typescript
if (!process.env.API_KEY) throw SidekickPlatformError.configuration('API_KEY not configured');
```

### `.network(message, options?)`

Connection failures, timeouts, DNS issues. **Returns 503.**

```typescript
throw SidekickPlatformError.network('Failed to reach payment gateway');
```

### `.database(message, options?)`

MongoDB, SQL, or data store failures. **Returns 503.**

```typescript
throw SidekickPlatformError.database('Failed to save user record');
```

### `.externalService(message, options?)`

Third-party API failures. **Returns 502.**

```typescript
throw SidekickPlatformError.externalService('Stripe API unavailable', { cause: stripeError });
```

---

## Instance Methods

### `.toDetails()`

Converts error to a plain object for logging/serialization.

```typescript
const error = SidekickPlatformError.validation('Invalid input');
logger.error(error.toDetails());
```

### `.toJSON()`

JSON-safe representation (excludes stack in production).

```typescript
res.status(error.httpStatus).json(error.toJSON());
```

---

## Static Methods

### `.isInstance(error)`

Type guard to check if error is a `SidekickPlatformError`.

```typescript
if (SidekickPlatformError.isInstance(error)) {
  console.log(error.category); // TypeScript knows it's SidekickPlatformError
}
```

---

## Function: getErrorDetails

```typescript
getErrorDetails(error: unknown, context?: Partial<ErrorContext>): ErrorDetails
```

Extracts structured details from **any** error type. Auto-categorizes based on error message, name, and code patterns.

### When to Use

- In catch blocks to normalize unknown errors
- In error middleware to extract details for logging/response
- When you receive errors from external libraries

### When NOT to Use

- When throwing your own errors → use `SidekickPlatformError` instead

### Examples

```typescript
// In a catch block
try {
  await riskyOperation();
} catch (error) {
  const details = getErrorDetails(error, { operation: 'riskyOperation', userId });
  logger.error(details);
  res.status(details.httpStatus).json({ error: details.message });
}
```

```typescript
// In Express error middleware
app.use((err, req, res, next) => {
  const details = getErrorDetails(err, { requestId: req.id });
  res.status(details.httpStatus).json({ error: details.message });
});
```

---

## Function: wrapError

```typescript
wrapError(error: unknown, fallbackMessage?: string): SidekickPlatformError
```

Converts **any** error into a `SidekickPlatformError`. If already a `SidekickPlatformError`, returns it unchanged.

### When to Use

- At service boundaries to normalize errors
- When re-throwing errors with additional context
- When you need a consistent error type downstream

### When NOT to Use

- When you just need to log/inspect an error → use `getErrorDetails`
- When throwing new errors → use `SidekickPlatformError` factory methods

### Examples

```typescript
// Wrapping external library errors
try {
  await stripe.charges.create(params);
} catch (error) {
  throw wrapError(error, 'Payment processing failed');
}
```

```typescript
// In a service layer
const processOrder = async (orderId: string) => {
  try {
    return await orderRepository.process(orderId);
  } catch (error) {
    throw wrapError(error); // Now guaranteed to be SidekickPlatformError
  }
};
```

---

## Quick Reference

| Scenario                             | Use                                       |
| ------------------------------------ | ----------------------------------------- |
| Throwing validation error            | `SidekickPlatformError.validation()`      |
| Throwing auth error                  | `SidekickPlatformError.authentication()`  |
| Throwing permission error            | `SidekickPlatformError.authorization()`   |
| Resource not found                   | `SidekickPlatformError.notFound()`        |
| Config/env missing                   | `SidekickPlatformError.configuration()`   |
| External API failed                  | `SidekickPlatformError.externalService()` |
| Catching unknown error for logging   | `getErrorDetails(error)`                  |
| Catching & re-throwing unknown error | `wrapError(error)`                        |
| Checking error type                  | `SidekickPlatformError.isInstance()`      |
| Sending error in HTTP response       | `error.toJSON()` or `getErrorDetails()`   |
