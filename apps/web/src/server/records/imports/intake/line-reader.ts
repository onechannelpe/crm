export function isLineEmpty(line: string): boolean {
  return line.trim().length === 0;
}

export function assertSupportedLeadCsvLine(line: string): void {
  if (!line.includes('"')) {
    return;
  }
  throw new Error("Quoted CSV fields are not supported for lead imports");
}

export function findFirstNonEmptyLine(csvText: string): string | null {
  let start = 0;

  while (start < csvText.length) {
    const newlineIndex = csvText.indexOf("\n", start);
    const rawLine =
      newlineIndex === -1
        ? csvText.slice(start)
        : csvText.slice(start, newlineIndex);
    const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;

    if (!isLineEmpty(line)) {
      return line;
    }

    if (newlineIndex === -1) {
      break;
    }
    start = newlineIndex + 1;
  }

  return null;
}

export async function consumeCsvLinesFromStream(
  stream: ReadableStream<Uint8Array>,
  onLine: (line: string, rowNumber: number) => boolean | void,
): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffered = "";
  let rowNumber = 0;

  const processBufferedLines = (flushLastLine: boolean): boolean => {
    while (true) {
      const newlineIndex = buffered.indexOf("\n");
      if (newlineIndex < 0) {
        break;
      }

      let line = buffered.slice(0, newlineIndex);
      if (line.endsWith("\r")) {
        line = line.slice(0, -1);
      }

      rowNumber++;
      const shouldContinue = onLine(line, rowNumber);
      buffered = buffered.slice(newlineIndex + 1);
      if (shouldContinue === false) {
        return false;
      }
    }

    if (flushLastLine && buffered.length > 0) {
      let line = buffered;
      if (line.endsWith("\r")) {
        line = line.slice(0, -1);
      }

      rowNumber++;
      const shouldContinue = onLine(line, rowNumber);
      buffered = "";
      if (shouldContinue === false) {
        return false;
      }
    }

    return true;
  };

  try {
    const readSequentially = async (): Promise<void> => {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }

      buffered += decoder.decode(value, { stream: true });
      if (!processBufferedLines(false)) {
        return;
      }

      await readSequentially();
    };

    await readSequentially();

    buffered += decoder.decode();
    processBufferedLines(true);
  } finally {
    reader.releaseLock();
  }
}
