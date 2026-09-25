import { ExternalLink, Play } from "lucide-react";
import { FaFacebookF, FaInstagram } from "react-icons/fa6";
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

export function SocialProofSection() {
  return (
    <section className="border-y border-border bg-surface" aria-labelledby="social-proof-title">
      <div className="container-page py-6 lg:py-8">
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <div className="min-w-0">
            <p className="eyebrow">Follow us</p>
            <h2 id="social-proof-title" className="mt-1 truncate font-display text-xl font-bold sm:text-2xl">
              As seen on our socials
            </h2>
          </div>
          <div className="shrink-0"><SocialLinks /></div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {FACEBOOK_VIDEOS.map((video, index) => (
            <a
              key={video}
              href={video}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5 transition-colors hover:bg-muted/60"
              aria-label={`Watch Shaw Traders EV Facebook video ${index + 1}`}
            >
              <span className="relative flex size-7 shrink-0 items-center justify-center rounded-full border border-border">
                <FaFacebookF className="size-3.5 text-primary" aria-hidden="true" />
                <Play className="absolute -bottom-0.5 -right-0.5 size-2.5 fill-current text-foreground" aria-hidden="true" />
              </span>
              <span className="min-w-0 truncate text-xs font-semibold">Facebook {index + 1}</span>
              <span className="ml-auto shrink-0 text-muted-foreground">
                <ExternalLink className="size-3" aria-hidden="true" />
              </span>
            </a>
          ))}

          {INSTAGRAM_REELS.map((reel, index) => (
            <a
              key={reel}
              href={reel}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-3 py-2.5 transition-colors hover:bg-muted/60"
              aria-label={`Watch Shaw Traders EV Instagram reel ${index + 1}`}
            >
              <FaInstagram className="size-7 shrink-0 text-primary" aria-hidden="true" />
              <span className="min-w-0 truncate text-xs font-semibold">Instagram {index + 1}</span>
              <span className="ml-auto shrink-0 text-muted-foreground">
                <ExternalLink className="size-3" aria-hidden="true" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}