import { useCallback, useEffect, useState } from "react";

/**
 * Whether an element is on screen. Returns a callback ref, so it also works for
 * elements that appear later (for example buttons shown after an account check).
 * Starts as true (also on the server), so anything shown only when the element
 * scrolls away never flashes in before the page has loaded, and server and
 * browser render the same first frame.
 */
export function useInView(): [(node: Element | null) => void, boolean] {
  const [node, setNode] = useState<Element | null>(null);
  const [visible, setVisible] = useState(true);
  const ref = useCallback((el: Element | null) => setNode(el), []);
  useEffect(() => {
    if (!node || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(Boolean(entry?.isIntersecting)));
    observer.observe(node);
    return () => observer.disconnect();
  }, [node]);
  return [ref, visible];
}
