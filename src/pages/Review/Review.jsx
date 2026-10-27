import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getSmartphoneById } from "../../api/smartphones";
import { getReviewById } from "../../api/reviews";

function Review() {
  const { phoneId, reviewId } = useParams();
  const navigate = useNavigate();

  const [phone, setPhone] = useState(null);
  const [review, setReview] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadReview() {
      setLoading(true);
      setError("");

      try {
        const reviewData = await getReviewById(reviewId);

        setReview(reviewData);

        try {
          const phoneData = await getSmartphoneById(phoneId);
          setPhone(phoneData);
        } catch (phoneError) {
          console.error("Could not load phone:", phoneError);
        }
      } catch (reviewError) {
        console.error("Could not load review:", reviewError);
        setError("Could not load review.");
      } finally {
        setLoading(false);
      }
    }

    loadReview();
  }, [phoneId, reviewId]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!review) {
    return <p>Review not found.</p>;
  }

  return (
    <main>
      <button
        type="button"
        onClick={() => navigate(`/phone/${phoneId}/reviews`)}
      >
        Back to Reviews
      </button>

      <h1>{review.title}</h1>

      {phone ? (
        <p>
          {phone.brandName || phone.brandId} {phone.modelName}
        </p>
      ) : (
        <p>Phone ID: {review.smartphoneId}</p>
      )}

      <p>Author: {review.authorId}</p>

      <h2>Review</h2>

      <pre>{review.contentMarkdown}</pre>

      {review.media && review.media.length > 0 && (
        <div>
          <h2>Media</h2>

          {review.media.map((mediaItem, index) => (
            <div key={index}>
              {JSON.stringify(mediaItem)}
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default Review;