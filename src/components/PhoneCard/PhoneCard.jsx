import { useState } from "react";
import { Link } from "react-router-dom";

export function PhoneImage({ phone }) {
  const [failed, setFailed] = useState(false);
  const src = phone.imageThumbUrl || phone.imageUrl;

  if (!src || failed) {
    return (
      <svg className="phone-placeholder" viewBox="0 0 36 64" aria-hidden="true">
        <rect x="1" y="1" width="34" height="62" rx="6" vectorEffect="non-scaling-stroke" />
        <line x1="14" y1="5.5" x2="22" y2="5.5" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }

  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

// `phoneId` overrides `phone.id` (favourites list items carry `smartphoneId`).
export function PhoneCard({ phone, phoneId = phone.id, rank, meta, action }) {
  return (
    <div className="phone-card">
      {action}

      <Link to={`/phone/${phoneId}`} className="phone-card-link">
        <div className="phone-card-media">
          {rank && (
            <span className="phone-card-rank" aria-hidden="true">
              {String(rank).padStart(2, "0")}
            </span>
          )}
          <PhoneImage phone={phone} />
        </div>

        <div className="phone-card-body">
          {phone.brandName && <span className="phone-brand">{phone.brandName}</span>}
          <span className="phone-card-model">{phone.modelName}</span>
          {meta && <span className="phone-card-meta">{meta}</span>}
        </div>
      </Link>
    </div>
  );
}

export function PhoneGridSkeleton({ count = 4, className = "phone-grid" }) {
  return (
    <ul className={className} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <div className="phone-card">
            <div className="phone-card-media" />
            <div className="phone-card-body">
              <span className="skeleton skeleton-line-short" />
              <span className="skeleton skeleton-line" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
