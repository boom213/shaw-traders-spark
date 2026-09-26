import { cn } from "@/lib/utils";

type SparkRingProps = {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
};

const RING_SIZE = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-6",
} as const;

export function SparkRing({ size = "md", label, className }: SparkRingProps) {
  return (
    <span
      className={cn("spark-ring relative inline-grid shrink-0 place-items-center", RING_SIZE[size], className)}
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg className="size-full" viewBox="0 0 24 24" fill="none">
        <circle className="spark-ring-track" cx="12" cy="12" r="9" strokeWidth="2.5" />
        <path className="spark-ring-arc" d="M12 3a9 9 0 0 1 8.56 6.22" strokeWidth="2.5" strokeLinecap="round" />
      </svg>
      <svg className="spark-ring-bolt absolute h-[48%] w-[48%]" viewBox="0 0 12 16" fill="none">
        <path d="M7.15 1 2.5 8h3.4l-1.05 7L9.5 7.25H6.2L7.15 1Z" fill="currentColor" />
      </svg>
    </span>
  );
}

type SparkChargeProps = {
  label?: string;
  className?: string;
  compact?: boolean;
};

const SPARKS = [
  { className: "left-[24%] top-[28%]", delay: "0s" },
  { className: "right-[23%] top-[36%]", delay: "0.55s" },
  { className: "left-[31%] top-[55%]", delay: "1.05s" },
  { className: "right-[28%] top-[63%]", delay: "1.55s" },
] as const;

export function SparkCharge({ label = "Loading…", className, compact = false }: SparkChargeProps) {
  return (
    <div
      className={cn("spark-charge flex flex-col items-center justify-center text-center", compact ? "min-h-40 py-6" : "min-h-64 py-10", className)}
      role="status"
      aria-live="polite"
    >
      <div className={cn("relative", compact ? "h-20 w-28" : "h-28 w-40")} aria-hidden="true">
        {SPARKS.map((spark) => (
          <span
            key={`${spark.className}-${spark.delay}`}
            className={cn("spark-charge-particle absolute size-1 rounded-full bg-primary", spark.className)}
            style={{ animationDelay: spark.delay }}
          />
        ))}
        <div className="spark-charge-battery absolute inset-x-[27%] bottom-[8%] top-[10%] overflow-hidden rounded-md border-2 border-foreground/75 bg-background shadow-[var(--shadow-card)]">
          <div className="spark-charge-fill absolute inset-x-1 bottom-1 rounded-sm bg-primary" />
          <svg className="absolute inset-0 m-auto h-9 w-7 text-primary-foreground" viewBox="0 0 18 28" fill="none">
            <path d="M10.8 1 3.5 14h5.1L7 27l7.5-14.5H9.4L10.8 1Z" fill="currentColor" />
          </svg>
        </div>
        <span className="absolute left-1/2 top-0 h-[8%] w-[18%] -translate-x-1/2 rounded-t-sm bg-foreground/75" />
      </div>
      {label && <p className="mt-3 text-sm font-medium text-muted-foreground">{label}</p>}
    </div>
  );
}