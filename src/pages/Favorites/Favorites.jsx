import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFavorites, removeFavorite } from "../../api/favorites";
import { addPhoneToCompare, getComparePhones } from "../../api/compare";
import { PhoneCard, PhoneGridSkeleton } from "../../components/PhoneCard/PhoneCard";
import { useAuth } from "../../context/useAuth";
import { isLoggedIn } from "../../utils/auth";

function Favorites() {
  const { currentUser } = useAuth();
  const loggedIn = isLoggedIn();

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(loggedIn);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!loggedIn) return undefined;
    let ignore = false;

    async function loadFavorites() {
      try {
        const data = await getFavorites();

        if (!ignore) {
          setFavorites(data);
        }
      } catch (err) {
        console.error(err);

        if (!ignore) {
          setError("Could not load your favourite phones.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadFavorites();

    return () => {
      ignore = true;
    };
  }, [loggedIn]);

  async function handleRemove(smartphoneId) {
    const previous = favorites;
    setFavorites((items) => items.filter((item) => item.smartphoneId !== smartphoneId));

    try {
      await removeFavorite(smartphoneId);
    } catch (err) {
      console.error(err);
      setFavorites(previous);
      setMessage("Could not remove the phone from favourites.");
    }
  }

  function handleCompareAll() {
    const inCompare = new Set(getComparePhones().map((phone) => phone.id));
    let added = 0;

    for (const item of favorites) {
      if (inCompare.has(item.smartphoneId)) continue;

      const result = addPhoneToCompare({
        id: item.smartphoneId,
        modelName: item.modelName,
        brandName: item.brandName,
        imageUrl: item.imageThumbUrl || item.imageUrl,
      });

      if (!result.success) break;
      added += 1;
    }

    setMessage(
      added > 0
        ? `Added ${added} ${added === 1 ? "phone" : "phones"} to comparison.`
        : "Comparison is full (4 phones) or already contains these phones."
    );
  }

  if (!loggedIn) {
    return (
      <main className="page">
        <div className="page-inner">
          <header className="page-header">
            <h1 className="page-title">Favorites</h1>
          </header>
          <p className="page-status">
            <Link to="/login" className="text-link">Log in</Link> to save phones you like and find them here.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="page-inner">
        <header className="page-header">
          <h1 className="page-title">Favorites</h1>
          <span className="page-subtitle">
            {currentUser ? `Saved by ${currentUser.username || currentUser.name}` : ""}
            {!loading && ` · ${favorites.length} ${favorites.length === 1 ? "phone" : "phones"}`}
          </span>
        </header>

        {favorites.length >= 2 && (
          <div className="ui-actions" style={{ marginBottom: "1.25rem" }}>
            <button type="button" className="ui-btn ui-btn-small" onClick={handleCompareAll}>
              Add to comparison
            </button>
            <Link to="/compare" className="ui-btn ui-btn-small">Open comparison</Link>
          </div>
        )}

        {message && <p className="ui-alert ui-alert-success" style={{ marginBottom: "1.25rem" }}>{message}</p>}

        {loading && <PhoneGridSkeleton count={4} />}

        {!loading && error && <p className="page-status page-status-error">{error}</p>}

        {!loading && !error && favorites.length === 0 && (
          <p className="page-status">
            No favourites yet. <Link to="/browse" className="text-link">Browse the catalogue</Link> and
            use “Add to favorites” on a phone's page.
          </p>
        )}

        {!loading && favorites.length > 0 && (
          <ul className="phone-grid">
            {favorites.map((item) => (
              <li key={item.smartphoneId}>
                <PhoneCard
                  phone={item}
                  phoneId={item.smartphoneId}
                  meta={`Added ${new Date(item.addedAt).toLocaleDateString()}`}
                  action={(
                    <button
                      type="button"
                      className="phone-card-action"
                      title="Remove from favorites"
                      aria-label={`Remove ${item.modelName} from favorites`}
                      onClick={() => handleRemove(item.smartphoneId)}
                    >
                      <svg viewBox="0 0 16 16" aria-hidden="true">
                        <path d="M4 4l8 8M12 4l-8 8" />
                      </svg>
                    </button>
                  )}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

export default Favorites;
