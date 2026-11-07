import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser } from "../../api/auth";
import Icon from "../../components/Icon/Icon";
import PasswordInput from "../../components/PasswordInput/PasswordInput";
import { saveToken } from "../../utils/auth";
import "../../styles/auth.css";

function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  function validateForm() {
    if (!username.trim()) return "Username is required.";
    if (!email.trim()) return "Email is required.";
    if (!password) return "Password is required.";
    if (password.length < 8) return "Password must be at least 8 characters long.";
    if (!/[A-Z]/.test(password)) return "Password must contain at least one uppercase letter.";
    if (!/[a-z]/.test(password)) return "Password must contain at least one lowercase letter.";
    if (!/[0-9]/.test(password)) return "Password must contain at least one number.";
    if (!/[^A-Za-z0-9]/.test(password)) return "Password must contain at least one special character.";
    if (password !== confirmPassword) return "Passwords do not match.";
    if (!acceptTerms) return "You must accept the Terms of Service.";
    return "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setInfo("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const data = await registerUser({
        // the backend's required display name; the site shows one username
        name: username.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      });

      // No token when the backend requires e-mail verification before the first login.
      if (!data.token) {
        setInfo("Account created. Check your e-mail to confirm your address, then log in.");
        return;
      }

      saveToken(data.token);
      navigate("/");
    } catch (err) {
      console.error(err);
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <h1 className="auth-title">Create an account</h1>

      <div className="auth-card">
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="username" className="auth-label">Username</label>
            <input
              id="username"
              type="text"
              className="auth-input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
            />
          </div>

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
              autoComplete="new-password"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="confirmPassword" className="auth-label">Confirm Password</label>
            <PasswordInput
              id="confirmPassword"
              className="auth-input"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="auth-field auth-checkbox-field">
            <input
              type="checkbox"
              id="terms"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
            />
            <label htmlFor="terms" className="auth-checkbox-label">
              I accept the Terms of Service
            </label>
          </div>

          {error && <p role="alert" className="auth-error">{error}</p>}
          {info && <p role="status">{info}</p>}

          <button type="submit" className="auth-btn" disabled={loading}>
            <Icon name="user" /> {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <button type="button" onClick={() => navigate("/login")} className="auth-link-btn">
            Log in
          </button>
        </p>
      </div>
    </main>
  );
}

export default Register;