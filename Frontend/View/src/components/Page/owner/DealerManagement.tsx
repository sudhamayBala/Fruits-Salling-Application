import { useState } from "react";
import type { FormEvent } from "react";
import {
  addDealer,
  getDealers,
  removeDealer,
} from "../../../services/dealers";
import type { Dealer } from "../../../services/dealers";
import "../../../styles/page/Dealers.css";

function DealerManagement() {
  const [initialState] = useState(() => {
    try {
      return { dealers: getDealers(), error: "" };
    } catch (loadError) {
      return {
        dealers: [],
        error:
          loadError instanceof Error
            ? loadError.message
            : "Unable to load dealers.",
      };
    }
  });
  const [dealers, setDealers] = useState<Dealer[]>(initialState.dealers);
  const [error, setError] = useState(initialState.error);
  const [notice, setNotice] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const dealer = {
      name: String(data.get("dealerName") ?? "").trim(),
      contractNumber: String(data.get("contractNumber") ?? "").trim(),
      distributorName: String(data.get("distributorName") ?? "").trim(),
      distributorContractNumber: String(
        data.get("distributorContractNumber") ?? "",
      ).trim(),
      place: String(data.get("dealerPlace") ?? "").trim(),
      distributedProduct: String(data.get("distributedProduct") ?? "").trim(),
      email: String(data.get("dealerEmail") ?? "").trim(),
      phone: String(data.get("dealerPhone") ?? "").trim(),
      responsibility: String(data.get("responsibility") ?? "").trim(),
    };

    setError("");
    setNotice("");
    try {
      const created = addDealer(dealer);
      setDealers((current) => [created, ...current]);
      form.reset();
      setNotice("Dealer added to the contracts list.");
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Unable to add dealer.",
      );
    }
  }

  function handleRemove(dealer: Dealer) {
    if (!window.confirm(`Delete the contract for ${dealer.name}?`)) return;

    setError("");
    setNotice("");
    try {
      removeDealer(dealer.id);
      setDealers((current) =>
        current.filter((item) => item.id !== dealer.id),
      );
      setNotice("Dealer removed from the contracts list.");
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Unable to remove dealer.",
      );
    }
  }

  return (
    <section className="owner-panel dealer-management">
      <div className="owner-panel-heading">
        <div>
          <h2>Manage dealers and contracts</h2>
          <p>Enter the dealer and distributor with their separate contract numbers, then add contact and responsibility details.</p>
        </div>
      </div>

      <form className="dealer-form" onSubmit={handleSubmit}>
        <label>
          Dealer name
          <input name="dealerName" maxLength={150} required />
        </label>
        <label>
          Dealer contract number
          <input name="contractNumber" maxLength={80} required />
        </label>
        <label>
          Distributor name
          <input name="distributorName" maxLength={150} required />
        </label>
        <label>
          Distributor contract number
          <input name="distributorContractNumber" maxLength={80} required />
        </label>
        <label>
          Distributor place
          <input name="dealerPlace" maxLength={200} required />
        </label>
        <label>
          Product distributed
          <input name="distributedProduct" maxLength={200} required />
        </label>
        <label>
          Email ID
          <input name="dealerEmail" type="email" maxLength={254} required />
        </label>
        <label>
          Phone number (for calls)
          <input name="dealerPhone" type="tel" maxLength={32} />
        </label>
        <label>
          Responsible work
          <input name="responsibility" maxLength={250} required />
        </label>
        {error && <p className="owner-error dealer-feedback" role="alert">{error}</p>}
        {notice && <p className="owner-notice dealer-feedback" role="status">{notice}</p>}
        <div className="owner-form-actions dealer-feedback">
          <button className="owner-primary-button" type="submit">
            Add dealer
          </button>
        </div>
      </form>

      <div className="owner-table-scroll dealer-admin-table">
        <table className="dealer-table">
          <thead>
            <tr>
              <th scope="col">Dealer name</th>
              <th scope="col">Dealer contract number</th>
              <th scope="col">Distributor name</th>
              <th scope="col">Distributor contract number</th>
              <th scope="col">Place</th>
              <th scope="col">Product distributed</th>
              <th scope="col">Email ID</th>
              <th scope="col">Phone</th>
              <th scope="col">Responsible work</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {dealers.map((dealer) => (
              <tr key={dealer.id}>
                <td>{dealer.name}</td>
                <td>{dealer.contractNumber}</td>
                <td>{dealer.distributorName || "Not provided"}</td>
                <td>{dealer.distributorContractNumber || "Not provided"}</td>
                <td>{dealer.place || "Not provided"}</td>
                <td>{dealer.distributedProduct || "Not provided"}</td>
                <td>
                  <a href={`mailto:${dealer.email}`}>{dealer.email}</a>
                </td>
                <td>{dealer.phone || "Not provided"}</td>
                <td>{dealer.responsibility}</td>
                <td>
                  <button
                    className="owner-text-button owner-danger-button"
                    type="button"
                    onClick={() => handleRemove(dealer)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {dealers.length === 0 && (
              <tr>
                <td className="dealer-empty" colSpan={10}>
                  No dealers added yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="dealer-storage-note">
        Dealer data is currently saved in this browser.
      </p>
    </section>
  );
}

export default DealerManagement;
