import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getSmartphoneById } from "../../api/smartphones";
import { getComparePhones, removePhoneFromCompare } from "../../api/compare";

function formatParameterName(name) {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatValue(value) {
  if (value === null || value === undefined) {
    return "-";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function Compare() {
  const navigate = useNavigate();

  const [comparePhones, setComparePhones] = useState([]);
  const [phoneDetails, setPhoneDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadComparePhones() {
      const phones = getComparePhones();

      setComparePhones(phones);

      if (phones.length < 2) {
        setPhoneDetails([]);
        setLoading(false);
        return;
      }

      try {
        const details = await Promise.all(
          phones.map((phone) => getSmartphoneById(phone.id))
        );

        setPhoneDetails(details);
      } catch (error) {
        console.error(error);
        setError("Could not load comparison data.");
      } finally {
        setLoading(false);
      }
    }

    loadComparePhones();
  }, []);

  function handleRemove(phoneId) {
    const updatedPhones = removePhoneFromCompare(phoneId);

    setComparePhones(updatedPhones);

    if (updatedPhones.length < 2) {
      setPhoneDetails([]);
      return;
    }

    async function reloadDetails() {
      try {
        const details = await Promise.all(
          updatedPhones.map((phone) =>
            getSmartphoneById(phone.id)
          )
        );

        setPhoneDetails(details);
      } catch (error) {
        console.error(error);
        setError("Could not reload comparison data.");
      }
    }

    reloadDetails();
  }

  if (loading) {
    return <p>Loading...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (comparePhones.length < 2) {
    return (
      <main>
        <h1>Phone Compare</h1>

        <p>
          To compare phones, you must add at least 2 phones.
        </p>

        <button
          type="button"
          onClick={() => navigate("/")}
        >
          Go to search
        </button>
      </main>
    );
  }

  return (
    <main>
      <h1>Phone Compare</h1>

      <table border="1">
        <thead>
          <tr>
            <th>Parameter</th>

            {phoneDetails.map((phone) => (
              <th key={phone.id}>
                {phone.imageUrl && (
                  <div>
                    <img
                      src={phone.imageUrl}
                      alt={phone.modelName}
                      width="150"
                    />
                  </div>
                )}

                <div>
                  <strong>{phone.modelName}</strong>
                </div>

                <div>
                  {phone.brandName || phone.brandId}
                </div>

                <div>
                    <button
                      type="button"
                      onClick={() =>
                      navigate(`/phone/${phone.id}/reviews`)
                      }
                      >
                      Review Thread
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(phone.id)}
                  >
                    Remove from Compare
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>Phone ID</td>

            {phoneDetails.map((phone) => (
              <td key={phone.id}>
                {formatValue(phone.id)}
              </td>
            ))}
          </tr>

          <tr>
            <td>Brand ID</td>

            {phoneDetails.map((phone) => (
              <td key={phone.id}>
                {formatValue(phone.brandId)}
              </td>
            ))}
          </tr>

          <tr>
            <td>Model name</td>

            {phoneDetails.map((phone) => (
              <td key={phone.id}>
                {formatValue(phone.modelName)}
              </td>
            ))}
          </tr>

          <tr>
            <td>Release date</td>

            {phoneDetails.map((phone) => (
              <td key={phone.id}>
                {formatValue(phone.releaseDate)}
              </td>
            ))}
          </tr>

          <tr>
            <td>View count</td>

            {phoneDetails.map((phone) => (
              <td key={phone.id}>
                {formatValue(phone.viewCount)}
              </td>
            ))}
          </tr>

          <tr>
            <td>Added by</td>

            {phoneDetails.map((phone) => (
              <td key={phone.id}>
                {formatValue(phone.addedBy)}
              </td>
            ))}
          </tr>

          <tr>
            <td>Verified by</td>

            {phoneDetails.map((phone) => (
              <td key={phone.id}>
                {formatValue(phone.verifiedBy)}
              </td>
            ))}
          </tr>

          <tr>
            <td>Created at</td>

            {phoneDetails.map((phone) => (
              <td key={phone.id}>
                {formatValue(phone.createdAt)}
              </td>
            ))}
          </tr>

          <tr>
            <td>Number of cameras</td>

            {phoneDetails.map((phone) => (
              <td key={phone.id}>
                {phone.cameras?.length || 0}
              </td>
            ))}
          </tr>

          {getCameraParameters(phoneDetails).map((parameter) => (
            <tr key={parameter}>
              <td>{formatParameterName(parameter)}</td>

              {phoneDetails.map((phone) => (
                <td key={phone.id}>
                  {formatCameraParameter(phone, parameter)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}

function getCameraParameters(phones) {
  const parameters = new Set();

  phones.forEach((phone) => {
    if (!phone.cameras) {
      return;
    }

    phone.cameras.forEach((camera) => {
      Object.keys(camera).forEach((key) => {
        if (key !== "id" && key !== "smartphoneId") {
          parameters.add(key);
        }
      });
    });
  });

  return Array.from(parameters);
}

function formatCameraParameter(phone, parameter) {
  if (!phone.cameras || phone.cameras.length === 0) {
    return "-";
  }

  const values = phone.cameras.map((camera, index) => {
    const value = camera[parameter];

    if (value === undefined || value === null) {
      return `Camera ${index + 1}: -`;
    }

    return `Camera ${index + 1}: ${formatValue(value)}`;
  });

  return values.join(" | ");
}

export default Compare;