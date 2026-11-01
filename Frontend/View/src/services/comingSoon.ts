const COMING_SOON_STORAGE_KEY = "fruit_house_coming_soon_products";
const COMING_SOON_UPDATED_EVENT = "fruit-house-coming-soon-updated";

export function getComingSoonProductIds(): string[] {
  const stored = localStorage.getItem(COMING_SOON_STORAGE_KEY);
  if (!stored) return [];

  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed) || !parsed.every((id) => typeof id === "string")) {
    throw new Error("Saved coming-soon product data is invalid.");
  }
  return parsed;
}

export function setProductComingSoon(productId: string, comingSoon: boolean) {
  const productIds = getComingSoonProductIds().filter((id) => id !== productId);
  if (comingSoon) productIds.push(productId);
  localStorage.setItem(COMING_SOON_STORAGE_KEY, JSON.stringify(productIds));
  window.dispatchEvent(new Event(COMING_SOON_UPDATED_EVENT));
}

export function subscribeToComingSoonChanges(callback: () => void) {
  window.addEventListener(COMING_SOON_UPDATED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(COMING_SOON_UPDATED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
