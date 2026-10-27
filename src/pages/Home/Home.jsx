import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { searchSmartphones } from "../../api/smartphones";

function Home() {
  const [query, setQuery] = useState("");
  const [phones, setPhones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  async function handleSearch(event) {
    event.preventDefault();

    if (!query.trim()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const results = await searchSmartphones(query.trim());
      setPhones(results);
    } catch (error) {
      console.error(error);
      setError("Could not load phones.");
      setPhones([]);
    } finally {
      setLoading(false);
    }
  }

  function handlePhoneClick(phoneId) {
    navigate(`/phone/${phoneId}`);
  }

  return (
    <main>
      <h1>Search for a phone</h1>

      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Enter phone name..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <button type="submit">
          Search
        </button>
      </form>

      {loading && <p>Loading...</p>}

      {error && <p>{error}</p>}

      {!loading && phones.length > 0 && (
        <div>
          <h2>Search results</h2>

          {phones.map((phone) => (
            <div key={phone.id}>
              <button
                type="button"
                onClick={() => handlePhoneClick(phone.id)}
              >
                {phone.brandName} {phone.modelName}
              </button>

              {phone.imageUrl && (
                <img
                  src={phone.imageUrl}
                  alt={phone.modelName}
                  width="150"
                />
              )}

              <p>Release date: {phone.releaseDate}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && !error && query && phones.length === 0 && (
        <p>No phones found.</p>
      )}
    </main>
  );
}

export default Home;