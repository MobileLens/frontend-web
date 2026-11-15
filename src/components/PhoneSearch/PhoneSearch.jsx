import { useEffect, useState } from "react";

import { searchSmartphones } from "../../api/smartphones";
import Icon from "../Icon/Icon";
import { PhoneImage } from "../PhoneCard/PhoneCard";
import "./PhoneSearch.css";

const SEARCH_DELAY_MS = 250;

// A small phone picture in a rounded square, as in the search results.
export function PhoneThumb({ phone }) {
  return <span className="phone-search-thumb"><PhoneImage phone={phone} /></span>;
}

/**
 * Picks a catalogue phone: type a model name, then choose from the matches. Phones in excludeIds
 * are left out of the results. Used to add phones to the comparison and to a review.
 */
export default function PhoneSearch({ excludeIds = [], onPick, placeholder = "Add a phone: type a model name…", label = "Search for a phone to add", className = "" }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return undefined;

    let ignore = false;
    const timer = setTimeout(async () => {
      setSearching(true);

      try {
        const phones = await searchSmartphones(trimmed, 8);

        if (!ignore) {
          setResults(phones);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (!ignore) {
          setSearching(false);
        }
      }
    }, SEARCH_DELAY_MS);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query]);

  function handlePick(phone) {
    onPick(phone);
    setQuery("");
    setResults([]);
  }

  const visibleResults = query.trim() ? results.filter((phone) => !excludeIds.includes(phone.id)) : [];

  return (
    <div className={`phone-search ${className}`}>
      <input
        type="search"
        className="ui-input"
        placeholder={placeholder}
        aria-label={label}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          // Enter picks the first match instead of submitting the form around it.
          if (event.key !== "Enter") return;
          event.preventDefault();
          if (visibleResults[0]) handlePick(visibleResults[0]);
        }}
      />

      {query.trim() && (
        <ul className="phone-search-results">
          {searching && visibleResults.length === 0 && <li className="phone-search-empty">Searching…</li>}
          {!searching && visibleResults.length === 0 && <li className="phone-search-empty">No phones found.</li>}
          {visibleResults.map((phone) => (
            <li key={phone.id}>
              <button type="button" className="phone-search-option" onClick={() => handlePick(phone)}>
                <PhoneThumb phone={phone} />
                <span>
                  {phone.brandName && <span className="phone-brand">{phone.brandName} </span>}
                  <strong>{phone.modelName}</strong>
                </span>
                <span className="phone-search-plus" aria-hidden="true"><Icon name="plus" /></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
