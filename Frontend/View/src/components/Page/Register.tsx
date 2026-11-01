import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../../connection";
import "../../styles/page/Auth.css";

const ownerEmailPattern =
  /^[a-z0-9-]+\.\d{4}\.[a-z0-9-]+\.\d{5,6}@indkan\.com$/i;
const legacyOwnerEmailPattern =
  /^[a-z0-9_-]+\.\d{4}\.[a-z0-9_-]+\.\d{6}\.?@indikan\.com$/i;
const ownerEmailDomain = /@indi?kan\.com$/i;
const clientEmailPattern = /@gmail\.com$/i;

function Register() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const isOwnerDomain = ownerEmailDomain.test(email.trim());
  const isOwnerRegistration = isOwnerDomain && (
    ownerEmailPattern.test(email.trim()) ||
    legacyOwnerEmailPattern.test(email.trim())
  );
  const isClientRegistration = clientEmailPattern.test(email.trim());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const formData = new FormData(form);
    const password = String(formData.get("password") ?? "");
    const passwordConfirmation = String(formData.get("passwordConfirmation") ?? "");
    if (password !== passwordConfirmation) {
      setError("Passwords do not match.");
      return;
    }

    if (isOwnerDomain && !isOwnerRegistration) {
      setError(
        "Owner email must use first-name.joining-year.employee-type.employee-id@indkan.com and match an unused ID issued by an admin.",
      );
      return;
    }
    if (!isOwnerRegistration && !isClientRegistration) {
      setError(
        "Client accounts require a Gmail address ending in @gmail.com. Owner accounts require an unused email issued by an admin.",
      );
      return;
    }

    setLoading(true);
    try {
      const session = await register({
        full_name: String(formData.get("full_name") ?? "").trim(),
        email: email.trim(),
        password,
        phone: String(formData.get("phone") ?? "").trim() || undefined,
        address: String(formData.get("address") ?? "").trim() || undefined,
      });
      navigate(
        session.user.role === "admin" ? "/owner" : "/home",
        { replace: true },
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to create your account. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card auth-register-card" aria-labelledby="register-title">
        <div className="auth-card-heading">
          <span className="auth-mark" aria-hidden="true">INDKAN</span>
          <p className="auth-eyebrow">Join our community</p>
          <h1 id="register-title">Create your account</h1>
          <p>
            Use a Gmail address to register a client account. To register as an
            owner, use the unused employee email and ID issued by an admin.
          </p>
        </div>
        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            Full name
            <input
              name="full_name"
              autoComplete="name"
              minLength={2}
              maxLength={120}
              placeholder="Your full name"
              required
            />
          </label>
          <label>
            Email address
            <input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              minLength={5}
              maxLength={254}
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.currentTarget.value)}
              required
            />
            <span className="auth-help">
              {isOwnerRegistration
                ? "Owner account: register with the unused employee email issued to you by an admin."
                : isOwnerDomain
                  ? "Owner account: enter the exact employee email issued by an admin."
                  : isClientRegistration
                    ? "Client account: this Gmail address will create a client account."
                    : "Client account: use an email address ending in @gmail.com."}
            </span>
          </label>
          <label>
            Phone number <span className="auth-optional">(optional)</span>
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={32}
              placeholder="+91 00000 00000"
            />
          </label>
          <label>
            Address <span className="auth-optional">(optional)</span>
            <textarea
              name="address"
              autoComplete="street-address"
              maxLength={2000}
              rows={2}
              placeholder="Street, area, city, and postal code"
            />
          </label>
          <label>
            Password
            <span className="auth-password-field">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={8}
                maxLength={128}
                required
              />
              <button
                className="auth-password-toggle"
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </span>
            <span className="auth-help">Use at least 8 characters.</span>
          </label>
          <label>
            Confirm password
            <input
              name="passwordConfirmation"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
            />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
        <Link className="auth-back-link" to="/">Back to welcome</Link>
      </section>
      <aside className="auth-aside">
        <p className="auth-aside-eyebrow">A fresher way to connect</p>
        <h2>Discover quality fruit and a simpler way to order.</h2>
        <p>Create an account to begin exploring products and managing your orders.</p>
      </aside>
    </main>
  );
}

export default Register;
