import { useState } from "react";
import Icon from "../../components/Icon/Icon";
import { Link } from "react-router-dom";
import { getHiddenReviews, getPendingReviews } from "../../api/admin";
import { deleteReview, setReviewStatus } from "../../api/reviews";
import { EmptyNote, LoadState, Section } from "./adminUi";
import { errorText, formatDateTime, phoneName, useAdminData } from "./adminUtils";

const noHiddenReviews = () => Promise.resolve([]);

function ReviewItem({ review, children }) {
  return (
    <li className="admin-list-item">
      <div className="admin-list-main">
        <Link className="admin-list-title" to={`/review/${review.id}`}>{review.title}</Link>
        <div className="admin-meta">
          {review.isComparison && "Comparison: "}
          {(review.phones || []).map(phoneName).join(" vs ") || "Unknown phone"}
          {" · "}by {review.authorName || "deleted user"}
          {" · "}updated {formatDateTime(review.updatedAt)}
          {review.mediaCount > 0 && ` · ${review.mediaCount} media`}
        </div>
        {review.excerpt && <p className="admin-excerpt">{review.excerpt}</p>}
      </div>
      <div className="ui-actions admin-list-actions">{children}</div>
    </li>
  );
}

export default function ReviewsTab({ isAdmin, notify, onChanged }) {
  const pending = useAdminData(getPendingReviews);
  const hidden = useAdminData(isAdmin ? getHiddenReviews : noHiddenReviews);
  const [busyId, setBusyId] = useState(null);

  async function run(review, action, successText) {
    setBusyId(review.id);

    try {
      await action();
      pending.setData((rows) => rows?.filter((row) => row.id !== review.id));
      hidden.setData((rows) => rows?.filter((row) => row.id !== review.id));
      notify(successText);
      onChanged();
    } catch (err) {
      notify(errorText(err, "Could not update the review."), "error");
      pending.reload();
      hidden.reload();
    } finally {
      setBusyId(null);
    }
  }

  const publish = (review) =>
    run(review, () => setReviewStatus(review.id, "published"), `Published “${review.title}”.`);

  const returnToAuthor = (review) =>
    run(review, () => setReviewStatus(review.id, "draft"), `Returned “${review.title}” to its author.`);

  function remove(review) {
    if (!window.confirm(`Delete “${review.title}” with its comments and media? This cannot be undone.`)) return;
    run(review, () => deleteReview(review.id), `Deleted “${review.title}”.`);
  }

  return (
    <>
      <Section title="Waiting for verification" count={pending.data?.length}>
        <LoadState loading={pending.loading} error={pending.error} errorMessage="Could not load pending reviews." />

        {pending.data?.length === 0 && <EmptyNote>No reviews are waiting.</EmptyNote>}

        {pending.data?.length > 0 && (
          <ul className="admin-list">
            {pending.data.map((review) => (
              <ReviewItem key={review.id} review={review}>
                <button type="button" className="ui-btn ui-btn-small ui-btn-primary" disabled={busyId === review.id} onClick={() => publish(review)}>
                  <Icon name="check" /> Publish
                </button>
                <button type="button" className="ui-btn ui-btn-small" disabled={busyId === review.id} onClick={() => returnToAuthor(review)}>
                  <Icon name="arrowLeft" /> Return to author
                </button>
                {isAdmin && (
                  <button type="button" className="ui-btn ui-btn-small ui-btn-danger" disabled={busyId === review.id} onClick={() => remove(review)}>
                    <Icon name="trash" /> Delete
                  </button>
                )}
              </ReviewItem>
            ))}
          </ul>
        )}
      </Section>

      {isAdmin && (
        <Section title="Hidden reviews" count={hidden.data?.length}>
          <p className="admin-hint admin-section-intro">
            To hide a published review, open it: admins get moderation buttons above the review.
          </p>

          <LoadState loading={hidden.loading} error={hidden.error} errorMessage="Could not load hidden reviews." />

          {hidden.data?.length === 0 && <EmptyNote>No hidden reviews.</EmptyNote>}

          {hidden.data?.length > 0 && (
            <ul className="admin-list">
              {hidden.data.map((review) => (
                <ReviewItem key={review.id} review={review}>
                  <button type="button" className="ui-btn ui-btn-small" disabled={busyId === review.id} onClick={() => publish(review)}>
                    <Icon name="check" /> Publish again
                  </button>
                  <button type="button" className="ui-btn ui-btn-small ui-btn-danger" disabled={busyId === review.id} onClick={() => remove(review)}>
                    <Icon name="trash" /> Delete
                  </button>
                </ReviewItem>
              ))}
            </ul>
          )}
        </Section>
      )}
    </>
  );
}
