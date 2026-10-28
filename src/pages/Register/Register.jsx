import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { registerUser, loginUser } from "../../api/auth";
import { saveToken } from "../../utils/auth";
import "./Register.css";

function Register() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function validateForm() {
    if (!username.trim()) return "Username is required.";
    if (!name.trim()) return "Name is required.";
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

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      await registerUser({
        name: name.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      });

      const loginData = await loginUser({
        email: email.trim(),
        password,
      });

      const token =
        loginData.token ||
        loginData.accessToken ||
        loginData.data?.token ||
        loginData.data?.accessToken;

      if (!token) {
        throw new Error(
          "Registration succeeded, but automatic login failed to return a token."
        );
      }

      saveToken(token);
      navigate("/");
    } catch (err) {
      console.error(err);
      setError(err.message || "Registration or automatic login failed.");
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
            <label htmlFor="name" className="auth-label">Name</label>
            <input
              id="name"
              type="text"
              className="auth-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="name"
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
            <input
              id="password"
              type="password"
              className="auth-input"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="confirmPassword" className="auth-label">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
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

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? "Creating account..." : "Register"}
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