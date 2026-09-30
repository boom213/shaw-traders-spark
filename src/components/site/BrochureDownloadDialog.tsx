import { Download } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

type BrochureDownloadDialogProps = Pick<ButtonProps, "className" | "size" | "variant"> & {
  label?: string;
};

export function BrochureDownloadDialog({
  className,
  size = "lg",
  variant = "outline",
  label = "Download Brochure",
}: BrochureDownloadDialogProps) {
  return (
    <Button size={size} variant={variant} className={className} asChild>
      <a href="/api/public/catalogue" download="ST-Catalogue-Shaw-Traders.pdf">
        <Download /> {label}
      </a>
    </Button>
  );
}