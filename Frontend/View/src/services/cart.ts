import type { Product } from "../connection";

const CART_STORAGE_KEY = "fruit_house_cart";
const CART_UPDATED_EVENT = "fruit-house-cart-updated";

export type CartItem = {
  productId: string;
  name: string;
  price: number;
  unit: string;
  stockQuantity: number;
  imageUrl: string | null;
  quantity: number;
};

function isCartItem(value: unknown): value is CartItem {
  if (typeof value !== "object" || value === null) return false;
  return (
    "productId" in value && typeof value.productId === "string" &&
    "name" in value && typeof value.name === "string" &&
    "price" in value && typeof value.price === "number" &&
    Number.isFinite(value.price) && value.price >= 0 &&
    "unit" in value && typeof value.unit === "string" &&
    "stockQuantity" in value && typeof value.stockQuantity === "number" &&
    Number.isInteger(value.stockQuantity) && value.stockQuantity >= 0 &&
    "imageUrl" in value &&
    (typeof value.imageUrl === "string" || value.imageUrl === null) &&
    "quantity" in value && typeof value.quantity === "number" &&
    Number.isInteger(value.quantity) && value.quantity > 0
  );
}

export function getCartItems(): CartItem[] {
  const saved = localStorage.getItem(CART_STORAGE_KEY);
  if (!saved) return [];
  const parsed: unknown = JSON.parse(saved);
  if (!Array.isArray(parsed) || !parsed.every(isCartItem)) {
    throw new Error("Saved cart data is invalid. Please clear the cart and try again.");
  }
  return parsed;
}

function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event(CART_UPDATED_EVENT));
}

export function addToCart(product: Product): CartItem[] {
  if (!product.is_active) throw new Error("This product is not available.");
  const items = getCartItems();
  const existing = items.find((item) => item.productId === product.id);
  if (existing && existing.quantity >= product.stock_quantity) {
    throw new Error("The requested quantity exceeds available stock.");
  }
  if (!existing && product.stock_quantity < 1) {
    throw new Error("This product is currently out of stock.");
  }

  const productItem: CartItem = {
    productId: product.id,
    name: product.name,
    price: Number(product.price),
    unit: product.unit,
    stockQuantity: product.stock_quantity,
    imageUrl: product.image_url,
    quantity: 1,
  };
  const updated = existing
    ? items.map((item) =>
        item.productId === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item,
      )
    : [productItem, ...items];
  saveCart(updated);
  return updated;
}

export function updateCartQuantity(productId: string, quantity: number) {
  const updated = getCartItems()
    .map((item) =>
      item.productId === productId ? { ...item, quantity } : item,
    )
    .filter((item) => item.quantity > 0);
  saveCart(updated);
  return updated;
}

export function clearCart() {
  saveCart([]);
}

export function subscribeToCartChanges(callback: () => void) {
  window.addEventListener(CART_UPDATED_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CART_UPDATED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}
