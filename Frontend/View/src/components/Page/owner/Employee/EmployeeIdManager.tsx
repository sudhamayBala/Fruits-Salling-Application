import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import {
  issueOwnerEmployeeId,
} from "../../../../connection";
import type { IssuedEmployeeId } from "../../../../connection/auth";

const MAX_EMPLOYEE_DATE = new Date().toISOString().slice(0, 10);

function EmployeeIdManager() {
  const [employee, setEmployee] = useState<IssuedEmployeeId | null>(null);
  const [creating, setCreating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const created = await issueOwnerEmployeeId({
        employee_name: String(formData.get("employeeName") ?? "").trim(),
        date_of_birth: String(formData.get("dateOfBirth") ?? ""),
        joining_date: String(formData.get("joiningDate") ?? ""),
        employee_type: String(formData.get("employeeType") ?? "").trim(),
        phone: String(formData.get("phone") ?? "").trim(),
        address: String(formData.get("address") ?? "").trim(),
      });
      setEmployee(created);
      setNotice("Unique employee ID and owner email created.");
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Unable to create employee details.",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleDownload() {
    if (!employee) return;
    setDownloading(true);
    setError("");
    try {
      const { downloadEmployeePdf } = await import("./employeePdf");
      await downloadEmployeePdf(employee);
    } catch (downloadError) {
      setError(
        downloadError instanceof Error
          ? downloadError.message
          : "Unable to download the employee PDF.",
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <section className="owner-panel" aria-labelledby="employee-id-title">
      <div className="owner-panel-heading">
        <div>
          <h2 id="employee-id-title">Employee Settings</h2>
          <p>
            Enter the employee details once. The ID and owner email are
            generated from this profile and saved with it.
          </p>
        </div>
        <Link className="owner-secondary-link" to="/owner/settings">Back to Settings</Link>
      </div>

      <form className="owner-employee-form" onSubmit={(event) => void handleCreate(event)}>
        <label>
          Employee full name
          <input
            name="employeeName"
            autoComplete="name"
            maxLength={160}
            placeholder="Employee Name"
            required
          />
        </label>
        <label>
          Date of birth
          <input
            name="dateOfBirth"
            type="date"
            max={MAX_EMPLOYEE_DATE}
            required
          />
        </label>
        <label>
          Joining date
          <input
            name="joiningDate"
            type="date"
            max={MAX_EMPLOYEE_DATE}
            required
          />
        </label>
        <label>
          Employee type
          <input
            name="employeeType"
            maxLength={80}
            placeholder="Profile"
            required
          />
        </label>
        <label>
          Phone number
          <input
            name="phone"
            type="tel"
            autoComplete="tel"
            maxLength={32}
            placeholder="+91 00000 00000"
            required
          />
        </label>
        <label className="owner-employee-address">
          Address
          <textarea
            name="address"
            autoComplete="street-address"
            maxLength={2000}
            rows={3}
            required
          />
        </label>
        <div className="owner-form-actions owner-employee-form-action">
          <button className="owner-primary-button" type="submit" disabled={creating}>
            {creating ? "Creating..." : "Create employee ID and email"}
          </button>
        </div>
      </form>

      {error && <p className="owner-error" role="alert">{error}</p>}
      {notice && <p className="owner-notice" role="status">{notice}</p>}

      {employee && (
        <div className="owner-employee-result" aria-live="polite">
          <p><span>Employee name</span><strong>{employee.employee_name}</strong></p>
          <p><span>Date of birth</span><strong>{employee.date_of_birth}</strong></p>
          <p><span>Phone</span><strong>{employee.phone}</strong></p>
          <p><span>Address</span><strong>{employee.address}</strong></p>
          <p><span>Employee ID</span><strong>{employee.employee_id}</strong></p>
          <p><span>Owner email</span><strong>{employee.email}</strong></p>
          <p><span>Employee type</span><strong>{employee.employee_type.replaceAll("-", " ")}</strong></p>
          <p><span>Joining date</span><strong>{employee.joining_date}</strong></p>
          <button
            className="owner-secondary-link"
            type="button"
            onClick={() => void handleDownload()}
            disabled={downloading}
          >
            {downloading ? "Preparing PDF..." : "Download employee details PDF"}
          </button>
        </div>
      )}
    </section>
  );
}

export default EmployeeIdManager;
