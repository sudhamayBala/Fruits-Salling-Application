import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiRequestError, login } from "../../../connection";
import "../../../styles/page/Login.css";

const ownerEmailPattern =
  /^[a-z0-9-]+\.\d{4}\.[a-z0-9-]+\.\d{6}@indkan\.com$/i;
const legacyOwnerEmailPattern =
  /^[a-z0-9_-]+\.\d{4}\.[a-z0-9_-]+\.\d{6}\.?@indikan\.com$/i;
const ownerEmailDomain = /@indi?kan\.com$/i;

function Login() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    if (
      ownerEmailDomain.test(email) &&
      !ownerEmailPattern.test(email) &&
      !legacyOwnerEmailPattern.test(email)
    ) {
      setError(
        "Universal owner emails are not supported. Use the exact owner email issued in Employee Settings (first-name.joining-year.employee-type.employee-id@indkan.com).",
      );
      return;
    }

    setLoading(true);
    try {
      const session = await login({
        email,
        password: String(formData.get("password") ?? ""),
      });
      navigate(
        session.user.role === "admin" ? "/owner" : "/home",
        { replace: true },
      );
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError && requestError.status === 401
        ? "Email or password is incorrect. Owner accounts must use the exact email issued in Employee Settings and the password chosen when the owner account was registered. There is no shared universal owner password."
        : requestError instanceof Error
          ? requestError.message
          : "Unable to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page auth-login-page">
      <section className="auth-card" aria-labelledby="login-title">
        <div className="auth-card-heading">
          <span className="auth-mark" aria-hidden="true">INDKAN</span>
          <p className="auth-eyebrow">Welcome back</p>
          <h1 id="login-title">Sign in to your account</h1>
          <p>Access your account to manage orders and stay connected.</p>
        </div>
        <form className="auth-form" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            Email address
            <input
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              placeholder="you@example.com"
              required
            />
            <span className="auth-help">
              Owner: use the exact email issued in Employee Settings and your
              registered password; there is no shared universal owner login.
              Clients: use your Gmail address and registered password.
            </span>
          </label>
          <label>
            Password
            <span className="auth-password-field">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
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
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="auth-submit" type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <p className="auth-switch">
          New to INDKAN? <Link to="/register">Create an account</Link>
        </p>
      </section>
      <aside className="auth-aside">
        <p className="auth-aside-eyebrow">Fresh produce. Global reach.</p>
        <h2>Good things grow when we stay connected.</h2>
        <p>Sign in to continue your journey with INDKAN World Wide Exim Pvt. Ltd.</p>
      </aside>
    </main>
  );
}

export default Login;
