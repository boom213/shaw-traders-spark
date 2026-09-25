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
            <a
              key={video}
              href={video}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-lg border border-border bg-background p-8 text-center transition-colors hover:bg-muted/60"
              aria-label={`Watch Shaw Traders EV Facebook video ${index + 1}`}
            >
              <span className="relative flex size-12 items-center justify-center rounded-full border border-border">
                <FaFacebookF className="size-5 text-primary" aria-hidden="true" />
                <Play className="absolute -bottom-1 -right-1 size-4 fill-current text-foreground" aria-hidden="true" />
              </span>
              <span className="font-display text-lg font-semibold">Watch on Facebook</span>
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                Open video <ExternalLink className="size-4" aria-hidden="true" />
              </span>
            </a>
          ))}

          {INSTAGRAM_REELS.map((reel, index) => (
            <a
              key={reel}
              href={reel}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-lg border border-border bg-background p-8 text-center transition-colors hover:bg-muted/60"
              aria-label={`Watch Shaw Traders EV Instagram reel ${index + 1}`}
            >
              <FaInstagram className="size-10 text-primary" aria-hidden="true" />
              <span className="font-display text-lg font-semibold">Watch on Instagram</span>
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                Open reel <ExternalLink className="size-4" aria-hidden="true" />
              </span>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}