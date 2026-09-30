export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

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