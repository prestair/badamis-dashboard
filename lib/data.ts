export type QuotationItem = {
  id: string;
  section: string;
  desc: string;
  size: string;
  hsn: string;
  qty: number;
  rate: number | null;
  amt: number | null;
};

export const SECTION_COLORS: Record<string, string> = {
  "Display Counter": "#2563eb",
  "Back Counter": "#16a34a",
  "Mithai Coordination": "#ea580c",
  "Service Counter": "#7c3aed",
  "Main Kitchen": "#0e7490",
  "Cold Room": "#dc2626",
  "Dish Wash": "#b45309",
  "Exhaust Hood": "#0f766e",
};

export const QUOTATION_META = {
  quotationNo: "PS/25-26/QT-4530",
  date: "20 July 2026",
  client: "PRESTAIR SYSTEMS LLP",
  address: "B-127, B-128, B-124, B 91-92, B-116 PHASE - II NOIDA 201305 ",
  clientGST: "09AATFP8342B1ZX",
  attention: "Mr. Akhil Mittal",
  subject: "Display, Services Counter & Kitchen Equipment – Prestair systems llp NSEZ, Noida",
  vendor: "Prestair Systems LLP",
  vendorGST: "09AATFP8342B1ZX",
  gross: 3001000,
  discount: 261000,
  afterDiscount: 2740000,
  gst: 493200,
  grandTotal: 3233200,
};

