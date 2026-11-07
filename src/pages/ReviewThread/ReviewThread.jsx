import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { PageSkeleton } from "../../components/PhoneCard/PhoneCard";
import { getSmartphoneById } from "../../api/smartphones";
import { getReviewsBySmartphoneId } from "../../api/reviews";
import "../../styles/reviews.css";

const dateFormat = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });

function ReviewThread() {
  const { phoneId } = useParams();

  const [phone, setPhone] = useState(null);
  const [reviews, setReviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [phoneData, reviewsData] = await Promise.all([
          getSmartphoneById(phoneId),
          getReviewsBySmartphoneId(phoneId),
        ]);

        setPhone(phoneData);
        setReviews(reviewsData);
      } catch (error) {
        console.error(error);
        setError("Could not load reviews.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [phoneId]);

  if (loading) {
    return <PageSkeleton />;
  }

  if (error || !phone) {
    return <p className="page-status page-status-error">{error || "Phone not found."}</p>;
  }

  const phoneName = [phone.brandName, phone.modelName].filter(Boolean).join(" ");

  return (
    <main className="page">
      <div className="page-narrow">
        <Link to={`/phone/${phoneId}`} className="text-link">← {phoneName}</Link>

        <div className="page-header review-thread-header">
          <h1 className="page-title">Reviews</h1>
          <span className="page-subtitle">
            {reviews.length} {reviews.length === 1 ? "review" : "reviews"} mentioning {phoneName}
          </span>
        </div>

        {reviews.length === 0 ? (
          <p className="page-status">No reviews yet.</p>
        ) : (
          <ul className="review-list">
            {reviews.map((review) => (
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
                    {review.excerpt && <p className="review-card-excerpt">{review.excerpt}</p>}
                    <p className="review-meta">
                      {review.authorName || "A deleted user"} · {dateFormat.format(new Date(review.updatedAt))}
                      {" · "}{review.likeCount} {review.likeCount === 1 ? "like" : "likes"}
                      {" · "}{review.commentCount} {review.commentCount === 1 ? "comment" : "comments"}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

export default ReviewThread;
