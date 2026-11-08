import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { resetPassword } from "../../api/auth";
import Icon from "../../components/Icon/Icon";
import PasswordInput from "../../components/PasswordInput/PasswordInput";
import PasswordChecklist from "../../components/PasswordInput/PasswordChecklist";
import { passwordProblem } from "../../utils/password";
import "../../styles/auth.css";

// The page behind the link from the reset e-mail: ?token=... or ?error=INVALID_TOKEN.
function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const problem = passwordProblem(password) || (password !== confirmPassword ? "Passwords do not match." : "");
    setError(problem);
    if (problem) return;

    setLoading(true);

    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      console.error(err);
      setError(err.message || "Could not change the password. The link may have expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <h1 className="auth-title">Set a new password</h1>

      <div className="auth-card">
        {done && <p role="status" className="auth-notice">Password changed. You can log in now.</p>}

        {!done && !token && (
          <p role="alert" className="auth-error auth-link-error">This link has expired or is not valid.</p>
        )}

        {!done && token && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label htmlFor="password" className="auth-label">New password</label>
              <PasswordInput
                id="password"
                className="auth-input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                aria-describedby="password-rules"
              />
              <div id="password-rules"><PasswordChecklist password={password} /></div>
            </div>

            <div className="auth-field">
              <label htmlFor="confirmPassword" className="auth-label">Repeat new password</label>
              <PasswordInput
                id="confirmPassword"
                className="auth-input"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
              />
            </div>

            {error && <p role="alert" className="auth-error">{error}</p>}

            <button type="submit" className="auth-btn" disabled={loading}>
              <Icon name="key" /> {loading ? "Saving..." : "Change password"}
            </button>
          </form>
        )}

        <p className="auth-footer">
          {!done && !token && <><Link to="/forgot-password" className="auth-link-btn">Get a new link</Link> · </>}
          <Link to="/login" className="auth-link-btn">Back to log in</Link>
        </p>
      </div>
    </main>
  );
}

export default ResetPassword;
