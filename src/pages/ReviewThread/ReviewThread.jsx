import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import Icon from "../../components/Icon/Icon";
import { PageSkeleton } from "../../components/PhoneCard/PhoneCard";
import { getSmartphoneById } from "../../api/smartphones";
import { getReviewsBySmartphoneId } from "../../api/reviews";
import { useAuth } from "../../context/useAuth";
import { withoutCaptions } from "../../utils/reviewCaptions";
import "../../styles/reviews.css";

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

// The backend's ?comparison= filter.
const FILTERS = [
  { value: "", label: "All reviews" },
  { value: "exclude", label: "This phone only" },
  { value: "only", label: "Comparisons" },
];

function ReviewThread() {
  const { phoneId } = useParams();
  const { currentUser } = useAuth();

  const [phone, setPhone] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState("");
  const [loadedKey, setLoadedKey] = useState(null);
  const [error, setError] = useState("");

  const key = `${phoneId}|${filter}`;

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      setError("");

      try {
        const [phoneData, reviewsData] = await Promise.all([
          getSmartphoneById(phoneId),
          getReviewsBySmartphoneId(phoneId, { comparison: filter || undefined }),
        ]);

        if (ignore) return;
        setPhone(phoneData);
        setReviews(reviewsData);
      } catch (err) {
        console.error(err);
        if (!ignore) setError("Could not load reviews.");
      } finally {
        if (!ignore) setLoadedKey(`${phoneId}|${filter}`);
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [phoneId, filter]);

  // The first load shows a skeleton; a filter change keeps the page and dims the list.
  if (!phone && !error) {
    return <PageSkeleton />;
  }

  if (!phone) {
    return <p className="page-status page-status-error">{error || "Phone not found."}</p>;
  }

  const updating = loadedKey !== key;
  const phoneName = [phone.brandName, phone.modelName].filter(Boolean).join(" ");
  const writeLink = `/review/new?phone=${encodeURIComponent(phoneId)}`;

  return (
    <main className="page">
      <div className="page-narrow">
        <Link to={`/phone/${phoneId}`} className="text-link review-back"><Icon name="arrowLeft" /> {phoneName}</Link>

        <div className="page-header review-thread-header">
          <div>
            <h1 className="page-title">Reviews</h1>
            <span className="page-subtitle">
              {reviews.length} {reviews.length === 1 ? "review" : "reviews"} mentioning {phoneName}
            </span>
          </div>
          {currentUser ? (
            <Link to={writeLink} className="ui-btn ui-btn-primary"><Icon name="edit" /> Write a review</Link>
          ) : (
            <Link to="/login" state={{ from: writeLink }} className="ui-btn" title="Log in to write a review">
              <Icon name="edit" /> Write a review
            </Link>
          )}
        </div>

        <div className="lens-tabs review-filters" role="group" aria-label="Show">
          {FILTERS.map((item) => (
            <button
              key={item.value}
              type="button"
              className={`lens-tab ${item.value === filter ? "is-active" : ""}`}
              aria-pressed={item.value === filter}
              onClick={() => setFilter(item.value)}
            >
              <span className="lens-tab-name">{item.label}</span>
            </button>
          ))}
        </div>

        {error && <p className="page-status page-status-error">{error}</p>}

        {!error && !updating && reviews.length === 0 && (
          <p className="page-status">
            {filter ? "No reviews of this kind yet." : "No reviews yet."}{" "}
            {currentUser && <Link to={writeLink} className="text-link">Be the first to write one.</Link>}
          </p>
        )}

        {reviews.length > 0 && (
          <ul className={`review-list ${updating ? "is-updating" : ""}`} aria-busy={updating}>
            {reviews.map((review) => {
              const excerpt = withoutCaptions(review.excerpt);

              return (
                <li key={review.id}>
                  <Link to={`/review/${review.id}`} className="review-card">
                    {review.coverUrl && <img className="review-card-cover" src={review.coverUrl} alt="" loading="lazy" />}
                    <div className="review-card-body">
                      {review.isComparison && (
                        <span className="review-card-tag">
                          Comparison: {(review.phones || []).map((item) => item.modelName).join(" vs ")}
                        </span>
                      )}
                      <h2 className="review-card-title">{review.title}</h2>
                      {excerpt && <p className="review-card-excerpt">{excerpt}</p>}
                      <p className="review-meta">
                        {review.authorName || "A deleted user"} · {dateFormat.format(new Date(review.updatedAt))}
                        {" · "}{review.likeCount} {review.likeCount === 1 ? "like" : "likes"}
                        {" · "}{review.commentCount} {review.commentCount === 1 ? "comment" : "comments"}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

export default ReviewThread;
