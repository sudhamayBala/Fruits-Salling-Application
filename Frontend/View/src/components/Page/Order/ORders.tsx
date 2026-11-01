
import { useEffect, useState } from "react";
import { fetchProducts } from "../../../connection";

type Product = {
  id: number | string;
  image_url?: string | null;
  name?: string;
  category_id?: string | number;
  category?: { id?: string | number; name?: string };
  category_name?: string;
  price?: number | string;
};

function Products({ selectedCategory }: { selectedCategory: string | number }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await fetchProducts();
        setProducts(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load products";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter(
          (product) =>
            product.category_id === selectedCategory ||
            product.category?.id === selectedCategory
        );

  if (loading) return <p>Loading products...</p>;
  if (error) return <p>{error}</p>;

  return (
    <section className="products-section">
      <h2>
        {selectedCategory === "all"
          ? "All Products"
          : "Selected Category Products"}
      </h2>

      {filteredProducts.length === 0 ? (
        <p>No products found in this category.</p>
      ) : (
        <div className="products-grid">
          {filteredProducts.map((product) => (
            <article className="product-card" key={product.id}>
              <img
                src={
                  product.image_url ||
                  "https://placehold.co/300x200?text=Product"
                }
                alt={product.name}
                className="product-image"
              />

              <div className="product-info">
                <h3>{product.name}</h3>

                <p className="product-category-name">
                  {product.category?.name ||
                    product.category_name ||
                    "Product"}
                </p>

                <p className="product-price">
                  ₹{Number(product.price).toLocaleString("en-IN")}
                </p>

                <button
                  type="button"
                  className="view-product-btn"
                  onClick={() =>
                    console.log("Selected product:", product.id)
                  }
                >
                  View Product
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default Products;
