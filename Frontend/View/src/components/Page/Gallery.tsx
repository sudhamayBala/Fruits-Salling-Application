import { useEffect, useMemo, useState } from "react";
import { fetchProducts } from "../../connection";
import type { Product } from "../../connection";
import {
  getComingSoonProductIds,
  subscribeToComingSoonChanges,
} from "../../services/comingSoon";
import "../../styles/page/Gallery.css";

function Gallery() {
  const [products, setProducts] = useState<Product[]>([]);
  const [comingSoonIds, setComingSoonIds] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [showComingSoonOnly, setShowComingSoonOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProducts() {
      try {
        const catalog = await fetchProducts();
        if (!active) return;
        setProducts(catalog.filter((product) => product.is_active));
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load the product gallery.",
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    function loadComingSoon() {
      try {
        setComingSoonIds(getComingSoonProductIds());
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load coming-soon product status.",
        );
      }
    }

    void loadProducts();
    loadComingSoon();
    const unsubscribe = subscribeToComingSoonChanges(loadComingSoon);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const categories = useMemo(
    () => [
      "All",
      ...new Set(
        products.map(
          (product) =>
            product.category?.name || product.category_name || "Other",
        ),
      ),
    ],
    [products],
  );

  const visibleProducts = useMemo(
    () =>
      products.filter((product) => {
        const category =
          product.category?.name || product.category_name || "Other";
        const matchesCategory =
          selectedCategory === "All" || category === selectedCategory;
        const matchesComingSoon =
          !showComingSoonOnly || comingSoonIds.includes(product.id);
        return matchesCategory && matchesComingSoon;
      }),
    [comingSoonIds, products, selectedCategory, showComingSoonOnly],
  );

  const groupedProducts = useMemo(() => {
    const groups = new Map<string, Product[]>();
    for (const product of visibleProducts) {
      const category =
        product.category?.name || product.category_name || "Other";
      const group = groups.get(category) ?? [];
      group.push(product);
      groups.set(category, group);
    }
    return [...groups.entries()];
  }, [visibleProducts]);

  return (
    <main className="gallery-page">
      <header className="gallery-header">
        <p className="gallery-eyebrow">From our collection</p>
        <h1>Product gallery</h1>
        <p>Browse product photos organized by category.</p>
      </header>

      <div className="gallery-controls" aria-label="Gallery filters">
        <div className="gallery-category-filters" aria-label="Filter by category">
          {categories.map((category) => (
            <button
              className={
                selectedCategory === category
                  ? "gallery-filter-button gallery-filter-active"
                  : "gallery-filter-button"
              }
              type="button"
              key={category}
              aria-pressed={selectedCategory === category}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
        <button
          className={
            showComingSoonOnly
              ? "gallery-filter-button gallery-coming-soon-toggle gallery-filter-active"
              : "gallery-filter-button gallery-coming-soon-toggle"
          }
          type="button"
          aria-pressed={showComingSoonOnly}
          onClick={() => setShowComingSoonOnly((current) => !current)}
        >
          {showComingSoonOnly ? "Show all products" : "✨ Coming soon"}
        </button>
      </div>

      {loading ? (
        <p className="gallery-message">Loading product photos...</p>
      ) : error ? (
        <p className="gallery-error" role="alert">{error}</p>
      ) : groupedProducts.length === 0 ? (
        <p className="gallery-message">
          {showComingSoonOnly
            ? "No products are currently marked as coming soon."
            : "No products are available in this category yet."}
        </p>
      ) : (
        <div className="gallery-groups">
          {groupedProducts.map(([category, items]) => (
            <section className="gallery-category" key={category}>
              <h2>{category}</h2>
              <div className="gallery-grid">
                {items.map((product) => {
                  const isComingSoon = comingSoonIds.includes(product.id);
                  return (
                    <article
                      className={
                        isComingSoon
                          ? "gallery-card gallery-card-coming-soon"
                          : "gallery-card"
                      }
                      key={product.id}
                    >
                      <div className="gallery-image-wrap">
                        {product.image_url ? (
                          <img
                            className="gallery-image"
                            src={product.image_url}
                            alt={product.name}
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className="gallery-image-missing"
                            role="img"
                            aria-label={`No photo available for ${product.name}`}
                          >
                            <span aria-hidden="true">🍊</span>
                            <span>Photo coming soon</span>
                          </div>
                        )}
                        {isComingSoon && (
                          <span className="gallery-coming-soon-badge">
                            Available soon
                          </span>
                        )}
                      </div>
                      <div className="gallery-card-info">
                        <p className="gallery-card-category">{category}</p>
                        <h3>{product.name}</h3>
                        {product.description && <p>{product.description}</p>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}

export default Gallery;
