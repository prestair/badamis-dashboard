import fs from "fs";
import path from "path";

const STORE_PATH = "Y:\\Prestair\\Quotations\\quotation-item-names.json";
const FALLBACK_PATH = path.join(process.cwd(), "data", "quotation-item-names.json");

export type StoredQuotationItemName = {
  id: string;
  item_name: string;
  created_at: string;
  updated_at: string;
};

function getStorePath(): string {
  try {
    const directory = path.dirname(STORE_PATH);
    if (fs.existsSync(directory)) return STORE_PATH;
  } catch {
    // Use the repository fallback when the shared drive is unavailable.
  }

  const fallbackDirectory = path.dirname(FALLBACK_PATH);
  if (!fs.existsSync(fallbackDirectory)) {
    fs.mkdirSync(fallbackDirectory, { recursive: true });
  }
  return FALLBACK_PATH;
}

function writeItemNames(entries: StoredQuotationItemName[]): void {
  fs.writeFileSync(getStorePath(), JSON.stringify(entries, null, 2), "utf-8");
}

export function readItemNames(): StoredQuotationItemName[] {
  const storePath = getStorePath();
  if (!fs.existsSync(storePath)) return [];

  try {
    const parsed = JSON.parse(fs.readFileSync(storePath, "utf-8"));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is StoredQuotationItemName => (
        !!entry && typeof entry === "object" &&
        typeof entry.id === "string" && typeof entry.item_name === "string"
      ))
      .sort((left, right) => left.item_name.localeCompare(right.item_name));
  } catch {
    return [];
  }
}

export function createItemName(itemName: string): StoredQuotationItemName | null {
  const entries = readItemNames();
  if (entries.some((entry) => entry.item_name.toLocaleLowerCase() === itemName.toLocaleLowerCase())) {
    return null;
  }

  const timestamp = new Date().toISOString();
  const created = {
    id: crypto.randomUUID(),
    item_name: itemName,
    created_at: timestamp,
    updated_at: timestamp,
  };
  writeItemNames([...entries, created]);
  return created;
}

export function updateItemName(id: string, itemName: string): StoredQuotationItemName | null {
  const entries = readItemNames();
  const index = entries.findIndex((entry) => entry.id === id);
  if (index === -1) return null;
  if (entries.some((entry) => entry.id !== id && entry.item_name.toLocaleLowerCase() === itemName.toLocaleLowerCase())) {
    return null;
  }

  const updated = { ...entries[index], item_name: itemName, updated_at: new Date().toISOString() };
  entries[index] = updated;
  writeItemNames(entries);
  return updated;
}
