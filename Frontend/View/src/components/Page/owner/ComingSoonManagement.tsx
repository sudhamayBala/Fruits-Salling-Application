import { useState } from "react";
import type { Product } from "../../../connection";
import {
  getComingSoonProductIds,
  setProductComingSoon,
} from "../../../services/comingSoon";
import "../../../styles/page/Gallery.css";

function ComingSoonManagement({ products }: { products: Product[] }) {
  const [initialState] = useState(() => {
    try {
      return { ids: getComingSoonProductIds(), error: "" };
    } catch (loadError) {
      return {
        ids: [],
        error:
          loadError instanceof Error
            ? loadError.message
            : "Unable to load coming-soon products.",
      };
    }
  });
  const [comingSoonIds, setComingSoonIds] = useState(initialState.ids);
  const [error, setError] = useState(initialState.error);

  function toggleProduct(productId: string) {
    const shouldMarkComingSoon = !comingSoonIds.includes(productId);
    setError("");
    try {
      setProductComingSoon(productId, shouldMarkComingSoon);
      setComingSoonIds((current) =>
        shouldMarkComingSoon
          ? [...current, productId]
          : current.filter((id) => id !== productId),
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to update coming-soon status.",
      );
    }
  }

  return (
    <section className="owner-panel coming-soon-management">
      <div className="owner-panel-heading">
        <div>
          <h2>Coming soon products</h2>
          <p>Choose which published products should be highlighted in the gallery.</p>
        </div>
      </div>
      {error && <p className="owner-error" role="alert">{error}</p>}
      {products.filter((product) => product.is_active).length === 0 ? (
        <p className="owner-empty">Publish a product to mark it as coming soon.</p>
      ) : (
        <div className="coming-soon-list">
          {products
            .filter((product) => product.is_active)
            .map((product) => {
              const isComingSoon = comingSoonIds.includes(product.id);
              return (
                <div className="coming-soon-item" key={product.id}>
                  <span>{product.name}</span>
                  <button
                    className={
                      isComingSoon
                        ? "owner-secondary-link coming-soon-toggle"
                        : "owner-primary-button coming-soon-toggle"
                    }
                    type="button"
                    aria-pressed={isComingSoon}
                    onClick={() => toggleProduct(product.id)}
                  >
                    {isComingSoon ? "Remove coming soon" : "Mark coming soon"}
                  </button>
                </div>
              );
            })}
        </div>
      )}
    </section>
  );
}

export default ComingSoonManagement;
