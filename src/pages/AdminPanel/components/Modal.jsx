import { useEffect } from "react";

export default function Modal({ title, subtitle, onClose, footer, size = "md", children }) {
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="admin-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className={`admin-modal admin-modal-${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="admin-modal-header">
          <div>
            <h2 className="admin-modal-title">{title}</h2>
            {subtitle && <p className="admin-modal-subtitle">{subtitle}</p>}
          </div>
          <button type="button" className="admin-icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="admin-modal-body">{children}</div>

        {footer && <footer className="admin-modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}
