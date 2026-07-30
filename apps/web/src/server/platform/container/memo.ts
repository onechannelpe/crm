export function memo<T>(build: () => T): () => T {
  let cached: { value: T } | undefined;
  return () => {
    cached ??= { value: build() };
    return cached.value;
  };
}
