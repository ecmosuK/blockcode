/**
 * Error handling interfaces for BlockCode Desktop application
 * Following TDD methodology - tests written first
 */

// Error boundary result type
export interface ErrorBoundaryResult {
  success: boolean;
  error?: Error | null;
  message: string;
  recoverable: boolean;
}

// Uncaught exception handler configuration
export interface UncaughtExceptionHandlerConfig {
  maxRetries?: number;
  retryDelay?: number;
  shouldHandle?: (error: Error) => boolean;
  onError?: (error: Error) => void;
  onRecovery?: () => void;
}

// Graceful shutdown configuration
export interface GracefulShutdownConfig {
  timeout?: number;
  cleanup?: () => Promise<void> | void;
  exitCode?: number;
}

// Error context for tracking where error occurred
export interface ErrorContext {
  component: string;
  function?: string;
  line?: number;
  column?: number;
  url?: string;
  input?: unknown;
}

// Specific error types that can occur in the application
export class BlockCodeError extends Error {
  readonly context: ErrorContext;
  readonly retryable: boolean;

  constructor(message: string, context: ErrorContext, options?: { retryable?: boolean }) {
    super(message);
    this.name = 'BlockCodeError';
    this.context = context;
    this.retryable = options?.retryable ?? false;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Syntax error specifically for malformed code
export class SyntaxErrorExtension extends BlockCodeError {
  readonly expected?: string;
  readonly found?: string;
  readonly position?: number;

  constructor(message: string, expected?: string, found?: string, position?: number, context?: ErrorContext) {
    super(message, context || { component: 'parser' });
    this.expected = expected;
    this.found = found;
    this.position = position;
  }
}

// Validation error for invalid inputs
export class ValidationError extends BlockCodeError {
  readonly invalidArgs: unknown;

  constructor(message: string, invalidArgs: unknown, context: ErrorContext) {
    super(message, context);
    this.invalidArgs = invalidArgs;
  }
}

// Error handling result for API endpoints
export interface ErrorResponse {
  success: false;
  error: string;
  code: string;
  timestamp: number;
}

// Successful operation result
export interface SuccessResponse<T> {
  success: true;
  data: T;
  timestamp: number;
}

// Union type for error/success responses
export type ResultResponse<T> = ErrorResponse | SuccessResponse<T>;

// Error severities for prioritization
export enum ErrorSeverity {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Critical = 'critical',
}

// Map severity to display message
export const ErrorSeverityMessages: Record<ErrorSeverity, string> = {
  [ErrorSeverity.Low]: 'Low priority - can be deferred',
  [ErrorSeverity.Medium]: 'Medium priority - address in next cycle',
  [ErrorSeverity.High]: 'High priority - requires immediate attention',
  [ErrorSeverity.Critical]: 'Critical - may cause application instability',
};