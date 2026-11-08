import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// A new page starts at the top, as on a normal website. Back and forward ("POP") are left to the
// browser, and a change of the query alone (catalogue filters, admin tabs) keeps the position.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (pathname === previousPathname.current) return;
    previousPathname.current = pathname;

    if (navigationType !== "POP") {
      window.scrollTo(0, 0);
    }
  }, [pathname, navigationType]);

  return null;
}
