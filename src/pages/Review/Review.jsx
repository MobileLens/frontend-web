import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getReviewById } from "../../api/reviews";

function phoneLabel(phone) {
  return [phone.brandName, phone.modelName].filter(Boolean).join(" ");
}

function Review() {
  const { reviewId } = useParams();
  const navigate = useNavigate();

  const [review, setReview] = useState(null);

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

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!review) {
    return <p>Review not found.</p>;
  }

  const comments = review.comments?.data || [];

  return (
    <main>
      <button
        type="button"
        onClick={() => navigate(`/phone/${review.smartphoneId}/reviews`)}
      >
        Back to Reviews
      </button>

      <h1>{review.title}</h1>

      {review.phones && review.phones.length > 0 ? (
        <p>
          {review.isComparison && "Comparison: "}
          {review.phones.map(phoneLabel).join(" vs ")}
        </p>
      ) : (
        <p>Phone ID: {review.smartphoneId}</p>
      )}

      <p>Author: {review.authorName || review.authorId}</p>

      <p>
        {review.likeCount} {review.likeCount === 1 ? "like" : "likes"} ·{" "}
        {review.commentCount} {review.commentCount === 1 ? "comment" : "comments"}
      </p>

      <h2>Review</h2>

      <pre>{review.contentMarkdown}</pre>

      {review.media && review.media.length > 0 && (
        <div>
          <h2>Media</h2>

          {review.media.map((mediaItem) => (
            <div key={mediaItem.id}>
              {mediaItem.type === "video" ? (
                <video src={mediaItem.url} controls width="480" />
              ) : (
                <a href={mediaItem.url} target="_blank" rel="noreferrer">
                  <img
                    src={mediaItem.mediumUrl || mediaItem.url}
                    alt=""
                    width="480"
                  />
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {review.comments && (
        <div>
          <h2>Comments ({review.comments.total})</h2>

          {comments.length === 0 ? (
            <p>No comments yet.</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id}>
                <p>
                  <strong>{comment.authorName}</strong>{" "}
                  {new Date(comment.createdAt).toLocaleString()}
                </p>
                <p>{comment.content}</p>
              </div>
            ))
          )}
        </div>
      )}
    </main>
  );
}

export default Review;
