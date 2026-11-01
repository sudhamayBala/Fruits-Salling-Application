import { useEffect, useState } from "react";
import {
  getDealers,
  subscribeToDealerChanges,
} from "../../services/dealers";
import type { Dealer } from "../../services/dealers";
import "../../styles/page/Dealers.css";
import DealerCommunication from "./DealerCommunication";

function Contract() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [error, setError] = useState("");
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
            : "Unable to load contracts.",
        );
      }
    }

    loadDealers();
    return subscribeToDealerChanges(loadDealers);
  }, []);

  return (
    <main className="contracts-page">
      <header className="contracts-header">
        <div>
          <p className="contracts-eyebrow">Our partners</p>
          <h1>Dealer contracts</h1>
          <p>Find dealer contact details and the work covered by each contract.</p>
        </div>
        <a
          className="contracts-notification"
          href="#contracts-table"
          aria-label="Dealer messages and contact options"
          title="Dealer messages and contact options"
        >
          <span aria-hidden="true">🔔</span>
          <span>Messages</span>
        </a>
      </header>

      {error && <p className="owner-error" role="alert">{error}</p>}
      {!error && dealers.length === 0 ? (
        <p className="contracts-empty">There are no dealer contracts to display yet.</p>
      ) : (
        <div className="dealer-table-scroll" id="contracts-table">
          <table className="dealer-table">
            <thead>
              <tr>
                <th scope="col">Dealer name</th>
                <th scope="col">Dealer contract number</th>
                <th scope="col">Distributor name</th>
                <th scope="col">Distributor contract number</th>
                <th scope="col">Email ID</th>
                <th scope="col">Responsible work</th>
                <th scope="col">Contact</th>
              </tr>
            </thead>
            <tbody>
              {dealers.map((dealer) => (
                <tr key={dealer.id}>
                  <td>{dealer.name}</td>
                  <td>{dealer.contractNumber}</td>
                  <td>{dealer.distributorName || "Not provided"}</td>
                  <td>{dealer.distributorContractNumber || "Not provided"}</td>
                  <td>
                    <a href={`mailto:${dealer.email}`}>{dealer.email}</a>
                  </td>
                  <td>{dealer.responsibility}</td>
                  <td className="contract-chat-cell">
                    <button
                      className="owner-primary-button"
                      type="button"
                      onClick={() => setSelectedDealer(dealer)}
                    >
                      Chat
                    </button>
                  </td>
                </tr>
              ))}
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

export default Contract;
