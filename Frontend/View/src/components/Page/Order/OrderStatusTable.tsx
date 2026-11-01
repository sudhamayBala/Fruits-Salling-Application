import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  cancelCustomerOrder,
  fetchCustomerOrders,
  requestCustomerOrderReturn,
  saveOrderFeedback,
} from "../../../connection";
import type { ManagedOrder } from "../../../connection";
import { getAccessToken } from "../../../connection";
import "../../../styles/page/OrderStatus.css";

type Props = {
  status: "pending" | "successful" | "cancelled";
  title: string;
  description: string;
  feedbackEnabled?: boolean;
};

function statusLabel(status: ManagedOrder["status"]): string {
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

function OrderStatusTable({
  status,
  title,
  description,
  feedbackEnabled = false,
}: Props) {
  const [orders, setOrders] = useState<ManagedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  const refreshOrders = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setError("Please sign in to view your orders.");
      setLoading(false);
      return;
    }
    try {
      setOrders(await fetchCustomerOrders(token));
      setError("");
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load your orders.",
      );
    } finally {
      setLoading(false);
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

  const visibleOrders = orders.filter((order) => {
    if (status === "successful") {
      return ["successful", "return_requested", "returned"].includes(order.status);
    }
    return order.status === status;
  });

  async function updateOrder(
    orderId: string,
    action: "cancel" | "return",
  ) {
    const token = getAccessToken();
    if (!token) {
      setError("Please sign in again to update your order.");
      return;
    }
    setUpdatingOrderId(orderId);
    setError("");
    setNotice("");
    try {
      const updated = action === "cancel"
        ? await cancelCustomerOrder(token, orderId)
        : await requestCustomerOrderReturn(token, orderId);
      setOrders((current) =>
        current.map((order) => order.order_id === orderId ? updated : order),
      );
      setNotice(action === "cancel"
        ? "Your order was cancelled and the inventory was restored."
        : "Your return request was sent to the owner for confirmation.");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to update your order.",
      );
      await refreshOrders();
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function submitFeedback(
    event: FormEvent<HTMLFormElement>,
    order: ManagedOrder,
    itemId: string,
  ) {
    event.preventDefault();
    const token = getAccessToken();
    if (!token) {
      setError("Please sign in again to save feedback.");
      return;
    }
    const data = new FormData(event.currentTarget);
    setError("");
    setNotice("");
    try {
      const updated = await saveOrderFeedback(token, order.order_id, itemId, {
        product_feedback: String(data.get("productFeedback") ?? "").trim(),
        distributor_feedback: String(data.get("distributorFeedback") ?? "").trim(),
      });
      setOrders((current) =>
        current.map((currentOrder) =>
          currentOrder.order_id === order.order_id ? updated : currentOrder,
        ),
      );
      setNotice("Thank you. Your feedback has been saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to save feedback.",
      );
    }
  }

  return (
    <main className="order-status-page">
      <header className="order-status-header">
        <p className="order-status-eyebrow">Your orders</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </header>
      {error && <p className="order-status-error" role="alert">{error}</p>}
      {notice && <p className="order-status-notice" role="status">{notice}</p>}
      {loading ? (
        <p className="order-status-empty">Loading your orders...</p>
      ) : visibleOrders.length === 0 ? (
        <p className="order-status-empty">No {title.toLocaleLowerCase()} to display.</p>
      ) : (
        <div className="order-status-table-scroll">
          <table className="order-status-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Quantity</th>
                <th scope="col">Order date</th>
                <th scope="col">Order ID</th>
                <th scope="col">Status</th>
                <th scope="col">Action / feedback</th>
              </tr>
            </thead>
            <tbody>
              {visibleOrders.flatMap((order) =>
                order.items.map((item) => (
                  <tr key={item.order_item_id}>
                    <td>{item.product_name}</td>
                    <td>{item.quantity}</td>
                    <td>{new Date(order.created_at).toLocaleDateString()}</td>
                    <td>{order.order_id}</td>
                    <td>{statusLabel(order.status)}</td>
                    <td className="order-feedback-cell">
                      {order.status === "pending" && (
                        <button
                          className="order-feedback-button"
                          type="button"
                          disabled={updatingOrderId === order.order_id}
                          onClick={() => void updateOrder(order.order_id, "cancel")}
                        >
                          {updatingOrderId === order.order_id ? "Updating..." : "Cancel order"}
                        </button>
                      )}
                      {order.status === "successful" && (
                        <div>
                          <button
                            className="order-feedback-button"
                            type="button"
                            disabled={updatingOrderId === order.order_id}
                            onClick={() => void updateOrder(order.order_id, "return")}
                          >
                            {updatingOrderId === order.order_id ? "Updating..." : "Request return"}
                          </button>
                          {feedbackEnabled && item.fulfillment_status === "delivered" && (
                            <form onSubmit={(event) => void submitFeedback(event, order, item.order_item_id)}>
                              <label>
                                Product feedback
                                <textarea
                                  name="productFeedback"
                                  rows={2}
                                  maxLength={1000}
                                  defaultValue={item.product_feedback}
                                  placeholder="Share your product feedback"
                                  required
                                />
                              </label>
                              <label>
                                Distributor feedback
                                <textarea
                                  name="distributorFeedback"
                                  rows={2}
                                  maxLength={1000}
                                  defaultValue={item.distributor_feedback}
                                  placeholder="Share your distributor feedback"
                                  required
                                />
                              </label>
                              <button className="order-feedback-button" type="submit">
                                Save feedback
                              </button>
                            </form>
                          )}
                        </div>
                      )}
                      {order.status === "return_requested" && <span>Waiting for owner confirmation</span>}
                      {order.status === "returned" && <span>Return confirmed; stock restored</span>}
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="order-status-storage-note">
        Order status is shared with the owner dashboard and updates automatically.
      </p>
    </main>
  );
}

export default OrderStatusTable;
