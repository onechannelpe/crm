export function readFileText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener(
      "load",
      () => {
        resolve(typeof reader.result === "string" ? reader.result : "");
      },
      { once: true },
    );
    reader.addEventListener(
      "error",
      () => {
        reject(new Error("Error al leer el archivo"));
      },
      { once: true },
    );
    reader.readAsText(file, "utf-8");
  });
}
