import { useCallback, useEffect, useState } from "react";
import {
  fetchManagedOrders,
  updateManagedOrderStatus,
} from "../../../connection";
import type { ManagedOrder } from "../../../connection";
import { getAccessToken } from "../../../connection";
import "../../../styles/page/OrderStatus.css";

type EditableOrderStatus = "pending" | "successful" | "cancelled" | "returned";

function displayStatus(status: ManagedOrder["status"]): string {
  switch (status) {
    case "successful":
      return "Delivered";
    case "return_requested":
      return "Return requested";
    case "returned":
      return "Returned";
    default:
      return status[0].toLocaleUpperCase() + status.slice(1);
  }
}

function OrderStatusManagement() {
  const [orders, setOrders] = useState<ManagedOrder[]>([]);
  const [error, setError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const refreshOrders = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setError("Please log in again to manage orders.");
      return;
    }
    try {
      setOrders(await fetchManagedOrders(token));
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load current orders.",
      );
    }
  }, []);

  useEffect(() => {
    const initialRefreshId = window.setTimeout(() => void refreshOrders(), 0);
    const intervalId = window.setInterval(() => void refreshOrders(), 5000);
    return () => {
      window.clearTimeout(initialRefreshId);
      window.clearInterval(intervalId);
    };
  }, [refreshOrders]);

  async function setStatus(orderId: string, status: EditableOrderStatus) {
    const token = getAccessToken();
    if (!token) {
      setError("Please log in again to manage orders.");
      return;
    }
    setUpdatingOrderId(orderId);
    setError("");
    try {
      const updated = await updateManagedOrderStatus(token, orderId, status);
      setOrders((current) =>
        current.map((order) => order.order_id === orderId ? updated : order),
      );
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update order status.",
      );
      await refreshOrders();
    } finally {
      setUpdatingOrderId(null);
    }
  }

  return (
    <section className="owner-panel order-status-management">
      <div className="owner-panel-heading">
        <div>
          <h2>Manage order statuses</h2>
          <p>These are live orders shared with the client account and dashboard.</p>
        </div>
      </div>
      {error && <p className="owner-error" role="alert">{error}</p>}
      {orders.length === 0 ? (
        <p className="owner-empty">No customer orders have been placed.</p>
      ) : (
        <div className="owner-table-scroll">
          <table className="order-status-table order-admin-table">
            <thead>
              <tr>
                <th scope="col">Order ID</th>
                <th scope="col">Date</th>
                <th scope="col">Items</th>
                <th scope="col">Total</th>
                <th scope="col">Status</th>
                <th scope="col">Update status</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.order_id}>
                  <td>{order.order_id}</td>
                  <td>{new Date(order.created_at).toLocaleDateString()}</td>
                  <td>{order.items.map((item) => `${item.product_name} × ${item.quantity}`).join(", ")}</td>
                  <td>₹{Number(order.total_amount).toLocaleString("en-IN")}</td>
                  <td>{displayStatus(order.status)}</td>
                  <td>
                    {order.status === "return_requested" ? (
                      <button
                        className="order-feedback-button"
                        type="button"
                        disabled={updatingOrderId === order.order_id}
                        onClick={() => void setStatus(order.order_id, "returned")}
                      >
                        {updatingOrderId === order.order_id ? "Updating..." : "Confirm return"}
                      </button>
                    ) : order.status === "pending" ? (
                      <select
                        aria-label={`Set order status for ${order.order_id}`}
                        value={order.status}
                        disabled={updatingOrderId === order.order_id}
                        onChange={(event) =>
                          event.currentTarget.value === "pending" ||
                          event.currentTarget.value === "successful" ||
                          event.currentTarget.value === "cancelled"
                            ? void setStatus(
                                order.order_id,
                                event.currentTarget.value,
                              )
                            : undefined
                        }
                      >
                        <option value="pending">Pending</option>
                        <option value="successful">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    ) : (
                      <span>
                        {order.status === "successful"
                          ? "Client can request a return"
                          : "No further status changes"}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default OrderStatusManagement;
