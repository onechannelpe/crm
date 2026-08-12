const AVIF_PROBE =
  "data:image/avif;base64,AAAAIGZ0eXBhdmlmAAAAAGF2aWZtaWYxbWlhZk1BMUIAAADybWV0YQAAAAAAAAAoaGRscgAAAAAAAAAAcGljdAAAAAAAAAAAAAAAAGxpYmF2aWYAAAAADnBpdG0AAAAAAAEAAAAeaWxvYwAAAABEAAABAAEAAAABAAABGgAAAB0AAAAoaWluZgAAAAAAAQAAABppbmZlAgAAAAABAABhdjAxQ29sb3IAAAAAamlwcnAAAABLaXBjbwAAABRpc3BlAAAAAAAAAAEAAAABAAAAEHBpeGkAAAAAAwgICAAAAAxhdjFDgQAMAAAAABNjb2xybmNseAACAAIABoAAAAAXaXBtYQAAAAAAAAABAAEEAQKDBAAAAB9tZGF0EgAKCBgABogQEDQgMgkQAAAAB8dSLfI=";
const AVIF_PROBE_SIZE = { height: 1, width: 1 };

const WEBP_PROBE =
  "data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA";
const WEBP_PROBE_SIZE = { height: 2, width: 2 };

export type ImageFormatSupport = {
  avif: boolean;
  webp: boolean;
};

function probeImageDecodes(
  dataUri: string,
  expected: { height: number; width: number },
): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = new Image();

    probe.onload = () => {
      resolve(
        probe.width === expected.width && probe.height === expected.height,
      );
    };
    probe.onerror = () => resolve(false);

    probe.src = dataUri;
  });
}

let cachedSupportPromise: Promise<ImageFormatSupport> | null = null;

export function detectSupportedImageFormats(): Promise<ImageFormatSupport> {
  if (typeof window === "undefined") {
    return Promise.resolve({ avif: false, webp: false });
  }

  // Cache browser detection only; an SSR result must not prevent a later probe.
  if (cachedSupportPromise === null) {
    cachedSupportPromise = Promise.all([
      probeImageDecodes(AVIF_PROBE, AVIF_PROBE_SIZE),
      probeImageDecodes(WEBP_PROBE, WEBP_PROBE_SIZE),
    ]).then(([avif, webp]) => ({ avif, webp }));
  }

  return cachedSupportPromise;
}
