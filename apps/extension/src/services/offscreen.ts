let creatingDocumentPromise: Promise<void> | null = null;

function getOffscreenUrl(): string {
  return chrome.runtime.getURL("offscreen.html");
}

export async function ensureOffscreenDocument(): Promise<void> {
  if (creatingDocumentPromise) {
    return creatingDocumentPromise;
  }

  const creationPromise = chrome.offscreen
    .createDocument({
      url: getOffscreenUrl(),
      reasons: ["USER_MEDIA"],
      justification: "recording call media for resilient upload",
    })
    .catch(async (error: unknown) => {
      if (
        error instanceof Error &&
        error.message.includes("single offscreen")
      ) {
        return;
      }

      throw error;
    })
    .finally(() => {
      creatingDocumentPromise = null;
    });

  creatingDocumentPromise = creationPromise;
  return creationPromise;
}

export async function closeOffscreenDocument(): Promise<void> {
  try {
    await chrome.offscreen.closeDocument();
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message.includes("No current offscreen")
    ) {
      return;
    }

    throw error;
  }
}
