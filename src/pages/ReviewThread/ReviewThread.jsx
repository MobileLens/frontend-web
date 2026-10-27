import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getSmartphoneById } from "../../api/smartphones";
import { getReviewsBySmartphoneId } from "../../api/reviews";

function ReviewThread() {
  const { phoneId } = useParams();
  const navigate = useNavigate();

  const [phone, setPhone] = useState(null);
  const [reviews, setReviews] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const phoneData = await getSmartphoneById(phoneId);
        const reviewsData = await getReviewsBySmartphoneId(phoneId);

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
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (!phone) {
    return <p>Phone not found.</p>;
  }

  return (
    <main>
      <button
        type="button"
        onClick={() => navigate(`/phone/${phoneId}`)}
      >
        Back to phone
      </button>

      <h1>Reviews</h1>

      <h2>
        {phone.brandName || phone.brandId} {phone.modelName}
      </h2>

      {reviews.length === 0 ? (
        <p>No reviews found.</p>
      ) : (
        <div>
          {reviews.map((review) => (
            <div key={review.id}>
              <h3>{review.title}</h3>

              <p>Author: {review.authorId}</p>

              <button
                type="button"
                onClick={() =>
                    navigate(`/review/${review.id}`
                  )
                }
              >
                Read
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

export default ReviewThread;