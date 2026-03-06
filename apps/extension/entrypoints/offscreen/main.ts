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

function stopActiveRecorder(): void {
  if (activeRecording?.recorder.state !== "inactive") {
    activeRecording?.recorder.stop();
  }

  if (activeRecording?.stream) {
    for (const track of activeRecording.stream.getTracks()) {
      track.stop();
    }
  }

  activeRecording = null;
}

async function createMediaStream(streamId: string): Promise<MediaStream> {
  const audioConstraints: TabCaptureAudioConstraints = {
    mandatory: {
      chromeMediaSource: "tab",
      chromeMediaSourceId: streamId,
    },
  };

  return navigator.mediaDevices.getUserMedia({ audio: audioConstraints, video: false });
}

async function startRecorder(message: OffscreenStartMessage): Promise<void> {
  stopActiveRecorder();

  const stream = await createMediaStream(message.streamId);
  const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
    ? "audio/webm;codecs=opus"
    : "audio/webm";

  const recorder = new MediaRecorder(stream, { mimeType });
  const sessionId = message.sessionId;

  activeRecording = {
    sessionId,
    stream,
    recorder,
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

  recorder.onstop = async () => {
    await browser.runtime.sendMessage({
      type: "recording.completed",
      sessionId,
      createdAt: Date.now(),
    });
  };

  recorder.start(4000);
}

browser.runtime.onMessage.addListener((message: unknown) => {
  if (!isOffscreenMessage(message)) return;

  if (message.type === "offscreen.recording.stop") {
    stopActiveRecorder();
    return;
  }

  void startRecorder(message);
});
