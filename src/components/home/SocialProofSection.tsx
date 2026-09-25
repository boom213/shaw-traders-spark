import { useEffect } from "react";
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
              <blockquote
                className="instagram-media m-0! min-w-0! w-full!"
                data-instgrm-permalink={reel}
                data-instgrm-version="14"
                aria-label={`Shaw Traders EV Instagram reel ${index + 1}`}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}