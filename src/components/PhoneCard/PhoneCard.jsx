import { useState } from "react";
import { Link } from "react-router-dom";
import { addPhoneToCompare, MAX_COMPARE_PHONES, removePhoneFromCompare } from "../../api/compare";
import { prefetchSmartphone } from "../../api/smartphones";
import { useCompareList } from "../../utils/useCompareList";
import Icon from "../Icon/Icon";

export function PhoneImage({ phone }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
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
      decoding="async"
      className={loaded ? "is-loaded" : "is-loading"}
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
    />
  );
}

// Adds a phone to the comparison or takes it out. `phone` needs id, modelName, brandName and an image.
export function CompareButton({ phone, className = "phone-card-action" }) {
  const list = useCompareList();
  const inCompare = list.some((item) => item.id === phone.id);
  const full = !inCompare && list.length >= MAX_COMPARE_PHONES;

  const label = inCompare
    ? `Remove ${phone.modelName} from comparison`
    : full
      ? `Comparison is full (${MAX_COMPARE_PHONES} phones)`
      : `Add ${phone.modelName} to comparison`;

  function handleClick() {
    if (inCompare) {
      removePhoneFromCompare(phone.id);
    } else {
      addPhoneToCompare({
        id: phone.id,
        modelName: phone.modelName,
        brandName: phone.brandName,
        imageUrl: phone.imageUrl,
        imageThumbUrl: phone.imageThumbUrl,
      });
    }
  }

  return (
    <button
      type="button"
      className={`${className} ${inCompare ? "is-active" : ""}`}
      title={label}
      aria-label={label}
      aria-pressed={inCompare}
      disabled={full}
      onClick={handleClick}
    >
      <Icon name={inCompare ? "check" : "compare"} />
    </button>
  );
}

// `phoneId` overrides `phone.id` (favourites list items carry `smartphoneId`). `action` adds a button.
export function PhoneCard({ phone, phoneId = phone.id, rank, meta, action }) {
  const identified = { ...phone, id: phoneId };

  return (
    <div className="phone-card">
      <div className="phone-card-actions">
        {action}
        <CompareButton phone={identified} />
      </div>

      <Link
        to={`/phone/${phoneId}`}
        state={{ preview: identified }}
        className="phone-card-link"
        onMouseEnter={() => prefetchSmartphone(phoneId)}
        onFocus={() => prefetchSmartphone(phoneId)}
      >
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
            <div className="phone-card-media skeleton-area" />
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

// Placeholder while a lazily loaded page or its data arrives.
export function PageSkeleton() {
  return (
    <div className="page" aria-hidden="true">
      <div className="page-narrow skeleton-page">
        <span className="skeleton skeleton-title" />
        <span className="skeleton skeleton-line" />
        <span className="skeleton skeleton-line-short" />
        <span className="skeleton skeleton-block" />
      </div>
    </div>
  );
}
