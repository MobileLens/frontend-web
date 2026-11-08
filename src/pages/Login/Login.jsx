import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { loginUser } from "../../api/auth";
import Icon from "../../components/Icon/Icon";
import PasswordInput from "../../components/PasswordInput/PasswordInput";
import ResendVerification from "../../components/ResendVerification/ResendVerification";
import { saveToken } from "../../utils/auth";
import "../../styles/auth.css";

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // After a link from an e-mail the backend sends the browser back here.
  const linkError = searchParams.get("error");
  const verified = searchParams.get("verified") === "1" && !linkError;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  // Set when the address isn't confirmed yet, so the link can be sent again.
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (!password) {
      setError("Password is required.");
      return;
    }

    setLoading(true);

    try {
      const data = await loginUser({
        email: email.trim(),
        password,
      });

      if (!data.token) {
        throw new Error(
          "Login succeeded, but no authentication token was returned."
        );
      }

      saveToken(data.token);
      navigate("/");
    } catch (err) {
      console.error(err);

      if (err.code === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(email.trim());
        setError("Please confirm your e-mail address first: open the link we sent you.");
      } else if (err.code === "USER_BANNED") {
        setError("Your account has been banned.");
      } else {
        setError(err.message || "Login failed.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <h1 className="auth-title">Log in to MobileLens</h1>

      <div className="auth-card">
        {verified && <p role="status" className="auth-notice">E-mail address confirmed. You can log in now.</p>}
        {linkError && <p role="alert" className="auth-error auth-link-error">This link has expired or is not valid. Log in to get a new one.</p>}

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

          <div className="auth-field">
            <label htmlFor="password" className="auth-label">Password</label>
            <PasswordInput
              id="password"
              className="auth-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </div>

          {error && <p role="alert" className="auth-error">{error}</p>}
          {unverifiedEmail && <ResendVerification key={unverifiedEmail} email={unverifiedEmail} />}

          <button type="submit" className="auth-btn" disabled={loading}>
            <Icon name="login" /> {loading ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/forgot-password" className="auth-link-btn">Forgot your password?</Link>
        </p>

        <p className="auth-footer">
          Don't have an account?{" "}
          <button type="button" onClick={() => navigate("/register")} className="auth-link-btn">
            Register
          </button>
        </p>
      </div>
    </main>
  );
}

export default Login;