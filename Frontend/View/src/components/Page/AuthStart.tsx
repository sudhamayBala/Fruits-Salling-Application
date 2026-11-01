import { Navigate, Link } from "react-router-dom";
import { getAccessToken } from "../../connection";
import "../../styles/page/Auth.css";

function AuthStart() {
  if (getAccessToken()) return <Navigate to="/home" replace />;

  return (
    <main className="auth-page auth-start-page">
      <section className="auth-card auth-start-card" aria-labelledby="auth-start-title">
        <span className="auth-mark" aria-hidden="true">INDKAN</span>
        <p className="auth-eyebrow">Fresh produce. Global reach.</p>
        <h1 id="auth-start-title">Welcome to INDKAN</h1>
        <p className="auth-start-description">
          Sign in to your account or create one to explore our products, place
          orders, and stay up to date with your deliveries.
        </p>
        <div className="auth-start-actions">
          <Link className="auth-submit" to="/login">Login</Link>
          <Link className="auth-start-register" to="/register">Create an account</Link>
        </div>
        <p className="auth-start-note">
          New here? Registration is quick, and you can add your contact details
          to make ordering easier.
        </p>
      </section>
      <aside className="auth-aside auth-start-aside">
        <p className="auth-aside-eyebrow">A fresher way to connect</p>
        <h2>Discover quality fruit and dependable supply solutions.</h2>
        <p>
          Join INDKAN World Wide Exim Pvt. Ltd. to browse the catalog and connect
          with our team.
        </p>
      </aside>
    </main>
  );
}

export default AuthStart;
