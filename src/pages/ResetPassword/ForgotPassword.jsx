import { useState } from "react";
import { Link } from "react-router-dom";
import { requestPasswordReset } from "../../api/auth";
import AuthLayout from "../../components/AuthLayout/AuthLayout";
import Icon from "../../components/Icon/Icon";
import "../../styles/auth.css";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    setLoading(true);

    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not send the reset link.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthLayout title="Reset your password" subtitle="We'll e-mail you a link to choose a new one.">
      <div className="auth-card">
        {sent ? (
          <p role="status" className="auth-notice">
            If an account uses {email.trim()}, a reset link is on its way. It is valid for 1 hour.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="email" className="auth-label">Email</label>
              <input
                id="email"
                type="email"
                className="auth-input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
              />
            </div>

            {error && <p role="alert" className="auth-error">{error}</p>}

            <button type="submit" className="auth-btn" disabled={loading}>
              <Icon name="mail" /> {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        )}

        <p className="auth-footer">
          <Link to="/login" className="auth-link-btn">Back to log in</Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default ForgotPassword;
