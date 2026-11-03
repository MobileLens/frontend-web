import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import { Link, useNavigate, useParams } from "react-router-dom";

import { deleteComment, deleteReview, getReviewById, setReviewStatus } from "../../api/reviews";
import { useAuth } from "../../context/useAuth";
import "../../styles/reviews.css";

const STATUS_LABELS = {
  draft: "Draft",
  pending: "Waiting for verification",
  hidden: "Hidden by an administrator",
};

const dateTimeFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" });

function phoneLabel(phone) {
  return [phone.brandName, phone.modelName].filter(Boolean).join(" ");
}

// The file name identifies a media item whichever URL (original or thumbnail) points at it.
function mediaKey(url) {
  return url?.split("/").pop().split(".")[0];
}

function Review() {
  const { reviewId } = useParams();
  const navigate = useNavigate();
  const { currentUser, isStaff, isAdmin } = useAuth();

  const [review, setReview] = useState(null);
  const [moderating, setModerating] = useState(false);
  const [moderationError, setModerationError] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReview() {
      setLoading(true);
      setError("");

      try {
        setReview(await getReviewById(reviewId));
      } catch (reviewError) {
        console.error("Could not load review:", reviewError);
        setError(
          reviewError.status === 404 ? "Review not found." : "Could not load review."
        );
      } finally {
        setLoading(false);
      }
    }

    loadReview();
  }, [reviewId]);

  async function changeStatus(status) {
    setModerating(true);
    setModerationError("");

    try {
      const result = await setReviewStatus(review.id, status);
      // The response has no comments; keep the ones already shown.
      setReview((prev) => ({ ...result.review, comments: prev.comments }));
    } catch (err) {
      setModerationError(err.message || "Could not change the review status.");
    } finally {
      setModerating(false);
    }
  }

  async function handleDeleteReview() {
    if (!window.confirm("Delete this review with its comments and media? This cannot be undone.")) return;

    setModerating(true);
    setModerationError("");

    try {
      await deleteReview(review.id);
      navigate(`/phone/${review.smartphoneId}/reviews`, { replace: true });
    } catch (err) {
      setModerationError(err.message || "Could not delete the review.");
      setModerating(false);
    }
  }

  async function handleDeleteComment(comment) {
    if (!window.confirm("Delete this comment?")) return;

    try {
      await deleteComment(comment.id);
      setReview((prev) => ({
        ...prev,
        commentCount: prev.commentCount - 1,
        comments: {
          ...prev.comments,
          data: prev.comments.data.filter((item) => item.id !== comment.id),
          total: prev.comments.total - 1,
        },
      }));
    } catch (err) {
      setModerationError(err.message || "Could not delete the comment.");
    }
  }

  if (loading) {
    return <p className="page-status">Loading…</p>;
  }

  if (error || !review) {
    return <p className="page-status page-status-error">{error || "Review not found."}</p>;
  }

  const comments = review.comments?.data || [];
  const media = review.media || [];
  const mediumByKey = new Map(media.map((item) => [mediaKey(item.url), item.mediumUrl || item.url]));
  // Photos already placed in the text are not repeated below it.
  const inline = new Set(
    [...(review.contentMarkdown || "").matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)].map((match) => mediaKey(match[1]))
  );
  const gallery = media.filter((item) => !inline.has(mediaKey(item.url)));

  const markdownComponents = {
    img: ({ src, alt }) => <img src={mediumByKey.get(mediaKey(src)) || src} alt={alt || ""} loading="lazy" />,
    a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer noopener">{children}</a>,
  };

  return (
    <main className="page">
      <article className="page-narrow">
        <Link to={`/phone/${review.smartphoneId}/reviews`} className="text-link">← All reviews</Link>

        {isStaff && (
          <div className="review-moderation" role="group" aria-label="Moderation">
            <span className="ui-label">Moderation</span>
            <div className="ui-actions">
              {review.status === "pending" && (
                <>
                  <button type="button" className="ui-btn ui-btn-small ui-btn-primary" disabled={moderating} onClick={() => changeStatus("published")}>
                    Publish
                  </button>
                  <button type="button" className="ui-btn ui-btn-small" disabled={moderating} onClick={() => changeStatus("draft")}>
                    Return to author
                  </button>
                </>
              )}
              {isAdmin && review.status === "published" && (
                <button type="button" className="ui-btn ui-btn-small" disabled={moderating} onClick={() => changeStatus("hidden")}>
                  Hide review
                </button>
              )}
              {isAdmin && review.status === "hidden" && (
                <button type="button" className="ui-btn ui-btn-small" disabled={moderating} onClick={() => changeStatus("published")}>
                  Publish again
                </button>
              )}
              {isAdmin && (
                <button type="button" className="ui-btn ui-btn-small ui-btn-danger" disabled={moderating} onClick={handleDeleteReview}>
                  Delete review
                </button>
              )}
            </div>
          </div>
        )}

        {moderationError && <p className="ui-alert ui-alert-error" role="alert">{moderationError}</p>}

        <header className="review-header">
          {STATUS_LABELS[review.status] && <span className="ui-badge">{STATUS_LABELS[review.status]}</span>}
          <h1 className="page-title">{review.title}</h1>
          <p className="review-meta">
            {review.isComparison && "Comparison of "}
            {(review.phones || []).map((phone, index) => (
              <span key={phone.id}>
                {index > 0 && " vs "}
                <Link to={`/phone/${phone.id}`} className="review-phone-link">{phoneLabel(phone)}</Link>
              </span>
            ))}
          </p>
          <p className="review-meta">
            By {review.authorName || "a deleted user"} · {dateTimeFormat.format(new Date(review.updatedAt))}
            {" · "}{review.likeCount} {review.likeCount === 1 ? "like" : "likes"}
          </p>
        </header>

        <div className="review-body">
          <Markdown components={markdownComponents}>{review.contentMarkdown}</Markdown>
        </div>

        {gallery.length > 0 && (
          <section className="review-section" aria-labelledby="review-media">
            <h2 id="review-media" className="review-section-title">Photos and videos</h2>
            <ul className="review-gallery">
              {gallery.map((item) => (
                <li key={item.id}>
                  {item.type === "video" ? (
                    <video src={item.url} controls preload="metadata" />
                  ) : (
                    <a href={item.url} target="_blank" rel="noreferrer">
                      <img src={item.thumbUrl || item.url} alt="" loading="lazy" />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {review.comments && (
          <section className="review-section" aria-labelledby="review-comments">
            <h2 id="review-comments" className="review-section-title">
              Comments <span className="review-count">{review.comments.total}</span>
            </h2>

            {comments.length === 0 ? (
              <p className="page-subtitle">No comments yet.</p>
            ) : (
              <ul className="review-comments">
                {comments.map((comment) => (
                  <li key={comment.id} className="review-comment">
                    <div className="review-comment-head">
                      <strong>{comment.authorName}</strong>
                      <time dateTime={comment.createdAt}>{dateTimeFormat.format(new Date(comment.createdAt))}</time>
                      {(isAdmin || comment.authorId === currentUser?.id) && (
                        <button type="button" className="ui-btn ui-btn-small review-comment-delete" onClick={() => handleDeleteComment(comment)}>
                          Delete
                        </button>
                      )}
                    </div>
                    <p>{comment.content}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </article>
    </main>
  );
}

export default Review;
