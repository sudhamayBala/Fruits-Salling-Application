
import { connection } from "./config";
import { requestJson } from "./http";

export type Product = {
  id: string;
  name: string;
  description: string | null;
  category_id: string;
  category_name: string;
  category: { id: string; name: string };
  price: string | number;
  cost_price?: string | number | null;
  unit: string;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
};

export type ProductInput = {
  name: string;
  description: string | null;
  category: string;
  price: number;
  cost_price: number;
  unit: string;
  stock_quantity: number;
  image_url: string | null;
  is_active: boolean;
};

export type Category = {
  id: string;
  name: string;
};

export type OrderInput = {
  delivery_address: string;
  items: Array<{ product_id: string; quantity: number }>;
};

export type CreatedOrder = {
  order_id: string;
  customer_id: string;
  status: "pending" | "successful" | "cancelled" | "return_requested" | "returned";
  total_amount: string | number;
  delivery_address: string;
};

export type ManagedOrder = {
  order_id: string;
  customer_id: string;
  status: "pending" | "successful" | "cancelled" | "return_requested" | "returned";
  total_amount: string | number;
  delivery_address: string;
  created_at: string;
  updated_at: string;
  items: Array<{
    order_item_id: string;
    product_id: string | null;
    product_name: string;
    product_price: string | number;
    quantity: number;
    subtotal: string | number;
    fulfillment_status: "pending" | "delivered" | "cancelled" | "returned";
    product_feedback: string;
    distributor_feedback: string;
  }>;
};

export type BulkOrderInput = {
  contact_name: string;
  email: string;
  phone: string;
  company_name?: string | null;
  product_name: string;
  quantity: number;
  message?: string | null;
};

export type CreatedBulkOrder = {
  bulk_order_id: string;
  message: string;
};

function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return requestJson<T>(
    `${connection.fruitApiBaseUrl}${path}`,
    { ...options, headers },
    "Product request failed",
  );
}

function adminHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

export function fetchProducts(): Promise<Product[]> {
  return request<Product[]>("/products");
}

export function fetchCategories(): Promise<Category[]> {
  return request<Category[]>("/categories");
}

export function fetchManagedProducts(token: string): Promise<Product[]> {
  return request<Product[]>("/products/manage", {
    headers: adminHeaders(token),
  });
}

export function fetchManagedOrders(token: string): Promise<ManagedOrder[]> {
  return request<ManagedOrder[]>("/orders/manage", {
    headers: adminHeaders(token),
  });
}

export function fetchCustomerOrders(token: string): Promise<ManagedOrder[]> {
  return request<ManagedOrder[]>("/orders", {
    headers: adminHeaders(token),
  });
}

export function updateManagedOrderStatus(
  token: string,
  orderId: string,
  status: "pending" | "successful" | "cancelled" | "returned",
): Promise<ManagedOrder> {
  return request<ManagedOrder>(`/orders/${encodeURIComponent(orderId)}/status`, {
    method: "PATCH",
    headers: adminHeaders(token),
    body: JSON.stringify({ status }),
  });
}

export function cancelCustomerOrder(
  token: string,
  orderId: string,
): Promise<ManagedOrder> {
  return request<ManagedOrder>(`/orders/${encodeURIComponent(orderId)}/cancel`, {
    method: "PATCH",
    headers: adminHeaders(token),
  });
}

export function requestCustomerOrderReturn(
  token: string,
  orderId: string,
): Promise<ManagedOrder> {
  return request<ManagedOrder>(`/orders/${encodeURIComponent(orderId)}/return`, {
    method: "PATCH",
    headers: adminHeaders(token),
  });
}

export function saveOrderFeedback(
  token: string,
  orderId: string,
  itemId: string,
  data: { product_feedback: string; distributor_feedback: string },
): Promise<ManagedOrder> {
  return request<ManagedOrder>(
    `/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/feedback`,
    {
      method: "PUT",
      headers: adminHeaders(token),
      body: JSON.stringify(data),
    },
  );
}

export function createProduct(
  token: string,
  data: ProductInput,
): Promise<Product> {
  return request<Product>("/products", {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(data),
  });
}

export function uploadProductImage(
  token: string,
  image: File,
): Promise<{ image_url: string }> {
  return request<{ image_url: string }>("/product-images", {
    method: "POST",
    headers: {
      ...adminHeaders(token),
      "Content-Type": image.type,
    },
    body: image,
  });
}

export function updateProduct(
  token: string,
  productId: string,
  data: ProductInput,
): Promise<Product> {
  return request<Product>(`/products/${encodeURIComponent(productId)}`, {
    method: "PUT",
    headers: adminHeaders(token),
    body: JSON.stringify(data),
  });
}

export function deactivateProduct(
  token: string,
  productId: string,
): Promise<void> {
  return request<void>(`/products/${encodeURIComponent(productId)}`, {
    method: "DELETE",
    headers: adminHeaders(token),
  });
}

export function createOrder(
  token: string,
  data: OrderInput,
): Promise<CreatedOrder> {
  return request<CreatedOrder>("/orders", {
    method: "POST",
    headers: adminHeaders(token),
    body: JSON.stringify(data),
  });
}

export function createBulkOrder(data: BulkOrderInput): Promise<CreatedBulkOrder> {
  return request<CreatedBulkOrder>("/bulk-orders", {
    method: "POST",
    body: JSON.stringify(data),
  });
}
