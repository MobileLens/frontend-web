import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { deleteReview, getMyReviews } from "../../api/reviews";
import Icon from "../../components/Icon/Icon";
import { PageSkeleton } from "../../components/PhoneCard/PhoneCard";
import { useAuth } from "../../context/useAuth";
import { withoutCaptions } from "../../utils/reviewCaptions";
import "../../styles/reviews.css";

const PAGE_SIZE = 20;

const STATUS_LABELS = {
  draft: "Draft",
  pending: "Waiting for verification",
  published: "Published",
  hidden: "Hidden by an administrator",
};

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

// The signed-in user's reviews in every status, to open, edit or delete them.
export default function MyReviews() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const userId = currentUser?.id;

  const [reviews, setReviews] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(location.state?.notice || "");
  const [deleting, setDeleting] = useState(null);

  // The message from the review page is shown once: a reload doesn't bring it back.
  useEffect(() => {
    if (location.state?.notice) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!userId) return undefined;
    let ignore = false;

    getMyReviews(page, PAGE_SIZE).then(
      (data) => {
        if (ignore) return;
        setReviews((current) => {
          if (page === 1) return data.data;
          const known = new Set(current.map((item) => item.id));
          return [...current, ...data.data.filter((item) => !known.has(item.id))];
        });
        setTotal(data.total);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        if (ignore) return;
        setError("Could not load your reviews.");
        setLoading(false);
      },
    );

    return () => {
      ignore = true;
    };
  }, [page, userId]);

  async function handleDelete(review) {
    if (!window.confirm(`Delete “${review.title}” with its comments and photos? This cannot be undone.`)) return;

    setDeleting(review.id);
    setError("");

    try {
      await deleteReview(review.id);
      setReviews((current) => current.filter((item) => item.id !== review.id));
      setTotal((current) => current - 1);
      setNotice("Review deleted.");
    } catch (err) {
      setError(err.message || "Could not delete the review.");
    } finally {
      setDeleting(null);
    }
  }

  if (authLoading) {
    return <PageSkeleton />;
  }

  if (!currentUser) {
    return (
      <p className="page-status">
        <Link to="/login" state={{ from: "/reviews/mine" }} className="text-link">Log in</Link> to see your reviews.
      </p>
    );
  }

  return (
    <main className="page">
      <div className="page-narrow">
        <header className="page-header my-reviews-header">
          <div>
            <h1 className="page-title">My reviews</h1>
            {!loading && <span className="page-subtitle">{total} {total === 1 ? "review" : "reviews"}</span>}
          </div>
          <Link to="/review/new" className="ui-btn ui-btn-primary"><Icon name="edit" /> Write a review</Link>
        </header>

        {notice && <p className="ui-alert ui-alert-success my-reviews-notice" role="status">{notice}</p>}
        {error && <p className="ui-alert ui-alert-error my-reviews-notice" role="alert">{error}</p>}

        {loading && reviews.length === 0 && <PageSkeleton />}

        {!loading && reviews.length === 0 && !error && (
          <p className="page-status">
            You haven&apos;t written any reviews yet. Open a phone in the{" "}
            <Link to="/browse" className="text-link">catalogue</Link> and choose Reviews → Write a review, or start here
            and pick the phone in the editor.
          </p>
        )}

        {reviews.length > 0 && (
          <ul className="review-list">
            {reviews.map((review) => {
              const excerpt = withoutCaptions(review.excerpt);

              return (
                <li key={review.id} className="review-card review-card-own">
                  {review.coverUrl && <img className="review-card-cover" src={review.coverUrl} alt="" loading="lazy" />}
                  <div className="review-card-body">
                    <span className={`ui-badge review-status review-status-${review.status}`}>{STATUS_LABELS[review.status]}</span>
                    <h2 className="review-card-title">
                      <Link to={`/review/${review.id}`} className="review-card-link">{review.title}</Link>
                    </h2>
                    <p className="review-meta">
                      {(review.phones || []).map((phone) => [phone.brandName, phone.modelName].filter(Boolean).join(" ")).join(" vs ")}
                      {" · "}{dateFormat.format(new Date(review.updatedAt))}
                      {review.status === "published" && (
                        <>
                          {" · "}{review.likeCount} {review.likeCount === 1 ? "like" : "likes"}
                          {" · "}{review.commentCount} {review.commentCount === 1 ? "comment" : "comments"}
                        </>
                      )}
                    </p>
                    {excerpt && <p className="review-card-excerpt">{excerpt}</p>}
                    <div className="ui-actions review-card-actions">
                      <Link to={`/review/${review.id}/edit`} className="ui-btn ui-btn-small"><Icon name="edit" /> Edit</Link>
                      <button
                        type="button"
                        className="ui-btn ui-btn-small ui-btn-danger"
                        disabled={deleting === review.id}
                        onClick={() => handleDelete(review)}
                      >
                        <Icon name="trash" /> {deleting === review.id ? "Deleting…" : "Delete"}
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {reviews.length < total && (
          <button
            type="button"
            className="ui-btn ui-btn-small review-comments-more"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              setPage((current) => current + 1);
            }}
          >
            {loading ? "Loading…" : "Show more"}
          </button>
        )}
      </div>
    </main>
  );
}
