
import { useEffect, useState } from "react";
import { fetchCategories } from "../../../connection";

type Category = {
  id: number | string;
  name: string;
};

function ProductCategory({
  selectedCategory,
  onSelectCategory,
}: {
  selectedCategory: string | number;
  onSelectCategory: (category: string | number) => void;
}) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadCategories() {
      try {
        const data = await fetchCategories();
        setCategories(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load categories";
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    loadCategories();
  }, []);

  if (loading) return <p>Loading categories...</p>;
  if (error) return <p>{error}</p>;

  return (
    <section className="category-section">
      <h2>Shop by Category</h2>

      <div className="category-buttons">
        <button
          type="button"
          className={
            selectedCategory === "all"
              ? "category-btn active"
              : "category-btn"
          }
          onClick={() => onSelectCategory("all")}
        >
          All Products
        </button>

        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={
              selectedCategory === category.id
                ? "category-btn active"
                : "category-btn"
            }
            onClick={() => onSelectCategory(category.id)}
          >
            {category.name}
          </button>
        ))}
      </div>
    </section>
  );
}

export default ProductCategory;
