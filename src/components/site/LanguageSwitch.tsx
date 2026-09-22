import { Languages } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGES, useLanguage, type Lang } from "@/lib/i18n";

/** Lets the shopper read the site in English, Bengali or Hindi. */
export function LanguageSwitch({ className }: { className?: string }) {
  const { lang, setLang, t } = useLanguage();

  return (
    <div className={className}>
      <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
        <SelectTrigger className="h-9 w-[125px] gap-2 text-sm" aria-label={t("nav.language")}>
          <Languages className="size-4 shrink-0" aria-hidden="true" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((l) => (
            <SelectItem key={l.code} value={l.code}>
              {l.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
