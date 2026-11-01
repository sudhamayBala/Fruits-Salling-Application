import { useEffect, useMemo, useState } from "react";
import {
  getManagedCustomers,
} from "../../../connection";
import type { CurrentUser } from "../../../connection";

function OwnerClientDirectory({ token }: { token: string }) {
  const [customers, setCustomers] = useState<CurrentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    async function loadCustomers() {
      try {
        const users = await getManagedCustomers(token);
        if (active) setCustomers(users);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load clients.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadCustomers();
    return () => {
      active = false;
    };
  }, [token]);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    if (!query) return customers;
    return customers.filter((customer) =>
      [
        customer.full_name,
        customer.customer_id,
        customer.contract_number,
      ].some((value) => value.toLocaleLowerCase().includes(query)),
    );
  }, [customers, search]);

  return (
    <section className="owner-panel owner-anchor-section" id="clients">
      <div className="owner-panel-heading">
        <div>
          <h2>Clients</h2>
          <p>Registered account profiles, IDs, contracts, and contact details.</p>
        </div>
      </div>
      <label className="owner-client-search">
        Search by client name or ID
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          placeholder="Enter client name or ID"
        />
      </label>
      {loading ? (
        <p className="owner-empty">Loading clients...</p>
      ) : error ? (
        <p className="owner-error" role="alert">{error}</p>
      ) : customers.length === 0 ? (
        <p className="owner-empty">No registered accounts are available.</p>
      ) : filteredCustomers.length === 0 ? (
        <p className="owner-empty">No clients match that name or ID.</p>
      ) : (
        <div className="owner-table-scroll">
          <table className="owner-product-table owner-client-table">
            <thead>
              <tr>
                <th scope="col">Client name</th>
                <th scope="col">Client ID</th>
                <th scope="col">Contract number</th>
                <th scope="col">Email</th>
                <th scope="col">Phone</th>
                <th scope="col">Address</th>
                <th scope="col">Account type</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((customer) => (
                <tr key={customer.customer_id}>
                  <td>{customer.full_name}</td>
                  <td>{customer.customer_id}</td>
                  <td>{customer.contract_number}</td>
                  <td>{customer.email}</td>
                  <td>{customer.phone || "Not provided"}</td>
                  <td>{customer.address || "Not provided"}</td>
                  <td>{customer.role === "admin" ? "Admin" : "Client"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default OwnerClientDirectory;
