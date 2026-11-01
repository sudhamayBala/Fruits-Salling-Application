import { useEffect, useState } from "react";
import { getDealers, subscribeToDealerChanges } from "../../services/dealers";
import type { Dealer } from "../../services/dealers";
import DealerCommunication from "./DealerCommunication";
import "../../styles/page/DealerCommunication.css";

function DealerCommunicationList() {
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [selectedDealer, setSelectedDealer] = useState<Dealer | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    function refresh() {
      try {
        setDealers(getDealers());
        setError("");
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : "Unable to load dealers.",
        );
      }
    }
    refresh();
    return subscribeToDealerChanges(refresh);
  }, []);

  return (
    <>
      <section className="owner-panel dealer-communication-list" id="dealer-communications">
        <div className="owner-panel-heading">
          <div>
            <h2><span aria-hidden="true">🔔</span> Dealer messages &amp; calls</h2>
            <p>Contact a dealer using your device’s email or phone application.</p>
          </div>
        </div>
        {error && <p className="owner-error" role="alert">{error}</p>}
        {dealers.length === 0 && !error ? (
          <p className="owner-empty">Add a dealer contract to start a conversation.</p>
        ) : (
          <div className="dealer-contact-list">
            {dealers.map((dealer) => (
              <div className="dealer-contact-item" key={dealer.id}>
                <div>
                  <strong>{dealer.name}</strong>
                  <span>Contract {dealer.contractNumber}</span>
                </div>
                <button
                  className="owner-primary-button"
                  type="button"
                  onClick={() => setSelectedDealer(dealer)}
                >
                  Chat
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      {selectedDealer && (
        <DealerCommunication
          dealer={selectedDealer}
          onClose={() => setSelectedDealer(null)}
        />
      )}
    </>
  );
}

export default DealerCommunicationList;
