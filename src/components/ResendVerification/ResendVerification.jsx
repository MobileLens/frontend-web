import { useEffect, useState } from "react";
import { resendVerification } from "../../api/auth";
import Icon from "../Icon/Icon";

const COOLDOWN_SECONDS = 60;

// Sends the confirmation link again, at most once a minute (as in the mobile apps).
export default function ResendVerification({ email, startCooling = false }) {
  const [secondsLeft, setSecondsLeft] = useState(startCooling ? COOLDOWN_SECONDS : 0);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  async function handleClick() {
    setSending(true);
    setResult(null);

    try {
      await resendVerification(email);
      setResult({ ok: true, text: `Email sent to ${email}.` });
      setSecondsLeft(COOLDOWN_SECONDS);
    } catch (err) {
      console.error(err);
      setResult({ ok: false, text: err.message || "Could not send the email." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="resend-verification">
      <button
        type="button"
        className="auth-secondary-btn"
        disabled={sending || secondsLeft > 0 || !email}
        onClick={handleClick}
      >
        <Icon name="mail" />
        {sending ? "Sending…" : secondsLeft > 0 ? `Resend email (${secondsLeft} s)` : "Resend email"}
      </button>
      {result && (
        <p role={result.ok ? "status" : "alert"} className={result.ok ? "resend-note" : "auth-error"}>
          {result.text}
        </p>
      )}
    </div>
  );
}
