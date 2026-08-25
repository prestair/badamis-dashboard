export type QuotationChange = {
  field: string;
  from: string;
  to: string;
};

export type QuotationEditEntry = {
  name: string;
  editedAt: string;
  changes: QuotationChange[];
};

export type QuotationAudit = {
  createdBy: string;
  createdAt: string;
  editedBy: string;
  editCount: number;
  editHistory: QuotationEditEntry[];
};

export type QuotationDiscounts = {
  seasonal: { enabled: boolean; amount: number };
  special: { enabled: boolean; amount: number };
  legacyAmount: number;
  transportationAmount: number;
  packingAmount: number;
  // Part A/B support (v4)
  discountPercentA?: number;       // e.g. 11 means 11% on Part A gross
  partBEnabled?: boolean;
  discountPercentB?: number;       // e.g. 7 means 7% on Part B gross
  gstEnabled?: boolean;            // default true; false hides GST row
};

type AuditRow = QuotationAudit & {
  __quotationAudit: true;
};

type DiscountRow = {
  __quotationDiscounts: true;
  version: 2 | 3 | 4;
  seasonal: { enabled: boolean; amount: number };
  special: { enabled: boolean; amount: number };
  legacyAmount?: number;
  transportationAmount?: number;
  packingAmount?: number;
  discountPercentA?: number;
  partBEnabled?: boolean;
  discountPercentB?: number;
  gstEnabled?: boolean;
};

type PartBRow = {
  __partBRows: true;
  items: unknown[];
};

export const EMPTY_QUOTATION_DISCOUNTS: QuotationDiscounts = {
  seasonal: { enabled: false, amount: 0 },
  special: { enabled: false, amount: 0 },
  legacyAmount: 0,
  transportationAmount: 0,
  packingAmount: 0,
  discountPercentA: 0,
  partBEnabled: false,
  discountPercentB: 0,
};

const UNKNOWN_USER = "Unknown";

function cleanName(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : UNKNOWN_USER;
}

function cleanTimestamp(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isAuditRow(value: unknown): value is AuditRow {
  return !!value && typeof value === "object" &&
    (value as Record<string, unknown>).__quotationAudit === true;
}

function isDiscountRow(value: unknown): value is DiscountRow {
  return !!value && typeof value === "object" &&
    (value as Record<string, unknown>).__quotationDiscounts === true;
}

function isPartBRow(value: unknown): value is PartBRow {
  return !!value && typeof value === "object" &&
    (value as Record<string, unknown>).__partBRows === true;
}

function cleanDiscountPart(value: unknown): { enabled: boolean; amount: number } {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    enabled: raw.enabled === true,
    amount: Math.max(0, Number(raw.amount) || 0),
  };
}

function cleanDiscounts(value: unknown): QuotationDiscounts {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    seasonal: cleanDiscountPart(raw.seasonal),
    special: cleanDiscountPart(raw.special),
    legacyAmount: Math.max(0, Number(raw.legacyAmount) || 0),
    transportationAmount: Math.max(0, Number(raw.transportationAmount) || 0),
    packingAmount: Math.max(0, Number(raw.packingAmount) || 0),
    discountPercentA: Math.max(0, Number(raw.discountPercentA) || 0),
    partBEnabled: raw.partBEnabled === true,
    discountPercentB: Math.max(0, Number(raw.discountPercentB) || 0),
    gstEnabled: raw.gstEnabled === false ? false : true, // default true
  };
}

function toDiscountRow(discounts: QuotationDiscounts): DiscountRow {
  return {
    __quotationDiscounts: true,
    version: 4,
    seasonal: cleanDiscountPart(discounts.seasonal),
    special: cleanDiscountPart(discounts.special),
    legacyAmount: Math.max(0, Number(discounts.legacyAmount) || 0),
    transportationAmount: Math.max(0, Number(discounts.transportationAmount) || 0),
    packingAmount: Math.max(0, Number(discounts.packingAmount) || 0),
    discountPercentA: Math.max(0, Number(discounts.discountPercentA) || 0),
    partBEnabled: discounts.partBEnabled === true,
    discountPercentB: Math.max(0, Number(discounts.discountPercentB) || 0),
    gstEnabled: discounts.gstEnabled === false ? false : true,
  };
}

