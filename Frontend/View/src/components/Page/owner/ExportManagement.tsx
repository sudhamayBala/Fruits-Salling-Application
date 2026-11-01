import { useState } from "react";
import type { FormEvent } from "react";
import type { Product } from "../../../connection";
import { getDealers } from "../../../services/dealers";
import type { Dealer } from "../../../services/dealers";
import {
  addExportRecord,
  deleteExportRecord,
  getExportRecords,
} from "../../../services/exports";
import type { ExportRecord } from "../../../services/exports";
import "../../../styles/page/Exports.css";

type ExportManagementProps = { products: Product[] };

function ExportManagement({ products }: ExportManagementProps) {
  const [initialState] = useState(() => {
    try {
      return { records: getExportRecords(), dealers: getDealers(), error: "" };
    } catch (loadError) {
      return {
        records: [],
        dealers: [],
        error:
          loadError instanceof Error
            ? loadError.message
            : "Unable to load export management data.",
      };
    }
  });
  const [records, setRecords] = useState<ExportRecord[]>(initialState.records);
  const [dealers] = useState<Dealer[]>(initialState.dealers);
  const [error, setError] = useState(initialState.error);
  const [notice, setNotice] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const product = products.find(
      (item) => item.id === String(data.get("productId")),
    );
    const dealer = dealers.find(
      (item) => item.id === String(data.get("dealerId")),
    );
    if (!product || !dealer) {
      setError("Select a valid product and dealer.");
      return;
    }

    setError("");
    setNotice("");
    try {
      const created = addExportRecord({
        productId: product.id,
        productName: product.name,
        imageUrl: product.image_url,
        orderedDate: String(data.get("orderedDate") ?? ""),
        deliveredLocation: String(data.get("deliveredLocation") ?? "").trim(),
        dealerName: dealer.name,
        distributorName:
          String(data.get("distributorName") ?? "").trim() ||
          dealer.distributorName ||
          dealer.name,
        deliveryCompletionDate:
          String(data.get("deliveryCompletionDate") ?? "") || null,
      });
      setRecords((current) => [created, ...current]);
      form.reset();
      setNotice("Export shipment added.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save export shipment.",
      );
    }
  }

  function handleDelete(record: ExportRecord) {
    if (!window.confirm(`Delete the export shipment for ${record.productName}?`)) {
      return;
    }
    try {
      deleteExportRecord(record.id);
      setRecords((current) => current.filter((item) => item.id !== record.id));
      setNotice("Export shipment deleted.");
      setError("");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete export shipment.",
      );
    }
  }

  return (
    <section className="owner-panel export-management">
      <div className="owner-panel-heading">
        <div>
          <h2>Manage export shipments</h2>
          <p>Record the product, shipment location, dealer, and delivery dates.</p>
        </div>
      </div>
      <form className="export-form" onSubmit={handleSubmit}>
        <label>
          Product
          <select name="productId" required defaultValue="">
            <option value="" disabled>Select a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} (ID: {product.id})
              </option>
            ))}
          </select>
        </label>
        <label>
          Dealer
          <select name="dealerId" required defaultValue="">
            <option value="" disabled>Select a dealer</option>
            {dealers.map((dealer) => (
              <option key={dealer.id} value={dealer.id}>{dealer.name}</option>
            ))}
          </select>
        </label>
        <label>
          Distributor name
          <input name="distributorName" maxLength={150} placeholder="Defaults to contract distributor" />
        </label>
        <label>
          Delivered location
          <input name="deliveredLocation" maxLength={200} required />
        </label>
        <label>
          Ordered date
          <input name="orderedDate" type="date" required />
        </label>
        <label>
          Delivery completion date
          <input name="deliveryCompletionDate" type="date" />
        </label>
        {error && <p className="owner-error export-feedback" role="alert">{error}</p>}
        {notice && <p className="owner-notice export-feedback" role="status">{notice}</p>}
        <div className="owner-form-actions export-feedback">
          <button
            className="owner-primary-button"
            type="submit"
            disabled={products.length === 0 || dealers.length === 0}
          >
            Add shipment
          </button>
          {(products.length === 0 || dealers.length === 0) && (
            <p className="export-help">
              Add products and dealer contracts before creating a shipment.
            </p>
          )}
        </div>
      </form>

      <div className="owner-table-scroll export-admin-table">
        <table className="export-table">
          <thead>
            <tr>
              <th scope="col">Product</th>
              <th scope="col">Product ID</th>
              <th scope="col">Location</th>
              <th scope="col">Dealer</th>
              <th scope="col">Distributor</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>
                  {record.imageUrl ? (
                    <img
                      className="export-product-image"
                      src={record.imageUrl}
                      alt=""
                      loading="lazy"
                    />
                  ) : (
                    <span className="export-image-empty" aria-hidden="true">🍊</span>
                  )}
                  <span className="export-product-name">{record.productName}</span>
                </td>
                <td>{record.productId}</td>
                <td>{record.deliveredLocation}</td>
                <td>{record.dealerName}</td>
                <td>{record.distributorName}</td>
                <td>
                  <button
                    className="owner-text-button owner-danger-button"
                    type="button"
                    onClick={() => handleDelete(record)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td className="export-empty" colSpan={6}>No export shipments yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="export-storage-note">Export records are saved in this browser.</p>
    </section>
  );
}

export default ExportManagement;
