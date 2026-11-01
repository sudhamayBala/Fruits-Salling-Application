const PACKAGING_STORAGE_KEY = "fruit_house_packaging";
const PACKAGING_UPDATED_EVENT = "fruit-house-packaging-updated";

export type PackagingStatus = "Pending" | "Complete";

export type PackagingRecord = {
  id: string;
  productName: string;
  status: PackagingStatus;
  estimatedCompletionDate: string;
  location: string;
};

function isPackagingRecord(value: unknown): value is PackagingRecord {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "productName" in value &&
    typeof value.productName === "string" &&
    "status" in value &&
    (value.status === "Pending" || value.status === "Complete") &&
    "estimatedCompletionDate" in value &&
    typeof value.estimatedCompletionDate === "string" &&
    "location" in value &&
    typeof value.location === "string"
  );
}

export function getPackagingRecords(): PackagingRecord[] {
  const stored = localStorage.getItem(PACKAGING_STORAGE_KEY);
  if (!stored) return [];

  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed) || !parsed.every(isPackagingRecord)) {
    throw new Error("Saved packaging data is invalid. Please contact support.");
  }
  return parsed;
}

function savePackagingRecords(records: PackagingRecord[]) {
  localStorage.setItem(PACKAGING_STORAGE_KEY, JSON.stringify(records));
  window.dispatchEvent(new Event(PACKAGING_UPDATED_EVENT));
}

export function savePackagingRecord(
  input: Omit<PackagingRecord, "id">,
  existingId?: string,
): PackagingRecord {
  const records = getPackagingRecords();
  const record = {
    ...input,
    id: existingId ?? crypto.randomUUID(),
  };
  const updatedRecords = existingId
    ? records.map((item) => (item.id === existingId ? record : item))
    : [record, ...records];

  if (existingId && !records.some((item) => item.id === existingId)) {
    throw new Error("This packaging record no longer exists. Reload the page.");
  }

  savePackagingRecords(updatedRecords);
  return record;
}

export function deletePackagingRecord(id: string) {
  savePackagingRecords(
    getPackagingRecords().filter((record) => record.id !== id),
  );
}

export function subscribeToPackagingChanges(callback: () => void) {
  window.addEventListener(PACKAGING_UPDATED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(PACKAGING_UPDATED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
