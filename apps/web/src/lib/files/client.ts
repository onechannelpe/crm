export function downloadWithToken(token: string): void {
  const link = document.createElement("a");
  link.href = `/api/files/download/${token}`;
  link.download = "";
  link.rel = "external noopener noreferrer";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
