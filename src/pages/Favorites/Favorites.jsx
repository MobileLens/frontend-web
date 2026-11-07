import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFavorites, removeFavorite } from "../../api/favorites";
import Icon from "../../components/Icon/Icon";
import { PhoneCard, PhoneGridSkeleton } from "../../components/PhoneCard/PhoneCard";
import { isLoggedIn } from "../../utils/auth";

function Favorites() {
  const loggedIn = isLoggedIn();

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(loggedIn);
  const [error, setError] = useState("");

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
          setError("Could not load your favorite phones.");
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
    setError("");

    try {
      await removeFavorite(smartphoneId);
    } catch (err) {
      console.error(err);
      setFavorites(previous);
      setError("Could not remove the phone from favorites.");
    }
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
          {!loading && (
            <span className="page-subtitle">
              {favorites.length} {favorites.length === 1 ? "phone" : "phones"}
            </span>
          )}
        </header>

        {loading && <PhoneGridSkeleton count={4} />}

        {error && <p className="page-status page-status-error">{error}</p>}

        {!loading && !error && favorites.length === 0 && (
          <p className="page-status">
            No favorites yet. <Link to="/browse" className="text-link">Browse the catalogue</Link> and
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
                      className="phone-card-action phone-card-action-danger"
                      title="Remove from favorites"
                      aria-label={`Remove ${item.modelName} from favorites`}
                      onClick={() => handleRemove(item.smartphoneId)}
                    >
                      <Icon name="trash" />
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
