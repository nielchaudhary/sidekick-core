export enum ErrorCategory {
  NETWORK = 'NETWORK',
  DATABASE = 'DATABASE',
  CACHE = 'CACHE',
  VALIDATION = 'VALIDATION',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  CONFIGURATION = 'CONFIGURATION',
  EXTERNAL_SERVICE = 'EXTERNAL_SERVICE',
  INTERNAL = 'INTERNAL',
  UNKNOWN = 'UNKNOWN',
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface ErrorContext {
  timestamp: Date;
  userId?: string;
  requestId?: string;
  operation?: string;
  metadata?: Record<string, unknown>;
}

export interface ErrorDetails {
  message: string;
  name: string;
  code?: string | number | undefined;
  stack?: string | undefined;
  cause?: unknown;
  category: ErrorCategory;
  severity: ErrorSeverity;
  context?: ErrorContext | undefined;
  retryable: boolean;
  httpStatus: number;
}

export interface SidekickPlatformErrorOptions {
  message: string;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  code?: string | number | undefined;
  cause?: unknown;
  retryable?: boolean;
  httpStatus?: number;
  context?: Partial<ErrorContext>;
}

interface ClassificationRule {
  category: ErrorCategory;
  patterns: {
    codes?: string[];
    messagePatterns?: string[];
    namePatterns?: string[];
  };
}

const CLASSIFICATION_RULES: ClassificationRule[] = [
  {
    category: ErrorCategory.NETWORK,
    patterns: {
      codes: ['ECONNREFUSED', 'ETIMEDOUT', 'ENOTFOUND', 'ENETUNREACH'],
      messagePatterns: ['network', 'fetch failed', 'socket hang up', 'connection reset'],
    },
  },
  {
    category: ErrorCategory.DATABASE,
    patterns: {
      messagePatterns: ['mongo', 'database', 'collection', 'query failed', 'duplicate key'],
      namePatterns: ['mongo', 'sequelize', 'prisma'],
    },
  },
  {
    category: ErrorCategory.VALIDATION,
    patterns: {
      messagePatterns: ['invalid', 'required', 'must be', 'expected', 'validation failed'],
      namePatterns: ['validation', 'type', 'schema'],
    },
  },
  {
    category: ErrorCategory.AUTHENTICATION,
    patterns: {
      codes: ['401'],
      messagePatterns: ['unauthorized', 'authentication', 'token expired', 'invalid token', 'jwt'],
    },
  },
  {
    category: ErrorCategory.AUTHORIZATION,
    patterns: {
      codes: ['403'],
      messagePatterns: ['forbidden', 'permission', 'access denied', 'not allowed'],
    },
  },
  {
    category: ErrorCategory.CONFIGURATION,
    patterns: {
      messagePatterns: [
        'config',
        'environment',
        'not defined',
        'missing env',
        'invalid configuration',
      ],
    },
  },
  {
    category: ErrorCategory.EXTERNAL_SERVICE,
    patterns: {
      codes: ['502', '503', '504'],
      messagePatterns: ['upstream', 'service unavailable', 'gateway', 'third party'],
    },
  },
];

const SEVERITY_MAP: Record<ErrorCategory, ErrorSeverity> = {
  [ErrorCategory.DATABASE]: ErrorSeverity.CRITICAL,
  [ErrorCategory.CACHE]: ErrorSeverity.CRITICAL,
  [ErrorCategory.CONFIGURATION]: ErrorSeverity.CRITICAL,
  [ErrorCategory.AUTHENTICATION]: ErrorSeverity.HIGH,
  [ErrorCategory.AUTHORIZATION]: ErrorSeverity.HIGH,
  [ErrorCategory.INTERNAL]: ErrorSeverity.HIGH,
  [ErrorCategory.NETWORK]: ErrorSeverity.MEDIUM,
  [ErrorCategory.EXTERNAL_SERVICE]: ErrorSeverity.MEDIUM,
  [ErrorCategory.VALIDATION]: ErrorSeverity.LOW,
  [ErrorCategory.UNKNOWN]: ErrorSeverity.MEDIUM,
};

const HTTP_STATUS_MAP: Record<ErrorCategory, number> = {
  [ErrorCategory.VALIDATION]: 400,
  [ErrorCategory.AUTHENTICATION]: 401,
  [ErrorCategory.AUTHORIZATION]: 403,
  [ErrorCategory.NETWORK]: 503,
  [ErrorCategory.DATABASE]: 503,
  [ErrorCategory.CACHE]: 503,
  [ErrorCategory.CONFIGURATION]: 500,
  [ErrorCategory.EXTERNAL_SERVICE]: 502,
  [ErrorCategory.INTERNAL]: 500,
  [ErrorCategory.UNKNOWN]: 500,
};

const RETRYABLE_CATEGORIES = new Set([ErrorCategory.NETWORK, ErrorCategory.EXTERNAL_SERVICE]);
const NON_RETRYABLE_CODES = new Set(['ENOTFOUND', '401', '403', '404']);

const matchesPatterns = (value: string, patterns?: string[]): boolean => {
  if (!patterns?.length) {
    return false;
  }
  const lowerValue = value.toLowerCase();
  return patterns.some((pattern) => lowerValue.includes(pattern.toLowerCase()));
};

const categorizeError = (error: unknown): ErrorCategory => {
  if (!(error instanceof Error)) {
    return ErrorCategory.UNKNOWN;
  }

  const message = error.message;
  const name = error.name;
  const code = 'code' in error ? String(error.code) : '';

  for (const rule of CLASSIFICATION_RULES) {
    const { codes, messagePatterns, namePatterns } = rule.patterns;

    if (codes?.some((c) => code.toUpperCase().includes(c.toUpperCase()))) {
      return rule.category;
    }
    if (matchesPatterns(message, messagePatterns)) {
      return rule.category;
    }
    if (matchesPatterns(name, namePatterns)) {
      return rule.category;
    }
  }

  return ErrorCategory.UNKNOWN;
};

const isRetryable = (category: ErrorCategory, code?: string | number): boolean => {
  if (code && NON_RETRYABLE_CODES.has(String(code).toUpperCase())) {
    return false;
  }
  return RETRYABLE_CATEGORIES.has(category);
};

const getHttpStatus = (category: ErrorCategory, code?: string | number): number => {
  if (typeof code === 'number' && code >= 100 && code < 600) {
    return code;
  }
  return HTTP_STATUS_MAP[category];
};

const isProduction = (): boolean => {
  return process.env.NODE_ENV === 'production';
};

export class SidekickPlatformError extends Error {
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly code?: string | number | undefined;
  readonly retryable: boolean;
  readonly httpStatus: number;
  readonly context?: ErrorContext | undefined;
  readonly timestamp: Date;

  constructor(options: SidekickPlatformErrorOptions) {
    super(options.message);

    this.name = 'SidekickPlatformError';
    this.timestamp = new Date();
    this.category = options.category ?? ErrorCategory.INTERNAL;
    this.severity = options.severity ?? SEVERITY_MAP[this.category];
    this.code = options.code;
    this.retryable = options.retryable ?? isRetryable(this.category, this.code);
    this.httpStatus = options.httpStatus ?? getHttpStatus(this.category, this.code);
    this.cause = options.cause;

    if (options.context) {
      this.context = {
        timestamp: this.timestamp,
        ...options.context,
      };
    }

    Error.captureStackTrace?.(this, SidekickPlatformError);
  }

  toDetails(): ErrorDetails {
    return {
      message: this.message,
      name: this.name,
      code: this.code,
      stack: isProduction() ? undefined : this.stack,
      cause: this.cause,
      category: this.category,
      severity: this.severity,
      context: this.context,
      retryable: this.retryable,
      httpStatus: this.httpStatus,
    };
  }

  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      category: this.category,
      severity: this.severity,
      code: this.code,
      httpStatus: this.httpStatus,
      retryable: this.retryable,
      timestamp: this.timestamp.toISOString(),
      ...(this.context && { context: this.context }),
      ...(!isProduction() && { stack: this.stack }),
    };
  }

  static isInstance(error: unknown): error is SidekickPlatformError {
    return error instanceof SidekickPlatformError;
  }

  // Factory methods for common error types
  static network(message: string, options?: Partial<SidekickPlatformErrorOptions>) {
    return new SidekickPlatformError({
      message,
      category: ErrorCategory.NETWORK,
      ...options,
    });
  }

  static database(message: string, options?: Partial<SidekickPlatformErrorOptions>) {
    return new SidekickPlatformError({
      message,
      category: ErrorCategory.DATABASE,
      ...options,
    });
  }

  static validation(message: string, options?: Partial<SidekickPlatformErrorOptions>) {
    return new SidekickPlatformError({
      message,
      category: ErrorCategory.VALIDATION,
      httpStatus: 400,
      ...options,
    });
  }

  static cache(message: string, options?: Partial<SidekickPlatformErrorOptions>) {
    return new SidekickPlatformError({
      message,
      category: ErrorCategory.CACHE,
      ...options,
    });
  }

  static authentication(message: string, options?: Partial<SidekickPlatformErrorOptions>) {
    return new SidekickPlatformError({
      message,
      category: ErrorCategory.AUTHENTICATION,
      httpStatus: 401,
      ...options,
    });
  }

  static authorization(message: string, options?: Partial<SidekickPlatformErrorOptions>) {
    return new SidekickPlatformError({
      message,
      category: ErrorCategory.AUTHORIZATION,
      httpStatus: 403,
      ...options,
    });
  }

  static notFound(message: string, options?: Partial<SidekickPlatformErrorOptions>) {
    return new SidekickPlatformError({
      message,
      category: ErrorCategory.VALIDATION,
      httpStatus: 404,
      code: 'NOT_FOUND',
      ...options,
    });
  }

  static internal(message: string, options?: Partial<SidekickPlatformErrorOptions>) {
    return new SidekickPlatformError({
      message,
      category: ErrorCategory.INTERNAL,
      ...options,
    });
  }

  static configuration(message: string, options?: Partial<SidekickPlatformErrorOptions>) {
    return new SidekickPlatformError({
      message,
      category: ErrorCategory.CONFIGURATION,
      ...options,
    });
  }

  static externalService(message: string, options?: Partial<SidekickPlatformErrorOptions>) {
    return new SidekickPlatformError({
      message,
      category: ErrorCategory.EXTERNAL_SERVICE,
      ...options,
    });
  }
}

