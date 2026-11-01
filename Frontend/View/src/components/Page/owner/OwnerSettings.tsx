import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { updateCurrentUser } from "../../../connection";
import type { CurrentUser } from "../../../connection";

function OwnerSettings({
  user,
  onUserUpdated,
}: {
  user: CurrentUser;
  onUserUpdated: (user: CurrentUser) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateCurrentUser({
        full_name: String(data.get("fullName") ?? "").trim(),
        phone: String(data.get("phone") ?? "").trim() || null,
        address: String(data.get("address") ?? "").trim() || null,
      });
      onUserUpdated(updated);
      setNotice("Account settings saved.");
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Unable to save account settings.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="owner-panel owner-anchor-section" id="settings">
      <div className="owner-panel-heading">
        <div>
          <h2>Settings</h2>
          <p>Update your account details or open employee settings.</p>
        </div>
      </div>
      <div className="owner-employee-card">
        <div className="owner-panel-heading">
          <div>
            <h3>Employee Settings</h3>
            <p>Enter employee details, generate a unique ID and owner email, and download a complete employee PDF.</p>
          </div>
          <Link className="owner-primary-link" to="/owner/employee-settings">
            Open Employee Settings
          </Link>
        </div>
      </div>
      <form className="owner-product-form" onSubmit={(event) => void handleSubmit(event)}>
        <label>
          Full name
          <input name="fullName" minLength={2} maxLength={120} defaultValue={user.full_name} required />
        </label>
        <label>
          Email
          <input type="email" value={user.email} readOnly />
        </label>
        <label>
          Phone
          <input name="phone" type="tel" maxLength={32} defaultValue={user.phone ?? ""} />
        </label>
        <label className="owner-field-wide">
          Address
          <textarea name="address" rows={3} maxLength={2000} defaultValue={user.address ?? ""} />
        </label>
        {error && <p className="owner-error owner-field-wide" role="alert">{error}</p>}
        {notice && <p className="owner-notice owner-field-wide" role="status">{notice}</p>}
        <div className="owner-form-actions owner-field-wide">
          <button className="owner-primary-button" type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default OwnerSettings;
