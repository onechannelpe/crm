declare module "mjml" {
  export interface MJMLError {
    message: string;
  }

  export interface MJMLResult {
    html: string;
    errors: MJMLError[];
  }

  export interface MJMLOptions {
    validationLevel?: "strict" | "soft" | "skip";
    minify?: boolean;
    keepComments?: boolean;
  }

  export default function mjml2html(
    input: string,
    options?: MJMLOptions,
  ): MJMLResult;
}