export const ALL_ITEMS: QuotationItem[] = [
  // Display Counter
  { id: "DC-01", section: "Display Counter", desc: "Cash Counter", size: '72"×24"×34"', hsn: "7323", qty: 1, rate: null, amt: null },
  { id: "DC-02", section: "Display Counter", desc: "Display Counter Plain – Kaju (3+1 shelf)", size: '60"×28"×50"', hsn: "7323", qty: 1, rate: 125000, amt: 125000 },
  { id: "DC-03", section: "Display Counter", desc: "Display Counter Plain – Ghee (3+1 shelf)", size: '60"×28"×50"', hsn: "7323", qty: 1, rate: 125000, amt: 125000 },
  { id: "DC-04", section: "Display Counter", desc: "Display Counter Plain – Khoya (3+1 shelf)", size: '60"×28"×50"', hsn: "7323", qty: 1, rate: 125000, amt: 125000 },
  { id: "DC-05", section: "Display Counter", desc: "Display Counter Static Cold – Bengali", size: '60"×28"×50"', hsn: "7323", qty: 1, rate: 175000, amt: 175000 },
  { id: "DC-06", section: "Display Counter", desc: "Display Counter Hot & Cold Bain Marie", size: '60"×28"×50"', hsn: "8418", qty: 1, rate: 175000, amt: 175000 },
  { id: "DC-07", section: "Display Counter", desc: "Display Counter Spaze (4+1) Glass Shelf Big Height", size: '60"×28"×56"', hsn: "8418", qty: 1, rate: 250000, amt: 250000 },
  { id: "DC-08", section: "Display Counter", desc: "Display Counter Spaze (4+1) Glass Shelf Big Height", size: '60"×28"×56"', hsn: "8418", qty: 1, rate: 250000, amt: 250000 },
  // Back Counter
  { id: "BC-01", section: "Back Counter", desc: "Work Table with 2 U/S", size: '51"×24"×34"+4"', hsn: "7323", qty: 3, rate: 20500, amt: 61500 },
  { id: "BC-02", section: "Back Counter", desc: "Under Counter Refer Unit (RHS)", size: '54"×24"×34"+4"', hsn: "7323", qty: 1, rate: 78000, amt: 78000 },
  { id: "BC-03", section: "Back Counter", desc: "Work Table with 2 U/S", size: '48"×24"×34"+4"', hsn: "7323", qty: 1, rate: 19000, amt: 19000 },
  { id: "BC-04", section: "Back Counter", desc: "Work Table with 2 U/S", size: '48"×24"×34"+4"', hsn: "7323", qty: 1, rate: 19000, amt: 19000 },
  { id: "BC-04A", section: "Back Counter", desc: "Work Table with 1U/S + Drawer", size: '48"×24"×34"+4"', hsn: "7323", qty: 1, rate: 21000, amt: 21000 },
  { id: "BC-05", section: "Back Counter", desc: 'Work Table with Angle for Tray (16"×21"×1.5")', size: '56"×24"×34"+4"', hsn: "7324", qty: 1, rate: 23000, amt: 23000 },
  // Mithai Coordination
  { id: "MI-01", section: "Mithai Coordination", desc: "SS Storage Rack with 5 Shelves", size: '42"×18"×72"', hsn: "7323", qty: 1, rate: 23000, amt: 23000 },
  { id: "MI-02", section: "Mithai Coordination", desc: "SS Storage Rack with 5 Shelves", size: '36"×18"×72"', hsn: "7323", qty: 4, rate: 19500, amt: 78000 },
  // Service Counter
  { id: "SC-01", section: "Service Counter", desc: "Live Tea Counter with GN Pans & Induction Provision", size: '30"×28"×34"+4"', hsn: "8418", qty: 1, rate: 30000, amt: 30000 },
  { id: "SC-01A", section: "Service Counter", desc: "Commercial Induction Drop-In (5 KW)", size: "5 KW", hsn: "7323", qty: 1, rate: 23000, amt: 23000 },
  { id: "SC-02", section: "Service Counter", desc: "Hot & Cold Bain Marie – Thali Counter Seasonal with GN Pans", size: '60"×28"×34"+4"', hsn: "8418", qty: 1, rate: 95000, amt: 95000 },
  { id: "SC-02A", section: "Service Counter", desc: "GN Pan Shelf with Stand", size: "STD", hsn: "7323", qty: 1, rate: 6000, amt: 6000 },
  { id: "SC-03", section: "Service Counter", desc: "Cold Chat & Rajkach Counter with Under Cold Storage & GN Pans", size: '48"×28"×34"+4"', hsn: "8418", qty: 1, rate: 78000, amt: 78000 },
  { id: "SC-03A", section: "Service Counter", desc: "GN Pan Shelf with Stand", size: "STD", hsn: "7323", qty: 1, rate: 6000, amt: 6000 },
  { id: "SC-04", section: "Service Counter", desc: "Hot & Cold BM – Matar Kulcha / Pao Bhaji Counter with GN Pans", size: '48"×28"×34"+4"', hsn: "8418", qty: 1, rate: 76000, amt: 76000 },
  { id: "SC-04A", section: "Service Counter", desc: "GN Pan Shelf with Stand", size: "STD", hsn: "7323", qty: 1, rate: 6000, amt: 6000 },
  // Main Kitchen
  { id: "MK-01", section: "Main Kitchen", desc: "Work Table with 2 U/S", size: '18"×28"×34"+4"', hsn: "7323", qty: 1, rate: 11000, amt: 11000 },
  { id: "MK-02", section: "Main Kitchen", desc: "Low Height Under Counter Refer", size: '48"×28"×24"', hsn: "7323", qty: 1, rate: 48000, amt: 48000 },
  { id: "MK-02A", section: "Main Kitchen", desc: "Two Burner Range for Bhature (Table Top)", size: '48"×28"×10"+4"', hsn: "7323", qty: 1, rate: 23000, amt: 23000 },
  { id: "MK-03", section: "Main Kitchen", desc: "Work Table with 2 U/S", size: '19"×28"×34"+4"', hsn: "7323", qty: 1, rate: 11000, amt: 11000 },
  { id: "MK-03A", section: "Main Kitchen", desc: "Oil Container 1/1×1 Normal + 1/1×1 Perforated", size: "STD", hsn: "7323", qty: 1, rate: 4500, amt: 4500 },
  { id: "MK-04", section: "Main Kitchen", desc: "Dosa Plate with Cross Bracing – 25mm MS Plate Heavy Duty", size: '48"×28"×34"+4"', hsn: "7323", qty: 1, rate: 48000, amt: 48000 },
  { id: "MK-04A", section: "Main Kitchen", desc: "Oil Container Stand", size: "STD", hsn: "7323", qty: 1, rate: 2500, amt: 2500 },
  { id: "MK-05", section: "Main Kitchen", desc: "Hot & Cold Bain Marie for Dosa with GN Pans", size: '36"×28"×34"+4"', hsn: "7323", qty: 1, rate: 58000, amt: 58000 },
  { id: "MK-05A", section: "Main Kitchen", desc: "Idli Steamer Wall Mounted (Cap 54 Idlis)", size: "STD", hsn: "7323", qty: 1, rate: 25000, amt: 25000 },
  { id: "MK-05B", section: "Main Kitchen", desc: "SS Tray for Idli", size: "STD", hsn: "7323", qty: 6, rate: 1200, amt: 7200 },
  { id: "MK-05C", section: "Main Kitchen", desc: "Idli Steamer Stand", size: "STD", hsn: "7323", qty: 1, rate: 3500, amt: 3500 },
  { id: "MK-06", section: "Main Kitchen", desc: "Ala-Cart Assembly with Under Cold Storage & GN Pans (5 nos 1/3 100mm)", size: '36"×28"×34"+4"+18"', hsn: "8418", qty: 1, rate: 65000, amt: 65000 },
  { id: "MK-07", section: "Main Kitchen", desc: "Low Height Under Counter Refer", size: '48"×28"×24"', hsn: "7323", qty: 1, rate: 48000, amt: 48000 },
  { id: "MK-07A", section: "Main Kitchen", desc: "Two Burner Range for Ala-Cart", size: '48"×28"×10"+4"', hsn: "7323", qty: 1, rate: 23000, amt: 23000 },
  { id: "MK-08", section: "Main Kitchen", desc: "Work Table with 2 U/S", size: '14"×32"×34"+4"', hsn: "7323", qty: 1, rate: 11500, amt: 11500 },
  { id: "MK-09", section: "Main Kitchen", desc: "SS Tandoor (Gas Operated)", size: '32"×32"×34"+4"', hsn: "7323", qty: 1, rate: 30000, amt: 30000 },
  { id: "MK-09A", section: "Main Kitchen", desc: "Tandoor Stick Stand", size: "STD", hsn: "7323", qty: 1, rate: 3000, amt: 3000 },
  { id: "MK-10", section: "Main Kitchen", desc: "Single Door Under Counter Refer", size: '36"×28"×34"+4"', hsn: "7323", qty: 1, rate: 52000, amt: 52000 },
  { id: "MK-11", section: "Main Kitchen", desc: "Hot Plate Electric (Table Top)", size: "STD", hsn: "7323", qty: 1, rate: 18000, amt: 18000 },
  { id: "MK-12", section: "Main Kitchen", desc: "Two Burner Chinese Range with Water Faucet & Strainer Basket", size: '46"×28"×34"+12"', hsn: "7323", qty: 1, rate: 39000, amt: 39000 },
  { id: "MK-13", section: "Main Kitchen", desc: "Chinese Assembly with Under Cold Storage & GN Pans (5 nos 1/3 100mm)", size: '36"×28"×34"+4"', hsn: "8418", qty: 1, rate: 65000, amt: 65000 },
  { id: "MK-14", section: "Main Kitchen", desc: "Work Table with 2 U/S", size: '52"×24"×34"+4"', hsn: "7323", qty: 1, rate: 21000, amt: 21000 },
  { id: "MK-15", section: "Main Kitchen", desc: "Sandwich Griller", size: "STD", hsn: "7323", qty: 1, rate: 18000, amt: 18000 },
  { id: "MK-16", section: "Main Kitchen", desc: "Deep Fat Fryer with 1/2 GN Pans", size: "STD", hsn: "7323", qty: 1, rate: 11000, amt: 11000 },
  { id: "MK-17", section: "Main Kitchen", desc: "Work Table with 2 U/S", size: '29"×28"×34"+4"', hsn: "7323", qty: 1, rate: 12000, amt: 12000 },
  { id: "MK-17A", section: "Main Kitchen", desc: "Pizza Oven Wall Mounted – Compact Model (Stone Top)", size: "STONE TOP", hsn: "7323", qty: 1, rate: 28000, amt: 28000 },
  { id: "MK-18", section: "Main Kitchen", desc: "Single Sink Unit", size: '24"×28"×34"+4"', hsn: "7323", qty: 1, rate: 17000, amt: 17000 },
  { id: "MK-19a", section: "Main Kitchen", desc: "SS Insulated Panel", size: '87"×2"×66"', hsn: "7323", qty: 2, rate: 50000, amt: 100000 },
  { id: "MK-19b", section: "Main Kitchen", desc: "SS Insulated Panel", size: '28"×2"×66"', hsn: "7323", qty: 1, rate: 17000, amt: 17000 },
  // Cold Room
  { id: "CR-01", section: "Cold Room", desc: "Cold Room", size: '96"×72"×96"', hsn: "8418", qty: 1, rate: null, amt: null },
  { id: "CR-02", section: "Cold Room", desc: "SS Storage Rack with 5 Shelf", size: '36"×18"×72"', hsn: "7323", qty: 2, rate: 19500, amt: 39000 },
  { id: "CR-03", section: "Cold Room", desc: "SS Storage Rack with 5 Shelf", size: '30"×18"×72"', hsn: "7323", qty: 1, rate: 16500, amt: 16500 },
  { id: "CR-04", section: "Cold Room", desc: "SS Storage Rack with 5 Shelf", size: '27"×18"×72"', hsn: "7323", qty: 1, rate: 15000, amt: 15000 },
  // Dish Wash
  { id: "DW-01", section: "Dish Wash", desc: "Dish Landing Table with Garbage Chute & Glass Rack", size: '36"×24"×34"+4"+18"', hsn: "7323", qty: 1, rate: 15000, amt: 15000 },
  { id: "DW-01A", section: "Dish Wash", desc: "Dustbin", size: "STD", hsn: "7323", qty: 1, rate: null, amt: null },
  { id: "DW-02", section: "Dish Wash", desc: "Three Sink Unit with Cross Bracing", size: '60"×24"×34"+4"', hsn: "7323", qty: 1, rate: 36500, amt: 36500 },
  { id: "DW-02A", section: "Dish Wash", desc: "Grease Trap", size: "STD", hsn: "7323", qty: 1, rate: 21000, amt: 21000 },
  { id: "DW-02B", section: "Dish Wash", desc: "Wall Shelf", size: '60"×12"', hsn: "7323", qty: 1, rate: 6000, amt: 6000 },
  { id: "DW-03", section: "Dish Wash", desc: "Work Table with 2 U/S", size: '50"×18"×34"+4"', hsn: "7323", qty: 1, rate: 16000, amt: 16000 },
  // Exhaust Hood
  { id: "EX-01", section: "Exhaust Hood", desc: 'Exhaust Hood – Bhatura Range (3×20"×20" SS Filters)', size: '60"×34"×20"', hsn: "7323", qty: 1, rate: 28000, amt: 28000 },
  { id: "EX-02", section: "Exhaust Hood", desc: 'Exhaust Hood – South Indian Range (2×24"×20" SS Filters)', size: '54"×34"×20"', hsn: "7323", qty: 1, rate: 25000, amt: 25000 },
  { id: "EX-03", section: "Exhaust Hood", desc: 'Exhaust Hood – Ala-Cart Range (3×24"×20" SS Filters)', size: '54"×34"×20"', hsn: "7323", qty: 1, rate: 25000, amt: 25000 },
  { id: "EX-04", section: "Exhaust Hood", desc: 'Exhaust Hood – Tandoor (3×24"×20" SS Filters)', size: '44"×38"×20"', hsn: "7323", qty: 1, rate: 24300, amt: 24300 },
  { id: "EX-05", section: "Exhaust Hood", desc: 'Exhaust Hood – Chinese Range (3×24"×20" SS Filters)', size: '54"×34"×20"', hsn: "7323", qty: 1, rate: 25000, amt: 25000 },
  { id: "EX-06", section: "Exhaust Hood", desc: 'Exhaust Hood – Continental (3×20"×20" SS Filters)', size: '50"×30"×20"', hsn: "7323", qty: 1, rate: 21000, amt: 21000 },
];

export const SECTIONS = Object.keys(SECTION_COLORS);

export function getSectionTotals() {
  return SECTIONS.map((section) => ({
    section,
    amt: ALL_ITEMS.filter((i) => i.section === section && i.amt !== null).reduce(
      (s, i) => s + (i.amt ?? 0),
      0
    ),
    count: ALL_ITEMS.filter((i) => i.section === section).length,
    color: SECTION_COLORS[section],
  }));
}

export function getTop10() {
  return [...ALL_ITEMS]
    .filter((i) => i.amt !== null)
    .sort((a, b) => (b.amt ?? 0) - (a.amt ?? 0))
    .slice(0, 10);
}

export function fmtINR(n: number | null): string {
  if (n === null) return "NQ";
  return "₹" + n.toLocaleString("en-IN");
}
