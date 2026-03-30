interface OffscreenStartMessage {
  type: "offscreen.recording.start";
  sessionId: string;
  streamId: string;
}

interface OffscreenStopMessage {
  type: "offscreen.recording.stop";
}

type OffscreenMessage = OffscreenStartMessage | OffscreenStopMessage;

interface ActiveRecording {
  sessionId: string;
  stream: MediaStream;
  recorder: MediaRecorder;
  finished: Promise<void>;
}

type TabCaptureAudioConstraints = MediaTrackConstraints & {
  mandatory: {
    chromeMediaSource: "tab";
    chromeMediaSourceId: string;
  };
};

let activeRecording: ActiveRecording | null = null;
let lastChunkAt = 0;

function isOffscreenMessage(value: unknown): value is OffscreenMessage {
  if (typeof value !== "object" || value === null) return false;
  const maybeMessage = value as Record<string, unknown>;

  if (maybeMessage.type === "offscreen.recording.stop") return true;

  if (maybeMessage.type !== "offscreen.recording.start") return false;
  return (
    typeof maybeMessage.sessionId === "string" &&
    typeof maybeMessage.streamId === "string"
  );
}

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function cleanupRecording(recording: ActiveRecording): void {
  for (const track of recording.stream.getTracks()) {
    track.stop();
  }
}

async function stopActiveRecorder(): Promise<void> {
  const recording = activeRecording;
  if (!recording) return;

  if (recording.recorder.state !== "inactive") {
    recording.recorder.stop();
  }

  await recording.finished;
}

async function createMediaStream(streamId: string): Promise<MediaStream> {
  const audioConstraints: TabCaptureAudioConstraints = {
    mandatory: {
      chromeMediaSource: "tab",
      chromeMediaSourceId: streamId,
    },
  };

  return navigator.mediaDevices.getUserMedia({
    audio: audioConstraints,
    video: false,
  });
}

async function startRecorder(message: OffscreenStartMessage): Promise<void> {
  await stopActiveRecorder();

  const stream = await createMediaStream(message.streamId);
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";

  const recorder = new MediaRecorder(stream, { mimeType });
  const sessionId = message.sessionId;
  let resolveFinished: () => void = () => undefined;
  let rejectFinished: (reason?: unknown) => void = () => undefined;
  const finished = new Promise<void>((resolve, reject) => {
    resolveFinished = resolve;
    rejectFinished = reject;
  });

  activeRecording = {
    sessionId,
    stream,
    recorder,
    finished,
  };
  lastChunkAt = Date.now();

  recorder.ondataavailable = async (event) => {
    if (event.data.size <= 0) return;

    const now = Date.now();
    const durationMs = Math.max(0, now - lastChunkAt);
    lastChunkAt = now;

    const data = new Uint8Array(await event.data.arrayBuffer());
    const dataBase64 = toBase64(data);

    await browser.runtime.sendMessage({
      type: "recording.chunk",
      sessionId,
      chunkId: crypto.randomUUID(),
      mimeType: event.data.type,
      dataBase64,
      durationMs,
      createdAt: now,
    });
  };

  recorder.onerror = () => {
    const current = activeRecording;
    if (current) {
      cleanupRecording(current);
    }
    activeRecording = null;
    rejectFinished?.(new Error("media recorder failed"));
  };

  recorder.onstop = async () => {
    try {
      await browser.runtime.sendMessage({
        type: "recording.completed",
        sessionId,
        createdAt: Date.now(),
      });
    } finally {
      const current = activeRecording;
      if (current) {
        cleanupRecording(current);
      }
      activeRecording = null;
      resolveFinished();
    }
  };

  try {
    recorder.start(4000);
  } catch (error: unknown) {
    const current = activeRecording;
    if (current) {
      cleanupRecording(current);
    }
    activeRecording = null;
    rejectFinished(error);
    throw error;
  }
}

browser.runtime.onMessage.addListener((message: unknown) => {
  if (!isOffscreenMessage(message)) return;

  if (message.type === "offscreen.recording.stop") {
    return stopActiveRecorder().then(
      () => ({ ok: true }) as const,
      (error: unknown) => ({
        ok: false,
        error:
          error instanceof Error ? error.message : "failed to stop recorder",
      }),
    );
  }

  return startRecorder(message).then(
    () => ({ ok: true }) as const,
    (error: unknown) => ({
      ok: false,
      error:
        error instanceof Error ? error.message : "failed to start recorder",
    }),
  );
});
