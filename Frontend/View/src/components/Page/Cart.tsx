import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { createOrder } from "../../connection";
import {
  clearCart,
  getCartItems,
  updateCartQuantity,
} from "../../services/cart";
import type { CartItem } from "../../services/cart";
import { getAccessToken } from "../../connection";
import type { CreatedOrder } from "../../connection";
import "../../styles/page/Cart.css";

function Cart() {
  const [initialState] = useState(() => {
    try {
      return { items: getCartItems(), error: "" };
    } catch (loadError) {
      return {
        items: [],
        error: loadError instanceof Error ? loadError.message : "Unable to load your cart.",
      };
    }
  });
  const [items, setItems] = useState<CartItem[]>(initialState.items);
  const [error, setError] = useState(initialState.error);
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<CreatedOrder | null>(null);

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function changeQuantity(item: CartItem, quantity: number) {
    setError("");
    try {
      if (quantity > item.stockQuantity) {
        setError(`Only ${item.stockQuantity} ${item.unit} of ${item.name} are available.`);
        return;
      }
      setItems(updateCartQuantity(item.productId, quantity));
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : "Unable to update cart.",
      );
    }
  }

  async function handleOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const token = getAccessToken();
    if (!token) {
      setError("Please log in before placing your order.");
      return;
    }
    if (items.length === 0) {
      setError("Your cart is empty.");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const address = [
      String(formData.get("address") ?? "").trim(),
      String(formData.get("city") ?? "").trim(),
      String(formData.get("state") ?? "").trim(),
      String(formData.get("postalCode") ?? "").trim(),
    ].filter(Boolean).join(", ");

    setSubmitting(true);
    try {
      const order = await createOrder(token, {
        delivery_address: address,
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
        })),
      });
      clearCart();
      setItems([]);
      setCreatedOrder(order);
    } catch (orderError) {
      setError(
        orderError instanceof Error ? orderError.message : "Unable to place your order.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (createdOrder) {
    return (
      <main className="cart-page">
        <section className="cart-order-success" role="status">
          <span className="cart-success-mark" aria-hidden="true">✓</span>
          <p className="cart-eyebrow">Order received</p>
          <h1>Thank you for your order!</h1>
          <p>Your order has been placed and is pending confirmation.</p>
          <dl>
            <div><dt>Order number</dt><dd>{createdOrder.order_id}</dd></div>
            <div>
              <dt>Total</dt>
              <dd>₹{Number(createdOrder.total_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</dd>
            </div>
            <div><dt>Delivery location</dt><dd>{createdOrder.delivery_address}</dd></div>
          </dl>
          <Link className="cart-primary-link" to="/products">Continue shopping</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <header className="cart-header">
        <p className="cart-eyebrow">Your selection</p>
        <h1>Shopping cart</h1>
        <p>Review your products, choose quantities, and enter a delivery location.</p>
      </header>

      {error && <p className="cart-error" role="alert">{error}</p>}
      {items.length === 0 ? (
        <section className="cart-empty">
          <span aria-hidden="true">🛒</span>
          <h2>Your cart is empty</h2>
          <p>Explore our products and add something fresh to your cart.</p>
          <Link className="cart-primary-link" to="/products">Browse products</Link>
        </section>
      ) : (
        <>
          <div className="cart-table-scroll">
            <table className="cart-table">
              <thead>
                <tr>
                  <th scope="col">Product ID</th>
                  <th scope="col">Product name</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Product price</th>
                  <th scope="col">Total price</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.productId}>
                    <td>{item.productId}</td>
                    <td>
                      <div className="cart-product">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt="" loading="lazy" />
                        ) : (
                          <span className="cart-product-placeholder" aria-hidden="true">🍊</span>
                        )}
                        <span>{item.name}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cart-quantity">
                        <button
                          type="button"
                          aria-label={`Decrease ${item.name} quantity`}
                          onClick={() => changeQuantity(item, item.quantity - 1)}
                        >
                          −
                        </button>
                        <span aria-live="polite">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Increase ${item.name} quantity`}
                          disabled={item.quantity >= item.stockQuantity}
                          onClick={() => changeQuantity(item, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <span className="cart-stock-note">Available: {item.stockQuantity}</span>
                    </td>
                    <td>₹{item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })} / {item.unit}</td>
                    <td className="cart-line-total">
                      ₹{(item.price * item.quantity).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={4} scope="row">Grand total</th>
                  <td>₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <form className="cart-checkout" onSubmit={handleOrder}>
            <div className="cart-checkout-heading">
              <p className="cart-eyebrow">Delivery details</p>
              <h2>Where should we deliver?</h2>
              <p>Enter a complete delivery address so your order can reach you.</p>
            </div>
            <div className="cart-address-grid">
              <label className="cart-address-wide">
                Street address / building / area
                <textarea
                  name="address"
                  rows={3}
                  maxLength={1500}
                  autoComplete="street-address"
                  placeholder="House or building, street, area, landmark"
                  required
                />
              </label>
              <label>
                City / town
                <input name="city" maxLength={100} autoComplete="address-level2" required />
              </label>
              <label>
                State
                <input name="state" maxLength={100} autoComplete="address-level1" required />
              </label>
              <label>
                PIN / postal code
                <input name="postalCode" maxLength={20} autoComplete="postal-code" required />
              </label>
            </div>
            {!getAccessToken() && (
              <p className="cart-login-note">
                You need to <Link to="/login">log in</Link> before you can place an order.
              </p>
            )}
            <div className="cart-order-actions">
              <p>Order total <strong>₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</strong></p>
              <button
                className="cart-primary-button"
                type="submit"
                disabled={submitting || items.length === 0}
              >
                {submitting ? "Placing order..." : "Place order"}
              </button>
            </div>
          </form>
        </>
      )}
    </main>
  );
}

export default Cart;
