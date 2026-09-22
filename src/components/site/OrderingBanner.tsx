import { useSiteOrdering } from "@/hooks/useOrderingMode";

/** The owner's own wording, shown while the site is catalogue-only or enquiry-only. */
export function OrderingBanner() {
  const { mode, banner } = useSiteOrdering();
  if (mode === "full") return null;
  const text =
    banner?.trim() ||
    (mode === "browse"
      ? "Online ordering is paused. Browse the catalogue and call or WhatsApp us for prices and availability."
      : "Online ordering is paused. Tap \u201cCheck availability\u201d on any part and we will get straight back to you.");
  return (
    <div className="bg-primary/10 px-4 py-2 text-center text-sm font-medium text-foreground">{text}</div>
  );
}