function cleanChanges(value: unknown): QuotationChange[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((change) => {
    if (!change || typeof change !== "object") return [];
    const raw = change as Record<string, unknown>;
    const field = typeof raw.field === "string" ? raw.field : "";
    const from = typeof raw.from === "string" ? raw.from : String(raw.from ?? "");
    const to = typeof raw.to === "string" ? raw.to : String(raw.to ?? "");
    if (!field || from === to) return [];
    return [{ field, from, to }];
  });
}

function cleanHistory(value: unknown): QuotationEditEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const raw = entry as Record<string, unknown>;
    return [{
      name: cleanName(raw.name),
      editedAt: cleanTimestamp(raw.editedAt),
      changes: cleanChanges(raw.changes),
    }];
  });
}

export function unpackQuotationRows(value: unknown): {
  items: unknown[];
  partBItems: unknown[];
  audit: QuotationAudit;
  hasAudit: boolean;
  discounts: QuotationDiscounts;
  hasDiscounts: boolean;
} {
  const rows = Array.isArray(value) ? value : [];
  const auditRow = rows.find(isAuditRow);
  const discountRow = rows.find(isDiscountRow);
  const partBRow = rows.find(isPartBRow);
  const editHistory = cleanHistory(auditRow?.editHistory);
  const editCount = Math.max(Number(auditRow?.editCount) || 0, editHistory.length);

  return {
    items: rows.filter((row) => !isAuditRow(row) && !isDiscountRow(row) && !isPartBRow(row)),
    partBItems: Array.isArray(partBRow?.items) ? partBRow.items : [],
    hasAudit: !!auditRow,
    discounts: cleanDiscounts(discountRow),
    hasDiscounts: !!discountRow,
    audit: {
      createdBy: cleanName(auditRow?.createdBy),
      createdAt: cleanTimestamp(auditRow?.createdAt),
      editedBy: editCount > 0 ? cleanName(auditRow?.editedBy) : "",
      editCount,
      editHistory,
    },
  };
}

export function withQuotationDiscounts(items: unknown, discounts: QuotationDiscounts, partBItems?: unknown[]): unknown[] {
  const unpacked = unpackQuotationRows(items);
  const result: unknown[] = [...unpacked.items, toDiscountRow(discounts)];
  if (partBItems && partBItems.length > 0) {
    result.push({ __partBRows: true, items: partBItems });
  }
  return result;
}

function packQuotationRows(items: unknown, audit: QuotationAudit): unknown[] {
  const unpacked = unpackQuotationRows(items);
  const auditRow: AuditRow = { __quotationAudit: true, ...audit };
  const discountRows = unpacked.hasDiscounts ? [toDiscountRow(unpacked.discounts)] : [];
  const partBRows = unpacked.partBItems.length > 0 ? [{ __partBRows: true, items: unpacked.partBItems }] : [];
  return [...unpacked.items, ...discountRows, ...partBRows, auditRow];
}

export function createAuditedRows(
  items: unknown,
  actorName: unknown,
  createdAt = new Date().toISOString()
): unknown[] {
  return packQuotationRows(items, {
    createdBy: cleanName(actorName),
    createdAt,
    editedBy: "",
    editCount: 0,
    editHistory: [],
  });
}

export function appendQuotationEdit(
  newItems: unknown,
  existingStoredRows: unknown,
  actorName: unknown,
  editedAt = new Date().toISOString(),
  fallbackAudit?: Partial<QuotationAudit>,
  changes: QuotationChange[] = []
): unknown[] {
  const existing = unpackQuotationRows(existingStoredRows);
  const fallbackHistory = cleanHistory(fallbackAudit?.editHistory);
  const source = existing.hasAudit ? existing.audit : {
    createdBy: cleanName(fallbackAudit?.createdBy),
    createdAt: cleanTimestamp(fallbackAudit?.createdAt),
    editedBy: typeof fallbackAudit?.editedBy === "string" ? fallbackAudit.editedBy : "",
    editCount: Math.max(Number(fallbackAudit?.editCount) || 0, fallbackHistory.length),
    editHistory: fallbackHistory,
  };
  const name = cleanName(actorName);
  const sanitizedChanges = cleanChanges(changes);
  if (sanitizedChanges.length === 0) {
    return packQuotationRows(newItems, source);
  }
  const editHistory = [...source.editHistory, { name, editedAt, changes: sanitizedChanges }];

  return packQuotationRows(newItems, {
    createdBy: source.createdBy,
    createdAt: source.createdAt,
    editedBy: name,
    editCount: Math.max(source.editCount, source.editHistory.length) + 1,
    editHistory,
  });
}

