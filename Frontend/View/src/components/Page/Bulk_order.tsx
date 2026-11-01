import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { createBulkOrder, fetchProducts } from "../../connection";
import type { CreatedBulkOrder, Product } from "../../connection";
import "../../styles/page/BulkOrder.css";

const MAX_BULK_QUANTITY = 1000;

function Bulk_order() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<CreatedBulkOrder | null>(null);

  useEffect(() => {
    let active = true;
    async function loadCatalog() {
      try {
        const catalog = await fetchProducts();
        if (active) setProducts(catalog.filter((item) => item.is_active));
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load products.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCatalog();
    return () => {
      active = false;
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const quantity = Number(data.get("quantity"));
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_BULK_QUANTITY) {
      setError(`Quantity must be between 1 and ${MAX_BULK_QUANTITY}.`);
      return;
    }
    const product = products.find((item) => item.id === String(data.get("productId")));
    if (!product) {
      setError("Select a product from the catalog.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await createBulkOrder({
        contact_name: String(data.get("contactName") ?? "").trim(),
        email: String(data.get("email") ?? "").trim(),
        phone: String(data.get("phone") ?? "").trim(),
        company_name: String(data.get("companyName") ?? "").trim() || null,
        product_name: product.name,
        quantity,
        message: [
          `Product ID: ${product.id}`,
          `Delivery location: ${String(data.get("deliveryLocation") ?? "").trim()}`,
          String(data.get("message") ?? "").trim(),
        ].filter(Boolean).join("\n"),
      });
      setResult(response);
      form.reset();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to submit bulk order.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <main className="bulk-order-page">
        <section className="bulk-order-result" role="status">
          <span className="bulk-order-success-mark" aria-hidden="true">✓</span>
          <p className="bulk-eyebrow">Request received</p>
          <h1>Your bulk order request is on its way.</h1>
          <p>Our team will contact you to confirm availability and delivery details.</p>
          <p className="bulk-order-reference">Request ID: {result.bulk_order_id}</p>
          <div className="bulk-result-links">
            <button type="button" className="bulk-secondary-button" onClick={() => setResult(null)}>
              Submit another request
            </button>
            <Link className="bulk-primary-link" to="/products">Browse products</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="bulk-order-page">
      <header className="bulk-order-header">
        <p className="bulk-eyebrow">For larger requirements</p>
        <h1>Bulk order enquiry</h1>
        <p>Tell us what you need and our team will follow up with availability and delivery details.</p>
      </header>

      <form className="bulk-order-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Contact name
          <input name="contactName" minLength={2} maxLength={120} autoComplete="name" required />
        </label>
        <label>
          Email
          <input name="email" type="email" maxLength={254} autoComplete="email" required />
        </label>
        <label>
          Phone number
          <input name="phone" type="tel" minLength={5} maxLength={32} autoComplete="tel" required />
        </label>
        <label>
          Company name (optional)
          <input name="companyName" maxLength={150} autoComplete="organization" />
        </label>
        <label>
          Product
          <select name="productId" defaultValue="" required disabled={loading || products.length === 0}>
            <option value="" disabled>
              {loading ? "Loading products..." : "Select a product"}
            </option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} — ₹{Number(product.price).toLocaleString("en-IN")} / {product.unit}
              </option>
            ))}
          </select>
        </label>
        <label>
          Quantity
          <input
            name="quantity"
            type="number"
            min="1"
            max={MAX_BULK_QUANTITY}
            step="1"
            required
          />
          <span className="bulk-field-help">Maximum order quantity: {MAX_BULK_QUANTITY} units.</span>
        </label>
        <label className="bulk-field-wide">
          Delivery location
          <textarea
            name="deliveryLocation"
            rows={2}
            minLength={5}
            maxLength={500}
            placeholder="Full delivery address, city, state, and postal code"
            required
          />
        </label>
        <label className="bulk-field-wide">
          Additional details (optional)
          <textarea name="message" rows={3} maxLength={2000} />
        </label>
        {error && <p className="bulk-error bulk-field-wide" role="alert">{error}</p>}
        {!loading && products.length === 0 && (
          <p className="bulk-error bulk-field-wide" role="alert">
            No products are currently available to order.
          </p>
        )}
        <div className="bulk-form-actions bulk-field-wide">
          <button
            className="bulk-primary-button"
            type="submit"
            disabled={submitting || loading || products.length === 0}
          >
            {submitting ? "Submitting..." : "Send bulk order request"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default Bulk_order;
