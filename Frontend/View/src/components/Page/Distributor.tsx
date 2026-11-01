import { useEffect, useState } from "react";
import {
  getDealers,
  subscribeToDealerChanges,
} from "../../services/dealers";
import type { Dealer } from "../../services/dealers";
import DealerCommunication from "./DealerCommunication";
import "../../styles/page/Dealers.css";
import "../../styles/page/DealerCommunication.css";
import "../../styles/page/Distributor.css";

function Distributor() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [error, setError] = useState("");
  const [expandedContractId, setExpandedContractId] = useState<string | null>(
    null,
  );
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);

  useEffect(() => {
    function loadDealers() {
      try {
        setDealers(getDealers());
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load distributor information.",
        );
      }
    }

    loadDealers();
    return subscribeToDealerChanges(loadDealers);
  }, []);

  function toggleContract(dealer: Dealer) {
    setExpandedContractId((current) =>
      current === dealer.id ? null : dealer.id,
    );
  }

  return (
    <main className="distributor-page">
      <header className="distributor-header">
        <p className="contracts-eyebrow">Distribution network</p>
        <h1>Our distributors</h1>
        <p>Find distributor locations, products, and contract contact options.</p>
      </header>

      {error ? (
        <p className="owner-error" role="alert">{error}</p>
      ) : dealers.length === 0 ? (
        <p className="contracts-empty">There are no distributors to display yet.</p>
      ) : (
        <div className="dealer-table-scroll">
          <table className="dealer-table distributor-table">
            <thead>
              <tr>
                <th scope="col">Dealer name</th>
                <th scope="col">Dealer contract number</th>
                <th scope="col">Distributor name</th>
                <th scope="col">Distributor contract number</th>
                <th scope="col">Place</th>
                <th scope="col">Product distributed</th>
              </tr>
            </thead>
            <tbody>
              {dealers.map((dealer) => {
                const isExpanded = expandedContractId === dealer.id;
                return (
                  <tr key={dealer.id}>
                    <td>{dealer.name}</td>
                    <td className="distributor-contract-cell">
                      <button
                        className="distributor-contract-button"
                        type="button"
                        aria-expanded={isExpanded}
                        aria-controls={`distributor-actions-${dealer.id}`}
                        onClick={() => toggleContract(dealer)}
                      >
                        {dealer.contractNumber}
                      </button>
                      {isExpanded && (
                        <div
                          className="distributor-contract-actions"
                          id={`distributor-actions-${dealer.id}`}
                        >
                          <button
                            className="owner-primary-button"
                            type="button"
                            onClick={() => setSelectedDealer(dealer)}
                          >
                            Chat
                          </button>
                          {dealer.phone ? (
                            <a
                              className="owner-secondary-link"
                              href={`tel:${dealer.phone}`}
                            >
                              Call
                            </a>
                          ) : (
                            <button
                              className="owner-secondary-link"
                              type="button"
                              disabled
                              title="Add this distributor's phone number in the Owner dashboard."
                            >
                              Call
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td>{dealer.distributorName || "Not provided"}</td>
                    <td>{dealer.distributorContractNumber || "Not provided"}</td>
                    <td>{dealer.place || "Not provided"}</td>
                    <td>{dealer.distributedProduct || dealer.responsibility}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedDealer && (
        <DealerCommunication
          dealer={selectedDealer}
          onClose={() => setSelectedDealer(null)}
        />
      )}
    </main>
  );
}

export default Distributor;
