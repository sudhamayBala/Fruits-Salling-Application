import { useEffect, useState } from "react";
import {
  getPackagingRecords,
  subscribeToPackagingChanges,
} from "../../services/packaging";
import type { PackagingRecord } from "../../services/packaging";
import "../../styles/page/Packaging.css";

function Packaging() {
  const [records, setRecords] = useState<PackagingRecord[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    function loadRecords() {
      try {
        setRecords(getPackagingRecords());
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load packaging details.",
        );
      }
    }

    loadRecords();
    return subscribeToPackagingChanges(loadRecords);
  }, []);

  return (
    <main className="packaging-page">
      <header className="packaging-page-header">
        <p className="packaging-eyebrow">Product preparation</p>
        <h1>Packaging status</h1>
        <p>Check packaging progress, expected completion, and product location.</p>
      </header>

      {error ? (
        <p className="packaging-error" role="alert">{error}</p>
      ) : records.length === 0 ? (
        <p className="packaging-page-empty">
          There are no packaging updates to display yet.
        </p>
      ) : (
        <div className="packaging-table-scroll">
          <table className="packaging-table">
            <thead>
              <tr>
                <th scope="col">Product name</th>
                <th scope="col">Packaging status</th>
                <th scope="col">Estimated completion</th>
                <th scope="col">Product location</th>
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
                  <td>
                    <time dateTime={record.estimatedCompletionDate}>
                      {new Date(
                        `${record.estimatedCompletionDate}T00:00:00`,
                      ).toLocaleDateString()}
                    </time>
                  </td>
                  <td>{record.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default Packaging;
