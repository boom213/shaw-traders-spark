const TEMPLATE_ROWS = [
  ["name", "phone", "message", "link"],
  ["Asha Example", "9800000001", "Our latest EV parts catalogue is now available.", ""],
  ["Ravi Example", "9800000002", "You can browse our available EV parts on the Shaw Traders website.", "https://shawtradersev.com/shop"],
  ["Meera Example", "9800000003", "Hello Meera, brake pads and lighting parts are back in stock.", ""],
] as const;

function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function buildOutreachTemplateCsv(): string {
  return `\uFEFF${TEMPLATE_ROWS.map((row) => row.map(escapeCsvField).join(",")).join("\r\n")}\r\n`;
}

export function downloadOutreachTemplate(): void {
  const url = URL.createObjectURL(new Blob([buildOutreachTemplateCsv()], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "outreach-template.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}