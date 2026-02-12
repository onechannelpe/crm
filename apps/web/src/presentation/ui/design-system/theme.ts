import { tokens } from "./tokens";

export const theme = {
  ...tokens,
  components: {
    button: {
      height: {
        sm: "2rem",
        md: "2.5rem",
        lg: "3rem",
      },
    },
    input: {
      height: "2.5rem",
    },
  },
} as const;
