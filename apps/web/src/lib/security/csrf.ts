import { CSRF_CONFIG } from "./csrf-config";

export async function verifyCsrf(
  request: Request,
  expectedToken: string,
): Promise<boolean> {
  if (!expectedToken) return false;

  const headerToken = request.headers.get(CSRF_CONFIG.HEADER_NAME);
  if (headerToken === expectedToken) return true;

  const contentType = request.headers.get("content-type");
  const isForm =
    contentType?.includes("application/x-www-form-urlencoded") ||
    contentType?.includes("multipart/form-data");

  if (!isForm) {
    return false;
  }

  try {
    const formData = await request.clone().formData();
    const formToken = formData.get(CSRF_CONFIG.FORM_FIELD);
    return formToken === expectedToken;
  } catch {
    return false;
  }
}
