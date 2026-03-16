export interface DomainLogger {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export const noopDomainLogger: DomainLogger = {
  info() {},
  error() {},
};
