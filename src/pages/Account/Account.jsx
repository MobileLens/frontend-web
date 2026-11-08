import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  answerPromotionOffer,
  changeEmail,
  changePassword,
  deleteAccount,
  exportAccountData,
  getPromotionOffer,
  updateUsername,
} from "../../api/account";
import Icon from "../../components/Icon/Icon";
import { PageSkeleton } from "../../components/PhoneCard/PhoneCard";
import PasswordInput from "../../components/PasswordInput/PasswordInput";
import { useAuth } from "../../context/useAuth";
import { isLoggedIn, removeToken, saveToken } from "../../utils/auth";
import { passwordProblem } from "../../utils/password";
import "./Account.css";

const ROLE_LABELS = {
  user: "User",
  reviewer: "Reviewer",
  moderator: "Moderator",
  admin: "Administrator",
};


function Feedback({ state }) {
  if (!state?.text) return null;

  return (
    <p role={state.type === "error" ? "alert" : "status"} className={`ui-alert ui-alert-${state.type}`}>
      {state.text}
    </p>
  );
}

function ProfileSection({ user, onSaved }) {
  const [username, setUsername] = useState(user.username || user.name || "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!username.trim()) {
      setFeedback({ type: "error", text: "Username is required." });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      await updateUsername(username.trim());
      await onSaved();
      setFeedback({ type: "success", text: "Profile updated." });
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Could not update the profile." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ui-card" aria-labelledby="account-profile">
      <h2 id="account-profile" className="ui-card-title">Profile</h2>
      <p className="ui-card-text">Your username is shown next to your reviews and comments.</p>

      <form className="ui-form" onSubmit={handleSubmit}>
        <label className="ui-field">
          <span className="ui-label">Username</span>
          <input className="ui-input" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
        </label>

        <Feedback state={feedback} />

        <div className="ui-actions">
          <button type="submit" className="ui-btn ui-btn-primary" disabled={saving}>
            <Icon name="save" /> {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>
    </section>
  );
}

function EmailSection({ user, onSaved }) {
  const [newEmail, setNewEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();

    const email = newEmail.trim();
    if (!email) return;

    setSaving(true);
    setFeedback(null);

    try {
      await changeEmail(email);
      await onSaved();
      setNewEmail("");
      setFeedback({
        type: "success",
        text: user.emailVerified
          ? `We sent a confirmation link to ${user.email}. Your address changes once you open it.`
          : "E-mail address changed.",
      });
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Could not change the e-mail address." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ui-card" aria-labelledby="account-email">
      <h2 id="account-email" className="ui-card-title">E-mail address</h2>
      <p className="ui-card-text">
        Current address: <strong className="account-strong">{user.email}</strong>{" "}
        {user.emailVerified
          ? <span className="ui-badge">Verified</span>
          : <span className="ui-badge account-badge-muted">Not verified</span>}
      </p>

      <form className="ui-form" onSubmit={handleSubmit}>
        <label className="ui-field">
          <span className="ui-label">New e-mail address</span>
          <input
            type="email"
            className="ui-input"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <Feedback state={feedback} />

        <div className="ui-actions">
          <button type="submit" className="ui-btn ui-btn-primary" disabled={saving || !newEmail.trim()}>
            <Icon name="mail" /> {saving ? "Saving…" : "Change e-mail"}
          </button>
        </div>
      </form>
    </section>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function handleSubmit(event) {
    event.preventDefault();

    const problem = !currentPassword
      ? "Enter your current password."
      : passwordProblem(newPassword) || (newPassword !== confirmPassword ? "New passwords do not match." : "");

    if (problem) {
      setFeedback({ type: "error", text: problem });
      return;
    }

    setSaving(true);
    setFeedback(null);

    try {
      const data = await changePassword({ currentPassword, newPassword });

      // other sessions were revoked; keep this browser signed in with the new token
      if (data?.token) {
        saveToken(data.token);
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setFeedback({ type: "success", text: "Password changed. Other devices have been signed out." });
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Could not change the password." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ui-card" aria-labelledby="account-password">
      <h2 id="account-password" className="ui-card-title">Password</h2>
      <p className="ui-card-text">
        At least 8 characters with an uppercase and a lowercase letter, a digit and a special character.
      </p>

      <form className="ui-form" onSubmit={handleSubmit}>
        <label className="ui-field">
          <span className="ui-label">Current password</span>
          <PasswordInput
            className="ui-input"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>

        <div className="ui-field-row">
          <label className="ui-field">
            <span className="ui-label">New password</span>
            <PasswordInput
              className="ui-input"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>
          <label className="ui-field">
            <span className="ui-label">Repeat new password</span>
            <PasswordInput
              className="ui-input"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
            />
          </label>
        </div>

        <Feedback state={feedback} />

        <div className="ui-actions">
          <button type="submit" className="ui-btn ui-btn-primary" disabled={saving}>
            <Icon name="key" /> {saving ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>
    </section>
  );
}

function PromotionSection({ offer, onAnswered }) {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function answer(decision) {
    setBusy(true);
    setFeedback(null);

    try {
      await answerPromotionOffer(offer.id, decision);
      await onAnswered(decision);
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Could not answer the invitation." });
      setBusy(false);
    }
  }

  return (
    <section className="ui-card account-highlight" aria-labelledby="account-promotion">
      <h2 id="account-promotion" className="ui-card-title">Invitation to become a reviewer</h2>
      <p className="ui-card-text">
        A moderator invited you on {new Date(offer.createdAt).toLocaleDateString()} to become a reviewer.
        Reviewers can publish phone reviews.
      </p>

      <Feedback state={feedback} />

      <div className="ui-actions">
        <button type="button" className="ui-btn ui-btn-primary" disabled={busy} onClick={() => answer("accept")}>
          <Icon name="check" /> Accept
        </button>
        <button type="button" className="ui-btn" disabled={busy} onClick={() => answer("reject")}>
          <Icon name="close" /> Decline
        </button>
      </div>
    </section>
  );
}

function DataSection() {
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function handleExport() {
    setBusy(true);
    setFeedback(null);

    try {
      const data = await exportAccountData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mobilelens-my-data.json";
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Could not export your data." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="ui-card" aria-labelledby="account-data">
      <h2 id="account-data" className="ui-card-title">Your data</h2>
      <p className="ui-card-text">
        Download everything stored about you: profile, favourites, reviews, comments, likes,
        camera submissions, uploaded photos and videos.
      </p>

      <Feedback state={feedback} />

      <div className="ui-actions">
        <button type="button" className="ui-btn" disabled={busy} onClick={handleExport}>
          <Icon name="download" /> {busy ? "Preparing…" : "Download my data (JSON)"}
        </button>
      </div>
    </section>
  );
}

function DeleteSection() {
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);

  async function handleDelete(event) {
    event.preventDefault();
    if (confirmation !== "DELETE") return;

    setBusy(true);
    setFeedback(null);

    try {
      await deleteAccount();
      removeToken();
      navigate("/");
    } catch (err) {
      setFeedback({ type: "error", text: err.message || "Could not delete the account." });
      setBusy(false);
    }
  }

  return (
    <section className="ui-card account-danger" aria-labelledby="account-delete">
      <h2 id="account-delete" className="ui-card-title">Delete account</h2>
      <p className="ui-card-text">
        Your profile is anonymised and your reviews are removed. This cannot be undone.
      </p>

      <form className="ui-form" onSubmit={handleDelete}>
        <label className="ui-field">
          <span className="ui-label">Type DELETE to confirm</span>
          <input
            className="ui-input"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
          />
        </label>

        <Feedback state={feedback} />

        <div className="ui-actions">
          <button type="submit" className="ui-btn ui-btn-danger" disabled={busy || confirmation !== "DELETE"}>
            <Icon name="trash" /> {busy ? "Deleting…" : "Delete my account"}
          </button>
        </div>
      </form>
    </section>
  );
}

function Account() {
  const { currentUser, loading, refreshUser } = useAuth();
  const [offer, setOffer] = useState(null);
  const [offerMessage, setOfferMessage] = useState("");

  const loggedIn = isLoggedIn();

  useEffect(() => {
    if (!loggedIn) return undefined;
    let ignore = false;

    async function loadOffer() {
      try {
        const data = await getPromotionOffer();

        if (!ignore) {
          setOffer(data);
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadOffer();

    return () => {
      ignore = true;
    };
  }, [loggedIn]);

  async function handleOfferAnswered(decision) {
    setOffer(null);
    setOfferMessage(decision === "accept" ? "You are now a reviewer." : "Invitation declined.");
    await refreshUser();
  }

  if (!loggedIn) {
    return (
      <main className="page">
        <div className="page-narrow">
          <header className="page-header">
            <h1 className="page-title">Account</h1>
          </header>
          <p className="page-status">
            <Link to="/login" className="text-link">Log in</Link> to manage your account.
          </p>
        </div>
      </main>
    );
  }

  if (loading || !currentUser) {
    return (
      <PageSkeleton />
    );
  }

  return (
    <main className="page">
      <div className="page-narrow">
        <header className="page-header">
          <h1 className="page-title">Account</h1>
          <span className="page-subtitle">
            <span className="ui-badge">{ROLE_LABELS[currentUser.role] || currentUser.role}</span>
            {currentUser.createdAt && (
              <> · member since {new Date(currentUser.createdAt).toLocaleDateString()}</>
            )}
          </span>
        </header>

        {offerMessage && (
          <p className="ui-alert ui-alert-success account-top-alert">{offerMessage}</p>
        )}

        {offer && <PromotionSection offer={offer} onAnswered={handleOfferAnswered} />}

        <ProfileSection key={currentUser.username || currentUser.name} user={currentUser} onSaved={refreshUser} />
        <EmailSection user={currentUser} onSaved={refreshUser} />
        <PasswordSection />
        <DataSection />
        <DeleteSection />
      </div>
    </main>
  );
}

export default Account;
