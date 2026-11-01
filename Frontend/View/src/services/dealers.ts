const DEALERS_STORAGE_KEY = "fruit_house_dealers";
const DEALERS_UPDATED_EVENT = "fruit-house-dealers-updated";

export type Dealer = {
  id: string;
  name: string;
  distributorName?: string;
  distributorContractNumber?: string;
  contractNumber: string;
  place?: string;
  distributedProduct?: string;
  email: string;
  phone?: string;
  responsibility: string;
};

function isDealer(value: unknown): value is Dealer {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value &&
    typeof value.id === "string" &&
    "name" in value &&
    typeof value.name === "string" &&
    (!("distributorName" in value) ||
      typeof value.distributorName === "string") &&
    (!("distributorContractNumber" in value) ||
      typeof value.distributorContractNumber === "string") &&
    "contractNumber" in value &&
    typeof value.contractNumber === "string" &&
    (!("place" in value) || typeof value.place === "string") &&
    (!("distributedProduct" in value) ||
      typeof value.distributedProduct === "string") &&
    "email" in value &&
    typeof value.email === "string" &&
    (!("phone" in value) || typeof value.phone === "string") &&
    "responsibility" in value &&
    typeof value.responsibility === "string"
  );
}

export function getDealers(): Dealer[] {
  const stored = localStorage.getItem(DEALERS_STORAGE_KEY);
  if (!stored) return [];

  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed) || !parsed.every(isDealer)) {
    throw new Error("Saved dealer data is invalid. Please contact support.");
  }
  return parsed;
}

function saveDealers(dealers: Dealer[]) {
  localStorage.setItem(DEALERS_STORAGE_KEY, JSON.stringify(dealers));
  window.dispatchEvent(new Event(DEALERS_UPDATED_EVENT));
}

export function addDealer(
  dealer: Omit<Dealer, "id">,
): Dealer {
  const dealers = getDealers();
  if (
    dealers.some(
      (existing) =>
        existing.contractNumber.toLowerCase() ===
        dealer.contractNumber.toLowerCase(),
    )
  ) {
    throw new Error("A dealer with this contract number already exists.");
  }
  if (
    dealer.distributorContractNumber &&
    dealers.some(
      (existing) =>
        existing.distributorContractNumber?.toLowerCase() ===
        dealer.distributorContractNumber?.toLowerCase(),
    )
  ) {
    throw new Error("A distributor with this contract number already exists.");
  }

  const created = { ...dealer, id: crypto.randomUUID() };
  saveDealers([created, ...dealers]);
  return created;
}

export function removeDealer(id: string) {
  saveDealers(getDealers().filter((dealer) => dealer.id !== id));
}

export function subscribeToDealerChanges(callback: () => void) {
  window.addEventListener(DEALERS_UPDATED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(DEALERS_UPDATED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
