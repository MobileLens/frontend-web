import { useCallback, useState } from "react";
import { deleteReview, getReviewDetail, setReviewStatus } from "../../../api/admin";
import { getSmartphoneById } from "../../../api/smartphones";
import { useAsyncData } from "../useAsyncData";
import { formatDate, phoneLabel } from "../format";
import Modal from "../components/Modal";
import StatusBadge from "../components/StatusBadge";

// Backend rules (PATCH /api/reviews/:id): moderators may only move pending -> published|draft;
// admins may set any status and delete.
function availableActions(status, isAdmin) {
  const actions = [];

  if (status !== "published" && (isAdmin || status === "pending")) {
    actions.push({
      id: "publish",
      label: status === "hidden" ? "Unhide & publish" : "Publish",
      status: "published",
      tone: "success",
    });
  }
  if (status !== "draft" && (isAdmin || status === "pending")) {
    actions.push({ id: "draft", label: "Send back to author", status: "draft", tone: "outline" });
  }
  if (isAdmin && status !== "hidden") {
    actions.push({ id: "hide", label: "Hide", status: "hidden", tone: "danger" });
  }
  if (isAdmin) {
    actions.push({ id: "delete", label: "Delete permanently", tone: "danger" });
  }

  return actions;
}

async function loadReview(reviewId) {
  const review = await getReviewDetail(reviewId);
  const phone = review.smartphoneId ? await getSmartphoneById(review.smartphoneId).catch(() => null) : null;
  return { review, phone };
}

export default function ReviewModal({ reviewId, isAdmin, onClose, onDone }) {
  const loader = useCallback(() => loadReview(reviewId), [reviewId]);
  const { data, loading, error } = useAsyncData(loader);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const review = data?.review;

  async function runAction(action) {
    if (action.id === "delete" && !window.confirm("Delete this review permanently? Its media, comments and likes are deleted too.")) {
      return;
    }
    if (action.id === "hide" && !window.confirm("Hide this review from the public?")) {
      return;
    }

    setBusy(true);
    setActionError("");

    try {
      if (action.id === "delete") await deleteReview(review.id);
      else await setReviewStatus(review.id, action.status);
      onDone();
    } catch (err) {
      setActionError(err.message);
      setBusy(false);
    }
  }

  const actions = review ? availableActions(review.status, isAdmin) : [];

  return (
    <Modal
      title={review ? review.title || "Untitled review" : "Review"}
      subtitle={review ? `by ${review.authorName || "unknown author"}` : undefined}
      onClose={onClose}
      size="lg"
      footer={
        review && (
          <>
            {actionError && <p className="admin-inline-error modal-footer-error" role="alert">{actionError}</p>}
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`btn btn-${action.tone} btn-fixed`}
                disabled={busy}
                onClick={() => runAction(action)}
              >
                {action.label}
              </button>
            ))}
          </>
        )
      }
    >
      {loading && !data && <p className="admin-empty">Loading review…</p>}
      {error && <div className="admin-error" role="alert">Could not load review: {error.message}</div>}

      {review && (
        <>
          <dl className="detail-list">
            <div><dt>Status</dt><dd><StatusBadge status={review.status} /></dd></div>
            <div><dt>Phone</dt><dd>{data.phone ? phoneLabel(data.phone) : review.smartphoneId}</dd></div>
            <div><dt>Created</dt><dd>{formatDate(review.createdAt, true)}</dd></div>
            <div><dt>Updated</dt><dd>{formatDate(review.updatedAt, true)}</dd></div>
            <div><dt>Likes</dt><dd>{review.likeCount ?? 0}</dd></div>
            <div><dt>Comments</dt><dd>{review.commentCount ?? 0}</dd></div>
          </dl>

          <div className="review-content">{review.contentMarkdown || <em>No content.</em>}</div>

          {review.media?.length > 0 && (
            <>
              <h4 className="detail-heading">Attached media ({review.media.length})</h4>
              <div className="media-grid media-grid-compact">
                {review.media.map((item) => (
                  <a
                    key={item.id}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="media-preview"
                    title="Open in a new tab"
                  >
                    {item.type === "video" ? (
                      <video src={item.url} preload="metadata" muted playsInline />
                    ) : (
                      <img src={item.url} alt="" loading="lazy" />
                    )}
                  </a>
                ))}
              </div>
            </>
          )}

          {!isAdmin && review.status !== "pending" && (
            <p className="editor-note">Only admins can change reviews that are not pending.</p>
          )}
        </>
      )}
    </Modal>
  );
}
