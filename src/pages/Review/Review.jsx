import { useEffect, useState } from "react";
import Markdown from "react-markdown";
import { Link, useNavigate, useParams } from "react-router-dom";

import {
  addComment,
  deleteComment,
  deleteReview,
  getReviewById,
  getReviewComments,
  likeReview,
  setReviewStatus,
  unlikeReview,
} from "../../api/reviews";
import Icon from "../../components/Icon/Icon";
import { PageSkeleton } from "../../components/PhoneCard/PhoneCard";
import { useAuth } from "../../context/useAuth";
import "../../styles/reviews.css";

const STATUS_LABELS = {
  draft: "Draft",
  pending: "Waiting for verification",
  hidden: "Hidden by an administrator",
};

const COMMENT_MAX = 2000;
const COMMENTS_PER_PAGE = 50; // the same as the first page in getReviewById

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

  const [liking, setLiking] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [commentError, setCommentError] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);

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

  async function toggleLike() {
    const liked = review.likedByMe;
    setLiking(true);
    setModerationError("");

    try {
      const result = await (liked ? unlikeReview(review.id) : likeReview(review.id));
      setReview((prev) => ({
        ...prev,
        likedByMe: !liked,
        likeCount: result.likeCount ?? prev.likeCount + (liked ? -1 : 1),
      }));
    } catch (err) {
      setModerationError(err.message || "Could not update your like.");
    } finally {
      setLiking(false);
    }
  }

  async function handleAddComment(event) {
    event.preventDefault();

    const content = commentText.trim();
    if (!content) return;

    setPosting(true);
    setCommentError("");

    try {
      const comment = await addComment(review.id, content);
      setCommentText("");
      setReview((prev) => ({
        ...prev,
        commentCount: prev.commentCount + 1,
        comments: {
          ...prev.comments,
          // Comments run oldest first, so with more pages to load the new one isn't next in line.
          data: prev.comments.data.length >= prev.comments.total ? [...prev.comments.data, comment] : prev.comments.data,
          total: prev.comments.total + 1,
        },
      }));
    } catch (err) {
      setCommentError(err.message || "Could not post the comment.");
    } finally {
      setPosting(false);
    }
  }

  async function loadMoreComments() {
    setLoadingMore(true);

    try {
      const page = Math.floor(review.comments.data.length / COMMENTS_PER_PAGE) + 1;
      const result = await getReviewComments(review.id, page, COMMENTS_PER_PAGE);

      setReview((prev) => {
        const known = new Set(prev.comments.data.map((item) => item.id));
        return {
          ...prev,
          comments: { ...prev.comments, data: [...prev.comments.data, ...result.data.filter((item) => !known.has(item.id))], total: result.total },
        };
      });
    } catch (err) {
      setCommentError(err.message || "Could not load more comments.");
    } finally {
      setLoadingMore(false);
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
    return <PageSkeleton />;
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
        <Link to={`/phone/${review.smartphoneId}/reviews`} className="text-link review-back"><Icon name="arrowLeft" /> All reviews</Link>

        {isStaff && (
          <div className="review-moderation" role="group" aria-label="Moderation">
            <span className="ui-label">Moderation</span>
            <div className="ui-actions">
              {review.status === "pending" && (
                <>
                  <button type="button" className="ui-btn ui-btn-small ui-btn-primary" disabled={moderating} onClick={() => changeStatus("published")}>
                    <Icon name="check" /> Publish
                  </button>
                  <button type="button" className="ui-btn ui-btn-small" disabled={moderating} onClick={() => changeStatus("draft")}>
                    <Icon name="arrowLeft" /> Return to author
                  </button>
                </>
              )}
              {isAdmin && review.status === "published" && (
                <button type="button" className="ui-btn ui-btn-small" disabled={moderating} onClick={() => changeStatus("hidden")}>
                  <Icon name="eyeOff" /> Hide review
                </button>
              )}
              {isAdmin && review.status === "hidden" && (
                <button type="button" className="ui-btn ui-btn-small" disabled={moderating} onClick={() => changeStatus("published")}>
                  <Icon name="check" /> Publish again
                </button>
              )}
              {isAdmin && (
                <button type="button" className="ui-btn ui-btn-small ui-btn-danger" disabled={moderating} onClick={handleDeleteReview}>
                  <Icon name="trash" /> Delete review
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
          </p>
        </header>

        <div className="review-body">
          <Markdown components={markdownComponents}>{review.contentMarkdown}</Markdown>
        </div>

        {review.status === "published" && (
          <div className="review-reactions">
            {currentUser ? (
              <button
                type="button"
                className={`ui-btn ${review.likedByMe ? "ui-btn-primary" : ""}`}
                aria-pressed={review.likedByMe}
                disabled={liking}
                onClick={toggleLike}
              >
                <Icon name="thumbUp" /> {review.likedByMe ? "Liked" : "Like"} · {review.likeCount}
              </button>
            ) : (
              <Link to="/login" className="ui-btn" title="Log in to like this review">
                <Icon name="thumbUp" /> Like · {review.likeCount}
              </Link>
            )}
          </div>
        )}

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

            {currentUser ? (
              <form className="review-comment-form" onSubmit={handleAddComment}>
                <label className="ui-field">
                  <span className="ui-label">Add a comment</span>
                  <textarea
                    className="ui-input"
                    rows={3}
                    maxLength={COMMENT_MAX}
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                  />
                </label>

                {commentError && <p className="ui-alert ui-alert-error" role="alert">{commentError}</p>}

                <div className="review-comment-submit">
                  <span className="page-subtitle">{commentText.length} / {COMMENT_MAX}</span>
                  <button type="submit" className="ui-btn ui-btn-primary" disabled={posting || !commentText.trim()}>
                    <Icon name="comment" /> {posting ? "Posting…" : "Post comment"}
                  </button>
                </div>
              </form>
            ) : (
              <p className="page-subtitle review-comment-login">
                <Link to="/login" className="text-link">Log in</Link> to join the discussion.
              </p>
            )}

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
                          <Icon name="trash" /> Delete
                        </button>
                      )}
                    </div>
                    <p>{comment.content}</p>
                  </li>
                ))}
              </ul>
            )}

            {comments.length < review.comments.total && (
              <button type="button" className="ui-btn ui-btn-small review-comments-more" disabled={loadingMore} onClick={loadMoreComments}>
                <Icon name="comment" /> {loadingMore ? "Loading…" : "Show more comments"}
              </button>
            )}
          </section>
        )}
      </article>
    </main>
  );
}

export default Review;
