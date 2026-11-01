import { useState } from "react";
import type { FormEvent } from "react";
import type { Product } from "../../../connection";
import {
  deletePackagingRecord,
  getPackagingRecords,
  savePackagingRecord,
} from "../../../services/packaging";
import type { PackagingRecord } from "../../../services/packaging";
import "../../../styles/page/Packaging.css";

type PackagingManagementProps = {
  products: Product[];
};

function PackagingManagement({ products }: PackagingManagementProps) {
  const [initialState] = useState(() => {
    try {
      return { records: getPackagingRecords(), error: "" };
    } catch (loadError) {
      return {
        records: [],
        error:
          loadError instanceof Error
            ? loadError.message
            : "Unable to load packaging records.",
      };
    }
  });
  const [records, setRecords] = useState<PackagingRecord[]>(
    initialState.records,
  );
  const [editingRecord, setEditingRecord] = useState<PackagingRecord | null>(
    null,
  );
  const [error, setError] = useState(initialState.error);
  const [notice, setNotice] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const record = {
      productName: String(data.get("productName") ?? "").trim(),
      status: String(data.get("status")) as PackagingRecord["status"],
      estimatedCompletionDate: String(
        data.get("estimatedCompletionDate") ?? "",
      ),
      location: String(data.get("location") ?? "").trim(),
    };

    setError("");
    setNotice("");
    try {
      const saved = savePackagingRecord(record, editingRecord?.id);
      setRecords((current) =>
        editingRecord
          ? current.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...current],
      );
      setEditingRecord(null);
      form.reset();
      setNotice(editingRecord ? "Packaging record updated." : "Packaging record added.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save the packaging record.",
      );
    }
  }

  function handleDelete(record: PackagingRecord) {
    if (!window.confirm(`Delete packaging details for ${record.productName}?`)) {
      return;
    }
    setError("");
    setNotice("");
    try {
      deletePackagingRecord(record.id);
      setRecords((current) =>
        current.filter((item) => item.id !== record.id),
      );
      if (editingRecord?.id === record.id) setEditingRecord(null);
      setNotice("Packaging record deleted.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete the packaging record.",
      );
    }
  }

  function startEditing(record: PackagingRecord) {
    setError("");
    setNotice("");
    setEditingRecord(record);
  }

  return (
    <section className="owner-panel packaging-management">
      <div className="owner-panel-heading">
        <div>
          <h2>{editingRecord ? "Edit packaging record" : "Manage packaging"}</h2>
          <p>Update product packaging status, estimated date, and location.</p>
        </div>
        {editingRecord && (
          <button
            className="owner-text-button"
            type="button"
            onClick={() => setEditingRecord(null)}
          >
            Cancel editing
          </button>
        )}
      </div>

      <form
        key={editingRecord?.id ?? "new-packaging"}
        className="packaging-form"
        onSubmit={handleSubmit}
      >
        <label>
          Product name
          <input
            name="productName"
            list="packaging-product-options"
            maxLength={150}
            defaultValue={editingRecord?.productName ?? ""}
            required
          />
          <datalist id="packaging-product-options">
            {products.map((product) => (
              <option key={product.id} value={product.name} />
            ))}
          </datalist>
        </label>
        <label>
          Packaging status
          <select name="status" defaultValue={editingRecord?.status ?? "Pending"}>
            <option value="Pending">Pending</option>
            <option value="Complete">Complete</option>
          </select>
        </label>
        <label>
          Estimated completion date
          <input
            name="estimatedCompletionDate"
            type="date"
            defaultValue={editingRecord?.estimatedCompletionDate ?? ""}
            required
          />
        </label>
        <label>
          Product location
          <input
            name="location"
            maxLength={200}
            placeholder="Warehouse, storage area, or dispatch location"
            defaultValue={editingRecord?.location ?? ""}
            required
          />
        </label>

        {error && <p className="owner-error packaging-feedback" role="alert">{error}</p>}
        {notice && <p className="owner-notice packaging-feedback" role="status">{notice}</p>}
        <div className="owner-form-actions packaging-feedback">
          <button className="owner-primary-button" type="submit">
            {editingRecord ? "Save changes" : "Add packaging record"}
          </button>
        </div>
      </form>

      <div className="owner-table-scroll packaging-admin-table">
        <table className="packaging-table">
          <thead>
            <tr>
              <th scope="col">Product name</th>
              <th scope="col">Packaging status</th>
              <th scope="col">Estimated completion</th>
              <th scope="col">Location</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record) => (
              <tr key={record.id}>
                <td>{record.productName}</td>
                <td>
                  <span
                    className={`packaging-status ${
                      record.status === "Complete"
                        ? "packaging-status-complete"
                        : "packaging-status-pending"
                    }`}
                  >
                    {record.status}
                  </span>
                </td>
                <td>{record.estimatedCompletionDate}</td>
                <td>{record.location}</td>
                <td>
                  <div className="owner-row-actions">
                    <button
                      className="owner-text-button"
                      type="button"
                      onClick={() => startEditing(record)}
                    >
                      Edit
                    </button>
                    <button
                      className="owner-text-button owner-danger-button"
                      type="button"
                      onClick={() => handleDelete(record)}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr>
                <td className="packaging-empty" colSpan={5}>
                  No packaging records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="packaging-storage-note">
        Packaging records are currently saved in this browser.
      </p>
    </section>
  );
}

export default PackagingManagement;
