export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

const MOBILE_RE = /^[6-9]\d{9}$/;

export function validateNameAndPhones(values: { name: string; phone: string; alternatePhone?: string }): FieldErrors<"name" | "phone" | "alternatePhone"> {
  const errors: FieldErrors<"name" | "phone" | "alternatePhone"> = {};
  if (!values.name.trim()) errors.name = "Enter your name.";
  if (!MOBILE_RE.test(values.phone.replace(/\D/g, ""))) errors.phone = "Enter a valid 10-digit mobile number.";
  const alternate = values.alternatePhone?.replace(/\D/g, "") ?? "";
  if (alternate && !MOBILE_RE.test(alternate)) errors.alternatePhone = "Enter a valid 10-digit alternate mobile number.";
  return errors;
}

export function errorCount(errors: Record<string, string | undefined>): number {
  return Object.values(errors).filter(Boolean).length;
}

export function focusFirstInvalid(container?: HTMLElement | null): void {
  window.requestAnimationFrame(() => {
    const root = container ?? document;
    const field = root.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!field) return;
    field.focus();
    field.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

export function validationSummary(errors: Record<string, string | undefined>): string {
  const count = errorCount(errors);
  return `Please fix ${count} ${count === 1 ? "field" : "fields"} below.`;
}