// Json excludes values it cannot encode but does not validate a payload shape.
// Use `Json | null` when a column distinguishes SQL NULL from JSON null.
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };
