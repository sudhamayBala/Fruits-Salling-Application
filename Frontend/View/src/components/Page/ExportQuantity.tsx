import { useEffect, useState } from "react";
import {
  getExportRecords,
  subscribeToExportChanges,
} from "../../services/exports";
import type { ExportRecord } from "../../services/exports";
import "../../styles/page/Exports.css";

function ExportQuantity() {
  const [records, setRecords] = useState<ExportRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    function loadRecords() {
      try {
        setRecords(getExportRecords());
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load export shipments.",
        );
      }
    }

    loadRecords();
    return subscribeToExportChanges(loadRecords);
  }, []);

  return (
    <main className="exports-page">
      <header className="exports-header">
        <p className="exports-eyebrow">Shipment information</p>
        <h1>Export products</h1>
        <p>Product images, shipment locations, dealers, and distributors.</p>
      </header>
      {error ? (
        <p className="export-error" role="alert">{error}</p>
      ) : records.length === 0 ? (
        <p className="export-empty">There are no export shipments to display yet.</p>
      ) : (
        <div className="export-table-scroll">
          <table className="export-table">
            <thead>
              <tr>
                <th scope="col">Product image</th>
                <th scope="col">Product ID</th>
                <th scope="col">Delivered location</th>
                <th scope="col">Dealer name</th>
                <th scope="col">Distributor name</th>
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
                        alt={record.productName}
                        loading="lazy"
                      />
                    ) : (
                      <span className="export-image-empty" role="img" aria-label="No product photo">🍊</span>
                    )}
                    <span className="export-product-name">{record.productName}</span>
                  </td>
                  <td>{record.productId}</td>
                  <td>{record.deliveredLocation}</td>
                  <td>{record.dealerName}</td>
                  <td>{record.distributorName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default ExportQuantity;