function displayValue(value: unknown, currency = false): string {
  if (value === null || value === undefined || value === "") return "—";
  if (currency && !Number.isNaN(Number(value))) {
    return `₹${Number(value).toLocaleString("en-IN")}`;
  }
  return String(value);
}

export function buildQuotationChanges(
  beforeValue: unknown,
  afterValue: unknown
): QuotationChange[] {
  const before = (beforeValue ?? {}) as Record<string, unknown>;
  const after = (afterValue ?? {}) as Record<string, unknown>;
  const changes: QuotationChange[] = [];
  const fields: Array<[string, string, boolean]> = [
    ["quotationNo", "Quotation No.", false], ["date", "Date", false],
    ["partyName", "Client Name", false], ["partyAddress", "Address", false],
    ["partyGST", "GST No.", false], ["attention", "Kind Attention", false],
    ["subject", "Subject", false], ["grandTotal", "Grand Total", true],
  ];

  for (const [key, label, currency] of fields) {
    if (String(before[key] ?? "") !== String(after[key] ?? "")) {
      changes.push({
        field: label,
        from: displayValue(before[key], currency),
        to: displayValue(after[key], currency),
      });
    }
  }

  const beforeDiscounts = cleanDiscounts(before.discounts);
  const afterDiscounts = cleanDiscounts(after.discounts);
  const discountFields: Array<[
    keyof Pick<QuotationDiscounts, "seasonal" | "special">,
    string
  ]> = [
    ["seasonal", "Seasonal Discount"],
    ["special", "Special Discount"],
  ];
  for (const [key, label] of discountFields) {
    const previous = beforeDiscounts[key];
    const next = afterDiscounts[key];
    if (previous.enabled !== next.enabled) {
      changes.push({
        field: `${label} Enabled`,
        from: previous.enabled ? "Yes" : "No",
        to: next.enabled ? "Yes" : "No",
      });
    }
    if (previous.amount !== next.amount) {
      changes.push({
        field: `${label} Amount`,
        from: displayValue(previous.amount, true),
        to: displayValue(next.amount, true),
      });
    }
  }

  for (const [key, label] of [
    ["transportationAmount", "Transportation Charges"],
    ["packingAmount", "Packing Charges"],
  ] as const) {
    if (beforeDiscounts[key] !== afterDiscounts[key]) {
      changes.push({
        field: label,
        from: displayValue(beforeDiscounts[key], true),
        to: displayValue(afterDiscounts[key], true),
      });
    }
  }

  const beforeRows = unpackQuotationRows(before.rows).items as Record<string, unknown>[];
  const afterRows = unpackQuotationRows(after.rows).items as Record<string, unknown>[];
  const beforeById = new Map(beforeRows.map((row, index) => [String(row.id ?? index + 1), row]));
  const afterById = new Map(afterRows.map((row, index) => [String(row.id ?? index + 1), row]));

  for (const [id, row] of beforeById) {
    const next = afterById.get(id);
    const isSection = row.rowType === "section";
    if (!next) {
      changes.push({
        field: isSection ? "Section" : `Item ${id}`,
        from: String(row.desc ?? id),
        to: "Removed",
      });
      continue;
    }
    if (isSection || next.rowType === "section") {
      if (String(row.desc ?? "") !== String(next.desc ?? "")) {
        changes.push({
          field: "Section heading",
          from: displayValue(row.desc),
          to: displayValue(next.desc),
        });
      }
      continue;
    }
    const itemFields: Array<[string, string, boolean]> = [
      ["desc", "Item Name", false], ["size", "Size", false],
      ["hsn", "HSN", false], ["qty", "Qty", false],
      ["additionalColumn", "Additional Description", false], ["rate", "Rate", true],
      ["amt", "Amount", true],
    ];
    for (const [key, label, currency] of itemFields) {
      if (String(row[key] ?? "") !== String(next[key] ?? "")) {
        changes.push({
          field: `${id} ${label}`,
          from: displayValue(row[key], currency),
          to: displayValue(next[key], currency),
        });
      }
    }
  }

  for (const [id, row] of afterById) {
    if (!beforeById.has(id)) {
      const isSection = row.rowType === "section";
      changes.push({
        field: isSection ? "Section" : `Item ${id}`,
        from: "Not present",
        to: `Added: ${String(row.desc ?? id)}`,
      });
    }
  }

  return changes;
}
