import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import { FaInstagram } from "react-icons/fa6";
import { SocialLinks } from "@/components/site/SocialLinks";

const FACEBOOK_VIDEOS = [
  "https://www.facebook.com/shawtradersev/videos/2918138991895241",
  "https://www.facebook.com/shawtradersev/videos/1057951156975593",
  "https://www.facebook.com/shawtradersev/videos/949741368169039",
];

const INSTAGRAM_REELS = [
  "https://www.instagram.com/shawtradersev/reel/DdfrL_Ch68K/",
  "https://www.instagram.com/shawtradersev/reel/DdBJfD6B0Np/",
  "https://www.instagram.com/shawtradersev/reel/DcU7wJYhMxD/",
];

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

function processInstagramEmbeds() {
  window.instgrm?.Embeds.process();
}

function InstagramReel({ reel, index }: { reel: string; index: number }) {
  const embedRef = useRef<HTMLQuoteElement>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const frame = embedRef.current?.querySelector("iframe");
      if (!frame || frame.offsetHeight < 100) setUnavailable(true);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, []);

  if (unavailable) {
    return (
      <a
        href={reel}
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-72 w-full flex-col items-center justify-center gap-4 bg-muted/30 p-8 text-center transition-colors hover:bg-muted/60"
        aria-label={`Watch Shaw Traders EV Instagram reel ${index + 1}`}
      >
        <FaInstagram className="size-10 text-primary" aria-hidden="true" />
        <span className="font-display text-lg font-semibold">Watch on Instagram</span>
        <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          Open reel <ExternalLink className="size-4" aria-hidden="true" />
        </span>
      </a>
    );
  }

  return (
    <blockquote
      ref={embedRef}
      className="instagram-media m-0! min-w-0! w-full!"
      data-instgrm-permalink={reel}
      data-instgrm-version="14"
      aria-label={`Shaw Traders EV Instagram reel ${index + 1}`}
    />
  );
}

export function SocialProofSection() {
  useEffect(() => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://www.instagram.com/embed.js"]');
    if (existing) {
      if (window.instgrm) processInstagramEmbeds();
      else existing.addEventListener("load", processInstagramEmbeds, { once: true });
      return () => existing.removeEventListener("load", processInstagramEmbeds);
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://www.instagram.com/embed.js";
    script.addEventListener("load", processInstagramEmbeds, { once: true });
    document.body.appendChild(script);
    return () => script.removeEventListener("load", processInstagramEmbeds);
  }, []);

  return (
    <section className="border-y border-border bg-surface" aria-labelledby="social-proof-title">
      <div className="container-page py-10 lg:py-14">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Follow us</p>
            <h2 id="social-proof-title" className="mt-1 font-display text-2xl font-bold sm:text-3xl">
              As seen on our socials
            </h2>
          </div>
          <SocialLinks />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {FACEBOOK_VIDEOS.map((video, index) => (
            <div key={video} className="aspect-video overflow-hidden rounded-lg border border-border bg-background">
              <iframe
                src={`https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(video)}&show_text=false`}
                title={`Shaw Traders EV Facebook video ${index + 1}`}
                className="size-full border-0"
                scrolling="no"
                allowFullScreen
                loading="lazy"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
              />
            </div>
          ))}

          {INSTAGRAM_REELS.map((reel, index) => (
            <div key={reel} className="flex min-h-[34rem] justify-center overflow-hidden rounded-lg border border-border bg-background p-2">
              <InstagramReel reel={reel} index={index} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}