import { useEffect, useState } from "react";
import {
  getExportRecords,
  subscribeToExportChanges,
} from "../../services/exports";
import type { ExportRecord } from "../../services/exports";
import "../../styles/page/Exports.css";

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString();
}

function ExportStatus() {
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
            : "Unable to load shipment statuses.",
        );
      }
    }

    loadRecords();
    return subscribeToExportChanges(loadRecords);
  }, []);

  return (
    <main className="exports-page export-status-page">
      <header className="exports-header">
        <p className="exports-eyebrow">Track a shipment</p>
        <h1>Export status</h1>
        <p>Follow each shipment from order through delivery.</p>
      </header>
      {error ? (
        <p className="export-error" role="alert">{error}</p>
      ) : records.length === 0 ? (
        <p className="export-empty">There are no shipments to track yet.</p>
      ) : (
        <div className="export-timeline-list">
          {records.map((record) => {
            const delivered = Boolean(record.deliveryCompletionDate);
            return (
              <article className="export-timeline-card" key={record.id}>
                <header className="export-timeline-heading">
                  <div>
                    <h2>{record.productName}</h2>
                    <p>Product ID: {record.productId}</p>
                  </div>
                  <span className={delivered ? "export-status-complete" : "export-status-pending"}>
                    {delivered ? "Delivered" : "In transit"}
                  </span>
                </header>
                <ol className="export-timeline">
                  <li className="export-timeline-step export-step-complete">
                    <span className="export-step-marker" aria-hidden="true" />
                    <div>
                      <h3>Order placed</h3>
                      <time dateTime={record.orderedDate}>{formatDate(record.orderedDate)}</time>
                    </div>
                  </li>
                  <li className="export-timeline-step export-step-complete">
                    <span className="export-step-marker" aria-hidden="true" />
                    <div>
                      <h3>Product location</h3>
                      <p>{record.deliveredLocation}</p>
                    </div>
                  </li>
                  <li className={delivered ? "export-timeline-step export-step-complete" : "export-timeline-step"}>
                    <span className="export-step-marker" aria-hidden="true" />
                    <div>
                      <h3>Delivery complete</h3>
                      {record.deliveryCompletionDate ? (
                        <time dateTime={record.deliveryCompletionDate}>
                          {formatDate(record.deliveryCompletionDate)}
                        </time>
                      ) : (
                        <p>Delivery is pending.</p>
                      )}
                    </div>
                  </li>
                </ol>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}

export default ExportStatus;
