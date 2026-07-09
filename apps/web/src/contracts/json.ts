// The union narrows out things JSON cannot carry (Function, BigInt, Symbol),
// so consumers still have to validate the shape they need. `null` is a valid
// JSON value, so column types that distinguish "no value" from "a JSON value"
// should use `Json | null`.
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };
