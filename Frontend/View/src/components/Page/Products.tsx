import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchProducts } from "../../connection";
import type { Product } from "../../connection";
import { addToCart } from "../../services/cart";
import "../../styles/page/Products.css";

function productImageFallback(name: string): string {
  const normalizedName = name.toLowerCase();
  if (normalizedName.includes("pineapple") || normalizedName.includes("pine apple")) return "🍍";
  if (normalizedName.includes("tomato")) return "🍅";
  if (normalizedName.includes("potato")) return "🥔";
  if (normalizedName.includes("orange")) return "🍊";
  if (normalizedName.includes("apple")) return "🍎";
  if (normalizedName.includes("banana")) return "🍌";
  if (normalizedName.includes("grape")) return "🍇";
  if (normalizedName.includes("mango")) return "🥭";
  return "🍊";
}

function ProductImage({ product }: { product: Product }) {
  const [failed, setFailed] = useState(false);

  if (product.image_url && !failed) {
    return (
      <img
        className="catalog-product-image"
        src={product.image_url}
        alt={product.name}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className="catalog-image-placeholder"
      role="img"
      aria-label={`Image unavailable for ${product.name}`}
    >
      <span className="catalog-image-placeholder-icon" aria-hidden="true">
        {productImageFallback(product.name)}
      </span>
      <span className="catalog-image-placeholder-label">Image unavailable</span>
    </div>
  );
}

function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    async function loadProducts() {
      try {
        const catalog = await fetchProducts();
        if (active) setProducts(catalog.filter((product) => product.is_active));
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

    void loadProducts();
    return () => {
      active = false;
    };
  }, []);

  function handleAddToCart(product: Product) {
    setError("");
    setNotice("");
    try {
      addToCart(product);
      setNotice(`${product.name} added to your cart.`);
    } catch (addError) {
      setError(
        addError instanceof Error ? addError.message : "Unable to add product to cart.",
      );
    }
  }

  return (
    <main className="catalog-page">
      <header className="catalog-header">
        <div>
          <p className="catalog-eyebrow">Fresh selection</p>
          <h1>Our products</h1>
          <p>Explore the catalog and add products to your cart.</p>
        </div>
        <Link className="catalog-cart-link" to="/cart">View cart</Link>
      </header>

      {error && <p className="catalog-feedback catalog-error" role="alert">{error}</p>}
      {notice && <p className="catalog-feedback catalog-notice" role="status">{notice}</p>}
      {loading ? (
        <p className="catalog-empty">Loading products...</p>
      ) : products.length === 0 ? (
        <p className="catalog-empty">No products are currently available.</p>
      ) : (
        <div className="catalog-grid">
          {products.map((product) => (
            <article className="catalog-card" key={product.id}>
              <ProductImage key={`${product.id}:${product.image_url}`} product={product} />
              <div className="catalog-product-info">
                <p className="catalog-category">
                  {product.category?.name || product.category_name || "Product"}
                </p>
                <h2>{product.name}</h2>
                {product.description && <p className="catalog-description">{product.description}</p>}
                <p className="catalog-price">
                  ₹{Number(product.price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  <span> / {product.unit}</span>
                </p>
                <p className="catalog-stock">
                  {product.stock_quantity > 0
                    ? `${product.stock_quantity} ${product.unit} available`
                    : "Out of stock"}
                </p>
                <button
                  className="catalog-add-button"
                  type="button"
                  disabled={product.stock_quantity < 1}
                  onClick={() => handleAddToCart(product)}
                >
                  {product.stock_quantity > 0 ? "Add to cart" : "Unavailable"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

export default Products;
