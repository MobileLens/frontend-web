import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getSmartphoneById } from "../../api/smartphones";
import {
  addPhoneToCompare,
  isPhoneInCompare,
  removePhoneFromCompare,
} from "../../api/compare";

function PhoneSpecifications() {
  const { phoneId } = useParams();
  const navigate = useNavigate();

  const [phone, setPhone] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [isInCompare, setIsInCompare] = useState(false);
  const [compareMessage, setCompareMessage] = useState("");

  useEffect(() => {
    setIsInCompare(isPhoneInCompare(phoneId));
  }, [phoneId]);

  useEffect(() => {
    async function loadPhone() {
      setLoading(true);
      setError("");

      try {
        const data = await getSmartphoneById(phoneId);
        setPhone(data);
      } catch (error) {
        console.error(error);
        setError("Could not load phone information.");
      } finally {
        setLoading(false);
      }
    }

    loadPhone();
  }, [phoneId]);

  function handleAddToCompare() {
    if (!phone) {
      return;
    }

    const result = addPhoneToCompare(phone);

    if (!result.success) {
      if (result.reason === "limit") {
        setCompareMessage(
          "Could not add this phone. You already have 4 phones in comparison. Please remove a phone first."
        );
      }

      if (result.reason === "already-added") {
        setCompareMessage("This phone is already in comparison.");
      }

      return;
    }

    setIsInCompare(true);
    setCompareMessage("Phone added to comparison.");
  }

  function handleRemoveFromCompare() {
    removePhoneFromCompare(phoneId);

    setIsInCompare(false);
    setCompareMessage("Phone removed from comparison.");
  }

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
      <button type="button" onClick={() => navigate("/")}>
        Back to Home
      </button>

      <h1>
        {phone.brandName || "Phone"} {phone.modelName}
      </h1>

      {phone.imageUrl && (
        <img
          src={phone.imageUrl}
          alt={phone.modelName}
          width="300"
        />
      )}

      <div>
          <button
              type="button"
              onClick={() =>
              navigate(`/phone/${phone.id}/reviews`)
              }
              >
              Review Thread
          </button>
        {isInCompare ? (
          <button
            type="button"
            onClick={handleRemoveFromCompare}
          >
            Remove from Compare
          </button>
        ) : (
          <button
            type="button"
            onClick={handleAddToCompare}
          >
            Add to Compare
          </button>
        )}
      </div>

      {compareMessage && <p>{compareMessage}</p>}

      <h2>Phone information</h2>

      <p>ID: {phone.id}</p>
      <p>Brand ID: {phone.brandId}</p>
      <p>Model: {phone.modelName}</p>
      <p>Release date: {phone.releaseDate}</p>
      <p>View count: {phone.viewCount}</p>
      <p>Added by: {phone.addedBy}</p>
      <p>Verified by: {phone.verifiedBy}</p>
      <p>Created at: {phone.createdAt}</p>

      <h2>Cameras</h2>

      {phone.cameras && phone.cameras.length > 0 ? (
        phone.cameras.map((camera) => (
          <div key={camera.id}>
            <h3>
              {camera.facing} {camera.type}
            </h3>

            <p>Resolution: {camera.resolutionMp} MP</p>
            <p>
              Active resolution: {camera.activeResolutionMp} MP
            </p>
            <p>Focal length: {camera.focalLengthMm} mm</p>
            <p>Aperture: f/{camera.aperture}</p>
            <p>Crop factor: {camera.cropFactor}</p>
            <p>Pixel pitch: {camera.pixelPitchUm} μm</p>
            <p>AF zones: {camera.afZones}</p>
            <p>OIS: {camera.ois}</p>
            <p>Submitted by: {camera.submitterId}</p>
            <p>Status: {camera.status}</p>

            {camera.videoModes && camera.videoModes.length > 0 && (
              <div>
                <h4>Video modes</h4>

                {camera.videoModes.map((mode, index) => (
                  <p key={index}>
                    {JSON.stringify(mode)}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))
      ) : (
        <p>No camera information available.</p>
      )}
    </main>
  );
}

export default PhoneSpecifications;