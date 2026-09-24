import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import heroImg from "@/assets/hero-ev.jpg";
import type { HeroSlide } from "@/lib/catalog.functions";
import { cn } from "@/lib/utils";

export const heroImageFor = (slide?: HeroSlide) => slide?.imageUrl || heroImg;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

export function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();
  const list = slides.length > 0 ? slides : [];

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    onSelect();
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  useEffect(() => {
    if (!api || paused || reduced || list.length < 2) return;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      api.scrollNext();
    }, 5000);
    return () => window.clearInterval(id);
  }, [api, paused, reduced, list.length]);

  const hold = useCallback(() => setPaused(true), []);
  const release = useCallback(() => setPaused(false), []);

  if (list.length === 0) return null;

  return (
    <Carousel
      setApi={setApi}
      opts={{ loop: true, align: "start" }}
      className="w-full"
      aria-label="Featured offers"
      aria-roledescription="carousel"
      onMouseEnter={hold}
      onMouseLeave={release}
      onFocusCapture={hold}
      onBlurCapture={release}
    >
      <CarouselContent className="ml-0">
        {list.map((slide, i) => (
          <CarouselItem
            key={slide.id}
            className="pl-0"
            aria-label={`Slide ${i + 1} of ${list.length}`}
            aria-hidden={i !== current}
          >
            <div className="relative aspect-[16/9] max-h-56 w-full overflow-hidden rounded-3xl border border-border bg-surface sm:aspect-[16/7] sm:max-h-none">
              <img
                src={heroImageFor(slide)}
                alt={slide.heading}
                width={1600}
                height={700}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "low"}
                decoding={i === 0 ? "sync" : "async"}
                className="absolute inset-0 size-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/75 to-background/10" />
              <div className="relative flex size-full flex-col justify-center gap-2 p-5 sm:gap-3 sm:p-10 lg:p-14">
                <h2 className="line-clamp-2 max-w-xl font-display text-xl font-bold leading-[1.1] tracking-tight sm:text-4xl lg:text-5xl">
                  {slide.heading}
                </h2>
                {slide.subline && <p className="hidden max-w-md text-sm text-muted-foreground sm:block sm:text-base">{slide.subline}</p>}
                {slide.buttonLabel && slide.buttonHref && (
                  <div className="mt-2">
                    <Button size="lg" asChild tabIndex={i === current ? 0 : -1}>
                      {slide.buttonHref.startsWith("http") ? (
                        <a href={slide.buttonHref} target="_blank" rel="noreferrer">
                          {slide.buttonLabel}
                        </a>
                      ) : (
                        <Link to={slide.buttonHref}>{slide.buttonLabel}</Link>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>

      {list.length > 1 && (
        <>
          <CarouselPrevious className="left-3 hidden size-10 md:flex" aria-label="Previous slide" />
          <CarouselNext className="right-3 hidden size-10 md:flex" aria-label="Next slide" />
          <div className="mt-1 flex justify-center gap-1" role="tablist" aria-label="Choose a slide">
            {list.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={i === current}
                aria-label={`Show slide ${i + 1}: ${slide.heading}`}
                onClick={() => api?.scrollTo(i)}
                className="grid min-h-10 min-w-6 place-items-center px-1"
              >
                <span
                  className={cn(
                    "block h-2.5 rounded-full border border-border transition-all",
                    i === current ? "w-7 bg-primary" : "w-2.5 bg-muted",
                  )}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </Carousel>
  );
}