export const getErrorDetails = (error: unknown, context?: Partial<ErrorContext>): ErrorDetails => {
  // Already a SidekickPlatformError - just add context if needed
  if (SidekickPlatformError.isInstance(error)) {
    const details = error.toDetails();
    if (context) {
      details.context = { timestamp: new Date(), ...context, ...details.context };
    }
    return details;
  }

  const baseContext: ErrorContext | undefined = context
    ? { timestamp: new Date(), ...context }
    : undefined;

  // Standard Error object
  if (error instanceof Error) {
    const category = categorizeError(error);
    const code: string | number | undefined =
      'code' in error ? (error.code as string | number) : undefined;

    return {
      message: error.message || 'An error occurred',
      name: error.name,
      stack: isProduction() ? undefined : error.stack,
      code,
      cause: error.cause,
      category,
      severity: SEVERITY_MAP[category],
      retryable: isRetryable(category, code),
      httpStatus: getHttpStatus(category, code),
      context: baseContext,
    };
  }

  // String error
  if (typeof error === 'string') {
    return {
      message: error,
      name: 'StringError',
      category: ErrorCategory.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      retryable: false,
      httpStatus: 500,
      context: baseContext,
    };
  }

  // Object-like error
  if (error && typeof error === 'object') {
    const obj = error as Record<string, unknown>;
    const category = categorizeError(error);
    const code: string | number | undefined = obj.code as string | number | undefined;

    return {
      message: String(obj.message ?? 'An error occurred'),
      name: String(obj.name ?? 'UnknownError'),
      stack: isProduction() ? undefined : (obj.stack as string | undefined),
      code,
      cause: obj.cause,
      category,
      severity: SEVERITY_MAP[category],
      retryable: isRetryable(category, code),
      httpStatus: getHttpStatus(category, code),
      context: baseContext,
    };
  }

  // Null or undefined
  if (error == null) {
    return {
      message: error === null ? 'Null error received' : 'Undefined error received',
      name: 'NullishError',
      category: ErrorCategory.INTERNAL,
      severity: ErrorSeverity.HIGH,
      retryable: false,
      httpStatus: 500,
      context: baseContext,
    };
  }

  // Fallback for primitives
  return {
    message: String(error),
    name: 'UnknownError',
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    retryable: false,
    httpStatus: 500,
    context: baseContext,
  };
};

export const wrapSidekickError = (
  error: unknown,
  fallbackMessage = 'An unexpected error occurred'
): SidekickPlatformError => {
  if (SidekickPlatformError.isInstance(error)) {
    return error;
  }

  const details = getErrorDetails(error);

  return new SidekickPlatformError({
    message: details.message || fallbackMessage,
    category: details.category,
    severity: details.severity,
    code: details.code,
    cause: error,
    retryable: details.retryable,
    httpStatus: details.httpStatus,
  });
};
