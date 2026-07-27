import fs from "fs";
import path from "path";

// ── Storage path ───────────────────────────────────────────────────────────────
const STORE_PATH = "Y:\\Prestair\\Quotations\\quotations.json";

// Fallback for dev if Y:\ not available
const FALLBACK_PATH = path.join(process.cwd(), "data", "quotations.json");

function getStorePath(): string {
  try {
    const dir = path.dirname(STORE_PATH);
    if (fs.existsSync(dir)) return STORE_PATH;
  } catch {
    // ignore
  }
  // ensure fallback dir exists
  const fallbackDir = path.dirname(FALLBACK_PATH);
  if (!fs.existsSync(fallbackDir)) {
    fs.mkdirSync(fallbackDir, { recursive: true });
  }
  return FALLBACK_PATH;
}

export type StoredQuotation = {
  id:           string;
  serial_no:    number;
  quotation_no: string;
  date:         string;
  party_name:   string;
  party_address:string;
  party_gst:    string;
  subject:      string;
  attention:    string;
  rows:         unknown[];
  gross:        number;
  discount:     number;
  after_discount:number;
  gst:          number;
  grand_total:  number;
  saved_at:     string;
};

// ── Read all ───────────────────────────────────────────────────────────────────
export function readAll(): StoredQuotation[] {
  const p = getStorePath();
  if (!fs.existsSync(p)) return [];
  try {
    const raw = fs.readFileSync(p, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// ── Write all ──────────────────────────────────────────────────────────────────
function writeAll(data: StoredQuotation[]): void {
  const p = getStorePath();
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf-8");
}

// ── Create ─────────────────────────────────────────────────────────────────────
export function createQuotation(
  body: Omit<StoredQuotation, "id" | "serial_no" | "saved_at">
): StoredQuotation {
  const all    = readAll();
  const nextNo = all.length > 0 ? Math.max(...all.map((q) => q.serial_no)) + 1 : 1;
  const newQ: StoredQuotation = {
    ...body,
    id:        crypto.randomUUID(),
    serial_no: nextNo,
    saved_at:  new Date().toISOString(),
  };
  all.push(newQ);
  writeAll(all);
  return newQ;
}

// ── Update ─────────────────────────────────────────────────────────────────────
export function updateQuotation(
  id: string,
  body: Omit<StoredQuotation, "id" | "serial_no" | "saved_at">
): StoredQuotation | null {
  const all = readAll();
  const idx = all.findIndex((q) => q.id === id);
  if (idx === -1) return null;
  const updated: StoredQuotation = {
    ...all[idx],
    ...body,
    id,
    saved_at: new Date().toISOString(),
  };
  all[idx] = updated;
  writeAll(all);
  return updated;
}

// ── Delete ─────────────────────────────────────────────────────────────────────
export function deleteQuotation(id: string): boolean {
  const all     = readAll();
  const filtered = all.filter((q) => q.id !== id);
  if (filtered.length === all.length) return false;
  writeAll(filtered);
  return true;
}
