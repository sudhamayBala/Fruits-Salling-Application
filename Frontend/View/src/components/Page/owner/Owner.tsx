import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  createProduct,
  deactivateProduct,
  fetchManagedOrders,
  fetchManagedProducts,
  uploadProductImage,
  updateProduct,
} from "../../../connection";
import type {
  CurrentUser,
  ManagedOrder,
  Product,
  ProductInput,
} from "../../../connection";
import { getAccessToken, getCurrentUser } from "../../../connection";
import DealerManagement from "./DealerManagement";
import PackagingManagement from "./PackagingManagement";
import ComingSoonManagement from "./ComingSoonManagement";
import ExportManagement from "./ExportManagement";
import OrderStatusManagement from "./OrderStatusManagement";
import OwnerNavigation, { ownerPages } from "./OwnerNavigation";
import OwnerClientDirectory from "./OwnerClientDirectory";
import OwnerSettings from "./OwnerSettings";
import EmployeeSettings from "./Employee/EmployeeIdManager";
import OwnerAnalytics from "./OwnerAnalytics";
import DirectMessages from "../DirectMessages";
import "../../../styles/page/Owner.css";

type AccessState = "checking" | "signed-out" | "forbidden" | "ready" | "error";

function Owner() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const currentPage =
    ownerPages.find((page) => page.path === pathname) ?? ownerPages[0];
  const isDashboard = currentPage.path === "/owner";
  const [accessState, setAccessState] = useState<AccessState>("checking");
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [dashboardOrders, setDashboardOrders] = useState<ManagedOrder[]>([]);
  const [dashboardOrdersLoaded, setDashboardOrdersLoaded] = useState(false);
  const [dashboardOrdersError, setDashboardOrdersError] = useState("");
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;

    async function checkAccess() {
      if (!getAccessToken()) {
        setAccessState("signed-out");
        return;
      }

      try {
        const currentUser = await getCurrentUser();
        if (!active) return;
        setUser(currentUser);
        if (currentUser.role !== "admin") {
          if (pathname === "/owner/communications") {
            navigate("/client/messages", { replace: true });
            return;
          }
          setAccessState("forbidden");
          return;
        }

        const token = getAccessToken();
        if (!token) {
          setAccessState("signed-out");
          return;
        }
        setLoadingProducts(true);
        const inventory = await fetchManagedProducts(token);
        if (!active) return;
        setProducts(inventory);
        setAccessState("ready");
      } catch (requestError) {
        if (!active) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load the owner dashboard",
        );
        setAccessState("error");
      } finally {
        if (active) setLoadingProducts(false);
      }
    }

    void checkAccess();
    return () => {
      active = false;
    };
  }, [navigate, pathname]);

  useEffect(() => {
    if (!isDashboard || accessState !== "ready") return;
    const token = getAccessToken();
    if (!token) return;
    const activeToken = token;
    let active = true;
    async function refreshDashboardData() {
      try {
        const [loadedOrders, inventory] = await Promise.all([
          fetchManagedOrders(activeToken),
          fetchManagedProducts(activeToken),
        ]);
        if (!active) return;
        setDashboardOrders(loadedOrders);
        setProducts(inventory);
        setDashboardOrdersError("");
      } catch (ordersError) {
        if (!active) return;
        setDashboardOrdersError(
          ordersError instanceof Error
            ? ordersError.message
            : "Unable to refresh dashboard sales and inventory data.",
        );
      } finally {
        if (active) setDashboardOrdersLoaded(true);
      }
    }

    void refreshDashboardData();
    const intervalId = window.setInterval(() => void refreshDashboardData(), 5000);
    return () => {
      active = false;
      window.clearInterval(intervalId);
    };
  }, [accessState, isDashboard]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const selectedImage = formData.get("image");
    const input: ProductInput = {
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim() || null,
      category: String(formData.get("category") ?? "").trim(),
      price: Number(formData.get("price")),
      cost_price: Number(formData.get("cost_price")),
      unit: String(formData.get("unit") ?? "").trim(),
      stock_quantity: Number(formData.get("stock_quantity")),
      image_url: editingProduct?.image_url ?? null,
      is_active: formData.get("is_active") === "on",
    };
    const token = getAccessToken();
    if (!token) {
      setError("Your session has expired. Please log in again.");
      return;
    }

    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (selectedImage instanceof File && selectedImage.size > 0) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(selectedImage.type)) {
          throw new Error("Choose a JPEG, PNG, or WebP product image.");
        }
        if (selectedImage.size > 5 * 1024 * 1024) {
          throw new Error("Product images must be 5 MB or smaller.");
        }
        const uploadedImage = await uploadProductImage(token, selectedImage);
        input.image_url = uploadedImage.image_url;
      } else if (!editingProduct) {
        throw new Error("Choose a product image from your device.");
      }

      if (editingProduct) {
        const updated = await updateProduct(token, editingProduct.id, input);
        setProducts((current) =>
          current.map((product) =>
            product.id === updated.id ? updated : product,
          ),
        );
        setNotice("Product updated.");
      } else {
        const created = await createProduct(token, input);
        setProducts((current) => [created, ...current]);
        setNotice("Product added to the catalog.");
      }
      setEditingProduct(null);
      form.reset();
      navigate("/owner/products");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save product",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(product: Product) {
    if (!window.confirm(`Remove "${product.name}" from the public catalog?`)) {
      return;
    }
    const token = getAccessToken();
    if (!token) {
      setError("Your session has expired. Please log in again.");
      return;
    }

    setError("");
    setNotice("");
    try {
      await deactivateProduct(token, product.id);
      setProducts((current) =>
        current.map((item) =>
          item.id === product.id ? { ...item, is_active: false } : item,
        ),
      );
      if (editingProduct?.id === product.id) setEditingProduct(null);
      setNotice("Product removed from the public catalog.");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to remove product",
      );
    }
  }

  if (accessState === "checking") {
    return <p className="owner-message">Checking owner access...</p>;
  }

  if (accessState === "signed-out") {
    return (
      <main className="owner-access">
        <h1>Owner dashboard</h1>
        <p>Log in with an administrator account to manage products.</p>
        <Link className="owner-primary-link" to="/login">
          Go to login
        </Link>
      </main>
    );
  }

  if (accessState === "forbidden") {
    return (
      <main className="owner-access">
        <h1>Administrator access required</h1>
        <p>
          This dashboard is only available to owner and administrator accounts.
        </p>
        {user && <p>Signed in as {user.email}</p>}
      </main>
    );
  }

  if (accessState === "error") {
    return (
      <main className="owner-access">
        <h1>Owner dashboard unavailable</h1>
        <p role="alert">{error}</p>
        <Link className="owner-primary-link" to="/login">
          Return to login
        </Link>
      </main>
    );
  }

  const activeCount = products.filter((product) => product.is_active).length;
  const accessToken = getAccessToken();

  return (
    <main className={`owner-dashboard${isDashboard ? " owner-dashboard-home" : ""}`}>
      <header className="owner-header">
        <div>
          <p className="owner-eyebrow">Owner workspace</p>
          <h1>{currentPage.title}</h1>
          <p>
            {isDashboard
              ? `Welcome, ${user?.full_name}. Choose a work area to get started.`
              : `Welcome, ${user?.full_name}. Manage ${currentPage.title.toLowerCase()} here.`}
          </p>
        </div>
        <Link className="owner-secondary-link" to="/products">
          View public catalog
        </Link>
        <Link
          className="owner-secondary-link owner-notification-link"
          to="/owner/communications"
          aria-label="Dealer messages and calls"
        >
          Messages
        </Link>
      </header>

      <OwnerNavigation />

      {isDashboard && (
        <section className="owner-stats" aria-label="Catalog summary">
        <div className="owner-stat">
          <span>Total products</span>
          <strong>{products.length}</strong>
        </div>
        <div className="owner-stat">
          <span>Published</span>
          <strong>{activeCount}</strong>
        </div>
        <div className="owner-stat">
          <span>Unpublished</span>
          <strong>{products.length - activeCount}</strong>
        </div>
        </section>
      )}

      {isDashboard && (
        <OwnerAnalytics
          products={products}
          orders={dashboardOrders}
          ordersLoading={!dashboardOrdersLoaded}
          ordersError={dashboardOrdersError}
        />
      )}

      {(currentPage.path === "/owner/products/new" ||
        (currentPage.path === "/owner/products" && editingProduct)) && (
      <section className="owner-panel owner-anchor-section" id="create-product">
        <div className="owner-panel-heading">
          <div>
            <h2>{editingProduct ? "Edit product" : "Add a product"}</h2>
            <p>
              Add product details, pricing, and an image from your device.
            </p>
          </div>
          {editingProduct && (
            <button
              className="owner-text-button"
              type="button"
              onClick={() => setEditingProduct(null)}
            >
              Cancel editing
            </button>
          )}
        </div>

        <form
          key={editingProduct?.id ?? "new-product"}
          className="owner-product-form"
          onSubmit={handleSubmit}
        >
          <label>
            Product name
            <input
              name="name"
              defaultValue={editingProduct?.name ?? ""}
              maxLength={150}
              required
            />
          </label>
          <label>
            Category
            <input
              name="category"
              defaultValue={
                editingProduct?.category_name ??
                editingProduct?.category?.name ??
                ""
              }
              maxLength={80}
              required
            />
          </label>
          <label>
            Price (INR)
            <input
              name="price"
              type="number"
              min="0"
              max="99999999.99"
              step="0.01"
              defaultValue={editingProduct?.price ?? ""}
              required
            />
          </label>
          <label>
            Cost price (INR)
            <input
              name="cost_price"
              type="number"
              min="0"
              max="99999999.99"
              step="0.01"
              defaultValue={editingProduct?.cost_price ?? ""}
              required
            />
          </label>
          <label>
            Unit
            <input
              name="unit"
              placeholder="kg, box, dozen..."
              maxLength={20}
              defaultValue={editingProduct?.unit ?? ""}
              required
            />
          </label>
          <label>
            Stock quantity
            <input
              name="stock_quantity"
              type="number"
              min="0"
              max="2147483647"
              step="1"
              defaultValue={editingProduct?.stock_quantity ?? 0}
              required
            />
          </label>
          <label>
            Product image
            <input
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required={!editingProduct}
            />
            <span className="owner-field-help">JPEG, PNG, or WebP. Maximum file size: 5 MB.{editingProduct?.image_url ? " Leave empty to keep the current image." : ""}</span>
          </label>
          <label className="owner-field-wide">
            Description
            <textarea
              name="description"
              rows={3}
              defaultValue={editingProduct?.description ?? ""}
            />
          </label>
          <label className="owner-checkbox owner-field-wide">
            <input
              name="is_active"
              type="checkbox"
              defaultChecked={editingProduct?.is_active ?? true}
            />
            Publish this product in the public catalog
          </label>

          {error && <p className="owner-error owner-field-wide" role="alert">{error}</p>}
          {notice && <p className="owner-notice owner-field-wide" role="status">{notice}</p>}
          <div className="owner-form-actions owner-field-wide">
            <button className="owner-primary-button" type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingProduct
                  ? "Save changes"
                  : "Add product"}
            </button>
          </div>
        </form>
      </section>
      )}

      {currentPage.path === "/owner/products" && !editingProduct && (
      <section className="owner-panel owner-anchor-section" id="view-products">
        <div className="owner-panel-heading">
          <div>
            <h2>Products</h2>
            <p>Update product details or remove a product from the catalog.</p>
          </div>
          {loadingProducts && <span>Loading products...</span>}
        </div>
        {products.length === 0 && !loadingProducts ? (
          <p className="owner-empty">No products yet. Add your first product above.</p>
        ) : (
          <div className="owner-table-scroll">
            <table className="owner-product-table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Category</th>
                  <th scope="col">Price</th>
                  <th scope="col">Stock</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="owner-product-name">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" loading="lazy" />
                        ) : (
                          <span className="owner-image-empty" aria-hidden="true">
                            🍊
                          </span>
                        )}
                        <span>{product.name}</span>
                      </div>
                    </td>
                    <td>{product.category_name || product.category?.name}</td>
                    <td>
                      ₹{Number(product.price).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}{" "}
                      / {product.unit}
                    </td>
                    <td>{product.stock_quantity}</td>
                    <td>
                      <span
                        className={
                          product.is_active
                            ? "owner-status owner-status-active"
                            : "owner-status owner-status-inactive"
                        }
                      >
                        {product.is_active ? "Published" : "Hidden"}
                      </span>
                    </td>
                    <td>
                      <div className="owner-row-actions">
                        <button
                          className="owner-text-button"
                          type="button"
                          onClick={() => {
                            setError("");
                            setNotice("");
                            setEditingProduct(product);
                            navigate("/owner/products/new");
                          }}
                        >
                          Edit
                        </button>
                        {product.is_active && (
                          <button
                            className="owner-text-button owner-danger-button"
                            type="button"
                            onClick={() => void handleDeactivate(product)}
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      )}
      {currentPage.path === "/owner/distributors" && (
        <DealerManagement />
      )}
      {currentPage.path === "/owner/packaging" && (
        <PackagingManagement products={products} />
      )}
      {currentPage.path === "/owner/coming-soon" && (
        <ComingSoonManagement products={products} />
      )}
      {currentPage.path === "/owner/communications" && (
        <DirectMessages embedded />
      )}
      {currentPage.path === "/owner/exports" && (
        <ExportManagement products={products} />
      )}
      {currentPage.path === "/owner/orders" && (
        <OrderStatusManagement />
      )}
      {currentPage.path === "/owner/clients" && accessToken && (
        <OwnerClientDirectory token={accessToken} />
      )}
      {currentPage.path === "/owner/settings" && user && (
        <OwnerSettings
          user={user}
          onUserUpdated={(updatedUser) => setUser(updatedUser)}
        />
      )}
      {currentPage.path === "/owner/employee-settings" && (
        <EmployeeSettings />
      )}
    </main>
  );
}

export default Owner;
