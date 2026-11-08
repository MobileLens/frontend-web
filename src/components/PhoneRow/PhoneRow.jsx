import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "../Icon/Icon";
import "./PhoneRow.css";

// A horizontally scrolling list with arrow buttons, so a mouse doesn't need the thin scrollbar.
// An arrow shows only while there is more to scroll that way.
export default function PhoneRow({ children, label }) {
  const listRef = useRef(null);
  const [canScroll, setCanScroll] = useState({ back: false, forward: false });

  const update = useCallback(() => {
    const list = listRef.current;
    if (!list) return;

    setCanScroll({
      back: list.scrollLeft > 1,
      forward: list.scrollLeft + list.clientWidth < list.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return undefined;

    const observer = new ResizeObserver(update);
    observer.observe(list);

    return () => observer.disconnect();
  }, [update]);

  // One page of cards at a time; scroll snapping lines the next card up.
  function scrollPage(direction) {
    const list = listRef.current;
    list.scrollBy({ left: direction * list.clientWidth, behavior: "smooth" });
  }

  return (
    <div className="phone-row-scroller">
      <ol ref={listRef} className="phone-row" aria-label={label} onScroll={update}>
        {children}
      </ol>

      {canScroll.back && (
        <button type="button" className="phone-row-arrow is-back" aria-label="Scroll back" onClick={() => scrollPage(-1)}>
          <Icon name="arrowLeft" />
        </button>
      )}
      {canScroll.forward && (
        <button type="button" className="phone-row-arrow is-forward" aria-label="Scroll forward" onClick={() => scrollPage(1)}>
          <Icon name="arrowRight" />
        </button>
      )}
    </div>
  );
}
