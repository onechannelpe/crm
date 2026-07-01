// Parsed JSON value. `null` is a valid JSON value, so it is part of the
// union. Column types that distinguish "no value" from "a JSON value" should
// still use `Json | null`; the lint accepts it because `null` is not a
// redundant constituent of `Json`. The union narrows out things JSON cannot
// carry (Function, BigInt, Symbol) so consumers still have to validate the
// shape they need.
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };
