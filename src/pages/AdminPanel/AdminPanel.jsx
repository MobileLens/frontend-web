import { useEffect, useState } from "react";
import {
  getPendingReviews,
  getHiddenReviews,
  getAdminUsers,
  getAdminStats,
  getAdminDashboard,
  getAdminBans,
  getPromotionOffers,
  getPendingCameras,
  reviewCamera,
} from "../../api/admin";
import "./AdminPanel.css"; // Dedykowany styl human design

function DataTable({ title, columns, rows, emptyMessage }) {
  return (
    <div className="admin-section">
      <h3 className="admin-section-title">{title}</h3>
      {(!rows || rows.length === 0) ? (
        <p style={{ color: "#6b7280", margin: 0 }}>{emptyMessage}</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.key}>{column.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id ?? index}>
                  {columns.map((column) => (
                    <td key={column.key}>
                      {column.render ? column.render(row) : (row[column.key] !== undefined && row[column.key] !== null ? String(row[column.key]) : "—")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value }) {
  return (
    <div className="stat-card">
      <h4 className="stat-title">{title}</h4>
      <p className="stat-value">{value ?? "—"}</p>
    </div>
  );
}

export default function AdminPanel() {
  const [dashboard, setDashboard] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [bans, setBans] = useState([]);
  const [hiddenReviews, setHiddenReviews] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [pendingCameras, setPendingCameras] = useState([]);
  
  const [error, setError] = useState("");
  const [isForbidden, setIsForbidden] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadAdminData = async () => {
    try {
      const results = await Promise.allSettled([
        getAdminDashboard(),
        getAdminStats(),
        getAdminUsers(),
        getAdminBans(),
        getHiddenReviews(),
        getPromotionOffers(),
        getPendingCameras(),
      ]);

      const hasForbiddenError = results.some(
        (res) => res.status === "rejected" && (res.reason?.status === 403 || res.reason?.status === 401 || String(res.reason).includes("403") || String(res.reason).includes("401"))
      );

      if (hasForbiddenError) {
        setIsForbidden(true);
        setLoading(false);
        return;
      }

      const [
        dashRes,
        statsRes,
        usersRes,
        bansRes,
        hiddenRes,
        promoRes,
        camerasRes,
      ] = results;

      if (dashRes.status === "fulfilled") setDashboard(dashRes.value);
      if (statsRes.status === "fulfilled") setStats(statsRes.value);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value);
      if (bansRes.status === "fulfilled") setBans(bansRes.value);
      if (hiddenRes.status === "fulfilled") setHiddenReviews(hiddenRes.value);
      if (promoRes.status === "fulfilled") setPromotions(promoRes.value);
      if (camerasRes.status === "fulfilled") setPendingCameras(camerasRes.value);

    } catch (err) {
      console.error(err);
      if (err?.status === 403 || err?.status === 401) {
        setIsForbidden(true);
      } else {
        setError("Wystąpił błąd podczas ładowania panelu administratora.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleCameraReview = async (id, status) => {
    try {
      await reviewCamera(id, status);
      setPendingCameras((prev) => prev.filter((cam) => cam.id !== id));
    } catch (err) {
      alert("Błąd podczas rozpatrywania zgłoszenia aparatu: " + (err.message || err));
    }
  };

  if (isForbidden) {
    return (
      <div className="forbidden-wrapper">
        <h2 className="forbidden-title">Brak dostępu (403 Forbidden)</h2>
        <p className="forbidden-text">
          Nie masz wystarczających uprawnień, aby uzyskać dostęp do panelu administratora i moderatora.
        </p>
        <a href="/" className="btn-primary">
          Wróć do strony głównej
        </a>
      </div>
    );
  }

  return (
    <main className="admin-container">
      <h1 className="admin-header">MobileLens — Panel Administratora</h1>

      {loading && <div className="admin-loading">Ładowanie danych panelu...</div>}
      {error && <div className="admin-error" role="alert">{error}</div>}

      {/* SEKCJA 1: ZARZĄDZANIE TREŚCIĄ I WERYFIKACJA (NA GÓRZE) */}
      
      {/* Zgłoszenia aparatów w formie poziomego slidera */}
      <div className="admin-section">
        <h3 className="admin-section-title">
          Oczekujące zgłoszenia aparatów 
          <span style={{ fontSize: "0.85rem", background: "#e0f2fe", color: "#0369a1", padding: "2px 8px", borderRadius: "12px" }}>
            {pendingCameras.length}
          </span>
        </h3>
        
        {(!pendingCameras || pendingCameras.length === 0) ? (
          <p style={{ color: "#6b7280", margin: 0 }}>Brak oczekujących zgłoszeń aparatów do weryfikacji.</p>
        ) : (
          <div className="cameras-list-slider">
            {pendingCameras.map((cam) => (
              <div key={cam.id} className="camera-card">
                <div>
                  <div className="camera-card-header">
                    <div>
                      <h4 className="camera-card-title">{cam.type.toUpperCase()} ({cam.facing})</h4>
                      <span className="camera-card-subtitle">ID telefonu: {cam.smartphoneId.slice(0, 8)}...</span>
                    </div>
                  </div>

                  <div className="camera-specs-grid">
                    <div className="spec-item"><span className="spec-label">Rozdzielczość</span><span className="spec-value">{cam.resolutionMp} MP</span></div>
                    <div className="spec-item"><span className="spec-label">Ogniskowa</span><span className="spec-value">{cam.focalLengthMm} mm</span></div>
                    <div className="spec-item"><span className="spec-label">Przysłona</span><span className="spec-value">f/{cam.aperture}</span></div>
                    <div className="spec-item"><span className="spec-label">OIS</span><span className="spec-value">{cam.ois}</span></div>
                    <div className="spec-item"><span className="spec-label">Zoom optyczny</span><span className="spec-value">{cam.opticalZoom ? "Tak" : "Nie"}</span></div>
                    <div className="spec-item"><span className="spec-label">Zmienna przysł.</span><span className="spec-value">{cam.variableAperture ? "Tak" : "Nie"}</span></div>
                  </div>

                  {cam.samples && (
                    <div style={{ fontSize: "0.85rem", marginBottom: "1rem", color: cam.samples.satisfied ? "var(--success)" : "#d97706" }}>
                      <strong>EXIF:</strong> {cam.samples.satisfied ? "Wymagania spełnione" : `Wymagane próbki: ${cam.samples.required}`}
                    </div>
                  )}
                </div>

                <div className="camera-actions">
                  <button 
                    onClick={() => handleCameraReview(cam.id, "approved")}
                    className="btn btn-success"
                  >
                    Zatwierdź
                  </button>
                  <button 
                    onClick={() => handleCameraReview(cam.id, "rejected")}
                    className="btn btn-danger"
                  >
                    Odrzuć
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DataTable
        title="Oczekujące recenzje"
        columns={[
          { key: "title", label: "Tytuł recenzji" },
          { key: "authorName", label: "Autor" },
          { key: "updatedAt", label: "Ostatnia zmiana" },
        ]}
        rows={dashboard?.reviewSubmissions || []}
        emptyMessage="Brak oczekujących recenzji."
      />

      <DataTable
        title="Ukryte recenzje"
        columns={[
          { key: "title", label: "Tytuł recenzji" },
          { key: "authorId", label: "ID Autora" },
        ]}
        rows={hiddenReviews}
        emptyMessage="Brak ukrytych recenzji."
      />

      <DataTable
        title="Ostatnie blokady (Recent bans)"
        columns={[
          { key: "userName", label: "Użytkownik" },
          { key: "reason", label: "Powód bana" },
          { key: "active", label: "Aktywny" },
        ]}
        rows={bans}
        emptyMessage="Brak zarejestrowanych banów."
      />

      <DataTable
        title="Użytkownicy systemu"
        columns={[
          { key: "name", label: "Imię" },
          { key: "email", label: "E-mail" },
          { key: "role", label: "Rola" },
          { key: "createdAt", label: "Utworzono" },
        ]}
        rows={users}
        emptyMessage="Brak użytkowników."
      />

      {/* SEKCJA 2: STATYSTYKI ZAANGAŻOWANIA (NA DOLE) */}
      {stats && (
        <div className="admin-section">
          <h3 className="admin-section-title">Statystyki zaangażowania i systemu</h3>
          <div className="stats-grid">
            <StatCard title="Wizyty (24h)" value={stats.visitsLast24h} />
            <StatCard title="Wizyty (tydzień)" value={stats.visitsLastWeek} />
            <StatCard title="Aktywni użytkownicy" value={stats.activeUsers} />
            <StatCard title="Rejestracje (30 dni)" value={stats.registrationsLast30Days} />
            <StatCard title="Aktywne bany" value={stats.activeBans} />
            <StatCard title="Opublikowane recenzje" value={stats.publishedReviews} />
            <StatCard title="Oczekujące recenzje" value={stats.pendingReviews} />
            <StatCard title="Telefony w bazie" value={stats.phonesInDatabase} />
          </div>
        </div>
      )}
    </main>
  );
}