import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getSmartphones } from "../../api/smartphones";
import { PhoneCard, PhoneGridSkeleton, PhoneImage } from "../../components/PhoneCard/PhoneCard";
import { formatReleaseDate, formatViews } from "../../utils/format";
import "./Home.css";

const TRENDING_COUNT = 12;
const NEW_RELEASES_COUNT = 10;
const SKELETON_CARDS = 4;
const SKELETON_ROWS = 5;

function ReleaseRow({ phone }) {
  return (
    <Link to={`/phone/${phone.id}`} className="release-row">
      <time className="release-date" dateTime={phone.releaseDate}>
        {formatReleaseDate(phone.releaseDate)}
      </time>

      <span className="release-thumb">
        <PhoneImage phone={phone} />
      </span>

      <span className="release-name">
        {phone.brandName && <span className="phone-brand">{phone.brandName}</span>}
        <span className="release-model">{phone.modelName}</span>
      </span>

      <svg className="release-arrow" viewBox="0 0 20 20" aria-hidden="true">
        <path d="M8 5l5 5-5 5" />
      </svg>
    </Link>
  );
}

function ReleasesSkeleton() {
  return (
    <ul className="release-list" aria-hidden="true">
      {Array.from({ length: SKELETON_ROWS }, (_, index) => (
        <li key={index}>
          <div className="release-row">
            <span className="skeleton skeleton-line release-date" />
            <span className="release-thumb" />
            <span className="release-name">
              <span className="skeleton skeleton-line-short" />
              <span className="skeleton skeleton-line" />
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const [trending, setTrending] = useState([]);
  const [newReleases, setNewReleases] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");

  useEffect(() => {
    let ignore = false;

    async function loadCatalog() {
      try {
        const [trendingPhones, newPhones] = await Promise.all([
          getSmartphones({ sort: "trending", limit: TRENDING_COUNT }),
          getSmartphones({ sort: "new", limit: NEW_RELEASES_COUNT }),
        ]);

        if (!ignore) {
          setTrending(trendingPhones);
          // sort=new lists phones without a release date last
          setNewReleases(newPhones.filter((phone) => phone.releaseDate));
        }
      } catch (error) {
        console.error(error);

        if (!ignore) {
          setCatalogError("Could not load phones.");
        }
      } finally {
        if (!ignore) {
          setCatalogLoading(false);
        }
      }
    }

    loadCatalog();

    return () => {
      ignore = true;
    };
  }, []);

  function handleSearch(event) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    navigate(trimmedQuery ? `/browse?q=${encodeURIComponent(trimmedQuery)}` : "/browse");
  }

  const catalogLoaded = !catalogLoading && !catalogError;

  return (
    <main className="home">
      <header className="home-hero">
        <h1 className="home-title">Search for a phone</h1>

        <form className="home-search" role="search" onSubmit={handleSearch}>
          <input
            type="search"
            className="home-search-input"
            placeholder="Search by model name, e.g. Galaxy S24"
            aria-label="Search phones by model name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <button type="submit" className="home-search-button" aria-label="Search">
            <svg viewBox="0 0 20 20" aria-hidden="true">
              <circle cx="8.5" cy="8.5" r="5.75" />
              <path d="M13 13l4.25 4.25" />
            </svg>
          </button>
        </form>

        <Link to="/browse" className="text-link home-browse-link">
          Browse the full catalogue with camera filters →
        </Link>
      </header>

      <section
        className="home-section"
        aria-labelledby="home-trending-title"
        aria-busy={catalogLoading}
      >
        <div className="home-section-header">
          <h2 id="home-trending-title" className="home-section-title">
            Trending
          </h2>
          <Link to="/browse?sort=trending" className="text-link">See all</Link>
        </div>

        {catalogLoading && <PhoneGridSkeleton count={SKELETON_CARDS} />}

        {catalogError && (
          <p className="home-status home-status-error">{catalogError}</p>
        )}

        {catalogLoaded && trending.length === 0 && (
          <p className="home-status">No phones yet.</p>
        )}

        {trending.length > 0 && (
          <ol className="phone-row">
            {trending.map((phone, index) => (
              <li key={phone.id}>
                <PhoneCard
                  phone={phone}
                  rank={index + 1}
                  meta={formatViews(phone.viewCount)}
                />
              </li>
            ))}
          </ol>
        )}
      </section>

      <section
        className="home-section"
        aria-labelledby="home-new-title"
        aria-busy={catalogLoading}
      >
        <div className="home-section-header">
          <h2 id="home-new-title" className="home-section-title">
            New releases
          </h2>
          <Link to="/browse?sort=new" className="text-link">See all</Link>
        </div>

        {catalogLoading && <ReleasesSkeleton />}

        {catalogError && (
          <p className="home-status home-status-error">{catalogError}</p>
        )}

        {catalogLoaded && newReleases.length === 0 && (
          <p className="home-status">No release dates yet.</p>
        )}

        {newReleases.length > 0 && (
          <ul className="release-list">
            {newReleases.map((phone) => (
              <li key={phone.id}>
                <ReleaseRow phone={phone} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default Home;
