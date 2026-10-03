import { toWhatsAppNumber } from "@/lib/whatsapp.server";

export type OutreachImportContact = {
  name: string | null;
  phone: string;
  message: string;
  link_url: string | null;
};

export type OutreachRejectedRow = { row: number; reason: string };

export type ParsedOutreachCsv = {
  contacts: OutreachImportContact[];
  rejected: OutreachRejectedRow[];
  duplicatesSkipped: number;
  error?: string;
};

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index++;
      } else if (char === '"') quoted = false;
      else current += char;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      cells.push(current.trim());
      current = "";
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function validLink(raw: string): string | null | false {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : false;
  } catch {
    return false;
  }
}

export function parseOutreachCsv(text: string): ParsedOutreachCsv {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) return { contacts: [], rejected: [], duplicatesSkipped: 0, error: "The file has no contact rows." };
  const header = splitCsvLine(lines[0] ?? "").map((value) => value.replace(/^\uFEFF/, "").trim().toLowerCase());
  const at = (name: string) => header.indexOf(name);
  const phoneAt = at("phone");
  const messageAt = at("message");
  if (phoneAt < 0 || messageAt < 0) {
    return { contacts: [], rejected: [], duplicatesSkipped: 0, error: "The file needs phone and message columns." };
  }
  const dataLines = lines.slice(1).filter((line) => line.trim());
  if (dataLines.length > 5000) {
    return { contacts: [], rejected: [], duplicatesSkipped: 0, error: "A list can contain at most 5,000 contacts." };
  }

  const contacts: OutreachImportContact[] = [];
  const rejected: OutreachRejectedRow[] = [];
  const seen = new Set<string>();
  let duplicatesSkipped = 0;
  const nameAt = at("name");
  const linkAt = at("link");

  for (const [offset, line] of lines.slice(1).entries()) {
    if (!line.trim()) continue;
    const row = offset + 2;
    const cells = splitCsvLine(line);
    const phone = toWhatsAppNumber(cells[phoneAt]);
    const message = String(cells[messageAt] ?? "").trim();
    if (!phone) {
      rejected.push({ row, reason: "Invalid phone number" });
      continue;
    }
    if (!message) {
      rejected.push({ row, reason: "Message is required" });
      continue;
    }
    const link = linkAt >= 0 ? validLink(cells[linkAt] ?? "") : null;
    if (link === false) {
      rejected.push({ row, reason: "Link must be a valid http or https URL" });
      continue;
    }
    if (seen.has(phone)) {
      duplicatesSkipped++;
      continue;
    }
    seen.add(phone);
    contacts.push({
      name: nameAt >= 0 ? String(cells[nameAt] ?? "").trim().slice(0, 160) || null : null,
      phone,
      message: message.slice(0, 4000),
      link_url: link,
    });
  }

  if (contacts.length === 0 && rejected.length === 0) {
    return { contacts, rejected, duplicatesSkipped, error: "The file has no contact rows." };
  }
  return { contacts, rejected, duplicatesSkipped };
}