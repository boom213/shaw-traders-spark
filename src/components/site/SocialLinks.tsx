import { FaFacebookF, FaInstagram } from "react-icons/fa6";
import { cn } from "@/lib/utils";

export const SOCIAL_PROFILES = {
  facebook: "https://www.facebook.com/shawtradersev/",
  instagram: "https://www.instagram.com/shawtradersev/",
} as const;

export function SocialLinks({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)} aria-label="Follow Shaw Traders EV">
      <a
        href={SOCIAL_PROFILES.facebook}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Follow Shaw Traders EV on Facebook"
        className="grid size-9 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <FaFacebookF className="size-4" aria-hidden="true" />
      </a>
      <a
        href={SOCIAL_PROFILES.instagram}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Follow Shaw Traders EV on Instagram"
        className="grid size-9 place-items-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary"
      >
        <FaInstagram className="size-[1.1rem]" aria-hidden="true" />
      </a>
    </div>
  );
}