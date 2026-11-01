const EXPORTS_STORAGE_KEY = "fruit_house_exports";
const EXPORTS_UPDATED_EVENT = "fruit-house-exports-updated";

export type ExportRecord = {
  id: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  orderedDate: string;
  deliveredLocation: string;
  dealerName: string;
  distributorName: string;
  deliveryCompletionDate: string | null;
};

function isExportRecord(value: unknown): value is ExportRecord {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value && typeof value.id === "string" &&
    "productId" in value && typeof value.productId === "string" &&
    "productName" in value && typeof value.productName === "string" &&
    "imageUrl" in value &&
    (typeof value.imageUrl === "string" || value.imageUrl === null) &&
    "orderedDate" in value && typeof value.orderedDate === "string" &&
    "deliveredLocation" in value && typeof value.deliveredLocation === "string" &&
    "dealerName" in value && typeof value.dealerName === "string" &&
    "distributorName" in value && typeof value.distributorName === "string" &&
    "deliveryCompletionDate" in value &&
    (typeof value.deliveryCompletionDate === "string" ||
      value.deliveryCompletionDate === null)
  );
}

export function getExportRecords(): ExportRecord[] {
  const stored = localStorage.getItem(EXPORTS_STORAGE_KEY);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed) || !parsed.every(isExportRecord)) {
    throw new Error("Saved export records are invalid. Please contact support.");
  }
  return parsed;
}

export function addExportRecord(
  input: Omit<ExportRecord, "id">,
): ExportRecord {
  const record = { ...input, id: crypto.randomUUID() };
  const records = getExportRecords();
  localStorage.setItem(EXPORTS_STORAGE_KEY, JSON.stringify([record, ...records]));
  window.dispatchEvent(new Event(EXPORTS_UPDATED_EVENT));
  return record;
}

export function deleteExportRecord(id: string) {
  const records = getExportRecords().filter((record) => record.id !== id);
  localStorage.setItem(EXPORTS_STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(EXPORTS_UPDATED_EVENT));
}

export function subscribeToExportChanges(callback: () => void) {
  window.addEventListener(EXPORTS_UPDATED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(EXPORTS_UPDATED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
