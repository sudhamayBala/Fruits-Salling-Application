import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../../connection";
import "../../styles/page/Auth.css";

function Logout() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    logout()
      .then(() => {
        if (active) navigate("/login", { replace: true });
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to end your session.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [navigate, retry]);

  if (error) {
    return (
      <main className="auth-page auth-logout-page">
        <section className="auth-card auth-logout-card">
          <span className="auth-mark" aria-hidden="true">INDKAN</span>
          <p className="auth-eyebrow">Sign out</p>
          <h1>We couldn&apos;t complete sign out</h1>
          <p className="auth-error" role="alert">{error}</p>
          <div className="auth-logout-actions">
            <button
              className="auth-submit"
              type="button"
              onClick={() => {
                setError("");
                setRetry((current) => current + 1);
              }}
            >
              Try again
            </button>
            <Link className="auth-secondary-link" to="/">Return home</Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-page auth-logout-page">
      <section className="auth-card auth-logout-card" role="status" aria-live="polite">
        <span className="auth-mark" aria-hidden="true">INDKAN</span>
        <span className="auth-spinner" aria-hidden="true" />
        <h1>Signing you out...</h1>
        <p>Your session is being securely closed.</p>
      </section>
    </main>
  );
}

export default Logout;
