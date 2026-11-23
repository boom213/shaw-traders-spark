export type CsvExportResult = {
  csv: string;
  fileName: string;
  rows: number;
  truncated: boolean;
};

export const CSV_EXPORT_LIMIT = 10_000;

/** CSV download is only offered once the list has loaded and has at least one row. */
export function canExportCsv(rowCount: number | undefined): boolean {
  return typeof rowCount === "number" && rowCount > 0;
}
export const CSV_EXPORT_CHUNK = 1_000;

/**
 * Text starting with =, +, -, @, tab or carriage return is run as a formula by
 * spreadsheet apps. Prefix it with an apostrophe so it shows as plain text.
 * Real numbers (including negative amounts) are left untouched.
 */
export function neutralizeFormula(text: string): string {
  if (!/^[=+\-@\t\r]/.test(text)) return text;
  if (/^[-+]?\d+(\.\d+)?$/.test(text)) return text;
  return `'${text}`;
}

export function csvCell(value: unknown): string {
  const raw = value === null || value === undefined ? "" : String(value);
  const text = typeof value === "number" ? raw : neutralizeFormula(raw);
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return `\uFEFF${[headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n")}`;
}

export function csvFileName(dataset: string, date = new Date()): string {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return `${dataset}-${day}.csv`;
}

export function csvDateTime(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}