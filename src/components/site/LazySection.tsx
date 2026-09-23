import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Mounts its children only once they are about to enter the viewport, so the
 * queries and carousels inside below-the-fold sections do no work during the
 * first paint. A reserved minimum height keeps the page from shifting when the
 * real content appears.
 */
export function LazySection({
  children,
  minHeight = "16rem",
  rootMargin = "500px",
}: {
  children: ReactNode;
  minHeight?: string;
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (shown) return;
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(node);
    return () => io.disconnect();
  }, [shown, rootMargin]);

  return <div ref={ref} style={shown ? undefined : { minHeight }}>{shown ? children : null}</div>;
}
