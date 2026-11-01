const ORDER_HISTORY_KEY = "fruit_house_order_history";
const ORDER_HISTORY_EVENT = "fruit-house-order-history-updated";

export type TrackedOrderStatus = "pending" | "delivered" | "cancelled";

export type TrackedOrderItem = {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  quantity: number;
  orderedAt: string;
  status: TrackedOrderStatus;
  productFeedback: string;
  distributorFeedback: string;
};

function isTrackedOrderItem(value: unknown): value is TrackedOrderItem {
  if (typeof value !== "object" || value === null) return false;
  return (
    "id" in value && typeof value.id === "string" &&
    "orderId" in value && typeof value.orderId === "string" &&
    "productId" in value && typeof value.productId === "string" &&
    "productName" in value && typeof value.productName === "string" &&
    "imageUrl" in value &&
    (typeof value.imageUrl === "string" || value.imageUrl === null) &&
    "quantity" in value && typeof value.quantity === "number" &&
    "orderedAt" in value && typeof value.orderedAt === "string" &&
    "status" in value &&
    (value.status === "pending" || value.status === "delivered" || value.status === "cancelled") &&
    "productFeedback" in value && typeof value.productFeedback === "string" &&
    "distributorFeedback" in value && typeof value.distributorFeedback === "string"
  );
}

export function getOrderHistory(): TrackedOrderItem[] {
  const stored = localStorage.getItem(ORDER_HISTORY_KEY);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed) || !parsed.every(isTrackedOrderItem)) {
    throw new Error("Saved order history is invalid.");
  }
  return parsed;
}

function saveOrderHistory(items: TrackedOrderItem[]) {
  localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(ORDER_HISTORY_EVENT));
}

export function addTrackedOrder(
  orderId: string,
  products: Array<{
    productId: string;
    productName: string;
    imageUrl: string | null;
    quantity: number;
  }>,
) {
  const existing = getOrderHistory();
  const added = products.map((product) => ({
    ...product,
    id: crypto.randomUUID(),
    orderId,
    orderedAt: new Date().toISOString(),
    status: "pending" as const,
    productFeedback: "",
    distributorFeedback: "",
  }));
  saveOrderHistory([...added, ...existing]);
}

export function updateTrackedOrderStatus(
  itemId: string,
  status: TrackedOrderStatus,
) {
  saveOrderHistory(
    getOrderHistory().map((item) =>
      item.id === itemId ? { ...item, status } : item,
    ),
  );
}

export function saveOrderFeedback(
  itemId: string,
  feedback: { productFeedback: string; distributorFeedback: string },
) {
  saveOrderHistory(
    getOrderHistory().map((item) =>
      item.id === itemId ? { ...item, ...feedback } : item,
    ),
  );
}

export function subscribeToOrderHistory(callback: () => void) {
  window.addEventListener(ORDER_HISTORY_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(ORDER_HISTORY_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
