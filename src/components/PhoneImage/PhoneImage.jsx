import { useState } from "react";
import "./PhoneImage.css";

function PhoneImage({ phone }) {
  const [failed, setFailed] = useState(false);

  if (!phone.imageUrl || failed) {
    return (
      <svg className="phone-placeholder" viewBox="0 0 36 64" aria-hidden="true">
        <rect x="1" y="1" width="34" height="62" rx="6" vectorEffect="non-scaling-stroke" />
        <line x1="14" y1="5.5" x2="22" y2="5.5" vectorEffect="non-scaling-stroke" />
      </svg>
    );
  }

  return (
    <img
      src={phone.imageUrl}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

export default PhoneImage;
