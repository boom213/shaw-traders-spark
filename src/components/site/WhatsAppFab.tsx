import { MessageCircle } from "lucide-react";
import { BUSINESS, whatsappLink } from "@/lib/catalog";

export function WhatsAppFab() {
  return (
    <a
      href={whatsappLink(`Hello ${BUSINESS.name}, I would like to enquire about EV parts.`)}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full bg-whatsapp px-4 py-3 text-sm font-semibold text-whatsapp-foreground shadow-[var(--shadow-lift)] transition-transform hover:scale-105 lg:bottom-6"
    >
      <MessageCircle className="size-5" />
      <span className="hidden sm:inline">WhatsApp</span>
    </a>
  );
}
