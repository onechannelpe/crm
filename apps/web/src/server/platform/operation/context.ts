export interface OperationContext {
  readonly operationAt: Date;
}

export interface JobContext extends OperationContext {
  readonly abortSignal: AbortSignal;
  readonly workerId: string;
}

export interface TickContext<
  TTick extends string = string,
> extends OperationContext {
  readonly tick: TTick;
}
