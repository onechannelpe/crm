export type ObserveElementVisibilityOptions = IntersectionObserverInit;

export function observeElementVisibility(
  element: Element,
  callback: (isIntersecting: boolean) => void,
  options?: ObserveElementVisibilityOptions,
): () => void {
  if (typeof IntersectionObserver !== "function") {
    callback(true);
    return () => {};
  }

  const observer = new IntersectionObserver((entries) => {
    callback(entries.some((entry) => entry.isIntersecting));
  }, options);

  observer.observe(element);

  return () => {
    observer.disconnect();
  };
}
