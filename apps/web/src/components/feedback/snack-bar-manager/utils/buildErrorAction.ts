export interface BuildErrorActionParams {
  message: string;
}

export function buildErrorAction(_params: BuildErrorActionParams) {
  throw new Error("Not implemented: buildErrorAction");
}
