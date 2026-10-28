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
import { searchSmartphones, getSmartphoneById } from "../../api/smartphones";
import { apiFetch } from "../../api/client";
import "./AdminPanel.css";

function DataTable({ title, columns, rows, emptyMessage }) {
  return (
    <div className="admin-section">
      <h3 className="admin-section-title">{title}</h3>
      {(!rows || rows.length === 0) ? (
        <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>{emptyMessage}</p>
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
  const [activeTab, setActiveTab] = useState("overview");

  const [dashboard, setDashboard] = useState(null);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [bans, setBans] = useState([]);
  const [hiddenReviews, setHiddenReviews] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [pendingCameras, setPendingCameras] = useState([]);
  
  const [editorQuery, setEditorQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPhone, setSelectedPhone] = useState(null);
  const [phoneForm, setPhoneForm] = useState({});
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [imagesList, setImagesList] = useState([
    { id: 1, name: "Sample_Main_Sensor_1.jpg", phone: "Galaxy S22", status: "Approved" },
    { id: 2, name: "Sample_Telephoto_2.jpg", phone: "Galaxy S24 Ultra", status: "Pending" },
  ]);

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
      
      if (camerasRes.status === "fulfilled") {
        const rawCameras = camerasRes.value.data || camerasRes.value;
        if (Array.isArray(rawCameras)) {
          const enrichedCameras = await Promise.all(
            rawCameras.map(async (cam) => {
              let modelName = cam.modelName || cam.smartphoneName;
              let brandName = cam.brandName;

              if (!modelName && cam.smartphoneId) {
                try {
                  const phoneRes = await getSmartphoneById(cam.smartphoneId);
                  const phoneData = phoneRes.data || phoneRes;
                  modelName = phoneData.modelName || phoneData.name;
                  brandName = phoneData.brandName || brandName;
                } catch (e) {
                  console.error("Failed to fetch phone for camera:", e);
                }
              }

              return {
                ...cam,
                resolvedPhoneName: `${brandName ? brandName + " " : ""}${modelName || "Model (ID: " + (cam.smartphoneId ? cam.smartphoneId.slice(0, 8) : "unknown") + "..." + ")"}`
              };
            })
          );
          setPendingCameras(enrichedCameras);
        }
      }

    } catch (err) {
      console.error(err);
      if (err?.status === 403 || err?.status === 401) {
        setIsForbidden(true);
      } else {
        setError("An error occurred while loading the admin panel.");
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
      alert("Error reviewing camera submission: " + (err.message || err));
    }
  };

  const handleSearchSmartphones = async (e) => {
    e.preventDefault();
    if (!editorQuery.trim()) return;

    try {
      setIsSearching(true);
      const results = await searchSmartphones(editorQuery);
      setSearchResults(results || []);
    } catch (err) {
      console.error("Error searching smartphones:", err);
      alert("Failed to search smartphones.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPhone = async (id) => {
    try {
      const phoneDetails = await getSmartphoneById(id);
      const phoneData = phoneDetails.data || phoneDetails;
      setSelectedPhone(phoneData);
      setPhoneForm(phoneData); 
    } catch (err) {
      console.error("Error fetching phone details:", err);
      alert("Failed to retrieve selected phone data.");
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setPhoneForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleCameraFieldChange = (index, field, value) => {
    setPhoneForm((prev) => {
      const updatedCameras = [...(prev.cameras || [])];
      updatedCameras[index] = { ...updatedCameras[index], [field]: value };
      return { ...prev, cameras: updatedCameras };
    });
  };

  const handleSavePhoneChanges = async (e) => {
    e.preventDefault();
    if (!selectedPhone?.id) return;

    try {
      setIsSaving(true);
      await apiFetch(`/api/smartphones/${selectedPhone.id}`, {
        method: "PUT",
        body: JSON.stringify(phoneForm),
      });
      alert("Changes to the phone and cameras have been successfully saved!");
    } catch (err) {
      console.error("Error saving phone:", err);
      alert("Failed to save changes: " + (err.message || err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageStatusChange = (id, newStatus) => {
    setImagesList((prev) =>
      prev.map((img) => (img.id === id ? { ...img, status: newStatus } : img))
    );
  };

  if (isForbidden) {
    return (
      <div className="forbidden-wrapper">
        <h2 className="forbidden-title">Access Denied (403 Forbidden)</h2>
        <p className="forbidden-text">
          You do not have permission to access the admin panel.
        </p>
        <a href="/" className="btn btn-primary" style={{ display: "inline-block", marginTop: "1rem", textDecoration: "none" }}>
          Return to Home
        </a>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-title">Panel Navigation</div>
        <button
          type="button"
          className={`admin-sidebar-btn ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
        >
          Overview & Stats
        </button>
        <button
          type="button"
          className={`admin-sidebar-btn ${activeTab === "cameras" ? "active" : ""}`}
          onClick={() => setActiveTab("cameras")}
        >
          <span>Camera Submissions</span>
          {pendingCameras.length > 0 && <span className="admin-badge">{pendingCameras.length}</span>}
        </button>
        <button
          type="button"
          className={`admin-sidebar-btn ${activeTab === "editor" ? "active" : ""}`}
          onClick={() => setActiveTab("editor")}
        >
          Phone & Camera Editor
        </button>
        <button
          type="button"
          className={`admin-sidebar-btn ${activeTab === "images" ? "active" : ""}`}
          onClick={() => setActiveTab("images")}
        >
          Image & Sample Manager
        </button>
        <button
          type="button"
          className={`admin-sidebar-btn ${activeTab === "reviews" ? "active" : ""}`}
          onClick={() => setActiveTab("reviews")}
        >
          Review Moderation
        </button>
        <button
          type="button"
          className={`admin-sidebar-btn ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
        >
          Users & Bans
        </button>
      </aside>

      <main className="admin-main">
        <h1 className="admin-header">Admin Panel</h1>

        {loading && <div className="admin-loading">Loading panel data...</div>}
        {error && <div className="admin-error" role="alert">{error}</div>}

        {activeTab === "overview" && stats && (
          <div className="admin-section">
            <h3 className="admin-section-title">Engagement & System Statistics</h3>
            <div className="stats-grid">
              <StatCard title="Visits (24h)" value={stats.visitsLast24h} />
              <StatCard title="Visits (Week)" value={stats.visitsLastWeek} />
              <StatCard title="Active Users" value={stats.activeUsers} />
              <StatCard title="Registrations (30 Days)" value={stats.registrationsLast30Days} />
              <StatCard title="Active Bans" value={stats.activeBans} />
              <StatCard title="Published Reviews" value={stats.publishedReviews} />
              <StatCard title="Pending Reviews" value={stats.pendingReviews} />
              <StatCard title="Phones in Database" value={stats.phonesInDatabase} />
            </div>
          </div>
        )}

        {activeTab === "cameras" && (
          <div className="admin-section">
            <h3 className="admin-section-title">
              Pending Camera Submissions
              <span className="admin-badge">{pendingCameras.length}</span>
            </h3>

            {(!pendingCameras || pendingCameras.length === 0) ? (
              <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: "0.9rem" }}>No pending camera submissions.</p>
            ) : (
              <div className="cameras-grid">
                {pendingCameras.map((cam) => (
                  <div key={cam.id} className="camera-card">
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--primary)", marginBottom: "0.25rem" }}>
                        {cam.resolvedPhoneName}
                      </div>
                      <div className="camera-card-header">
                        <h4 className="camera-card-title">{cam.type ? cam.type.toUpperCase() : "Camera"}</h4>
                        <span className="camera-badge-facing">{cam.facing || "—"}</span>
                      </div>

                      <div className="camera-specs-grid">
                        <div className="spec-item"><span className="spec-label">Resolution</span><span className="spec-value">{cam.resolutionMp ? `${Math.round(cam.resolutionMp * 10) / 10} MP` : "—"}</span></div>
                        <div className="spec-item"><span className="spec-label">Focal Length</span><span className="spec-value">{cam.focalLengthMm ? `${Math.round(cam.focalLengthMm * 10) / 10} mm` : "—"}</span></div>
                        <div className="spec-item"><span className="spec-label">Aperture</span><span className="spec-value">{cam.aperture ? `f/${cam.aperture}` : "—"}</span></div>
                        <div className="spec-item"><span className="spec-label">OIS</span><span className="spec-value">{cam.ois || "—"}</span></div>
                        <div className="spec-item"><span className="spec-label">Optical Zoom</span><span className="spec-value">{cam.opticalZoom !== undefined ? (cam.opticalZoom ? "Yes" : "No") : "—"}</span></div>
                        <div className="spec-item"><span className="spec-label">Variable Aperture</span><span className="spec-value">{cam.variableAperture !== undefined ? (cam.variableAperture ? "Yes" : "No") : "—"}</span></div>
                      </div>

                      {cam.samples && (
                        <div style={{ fontSize: "0.85rem", marginBottom: "1rem", color: cam.samples.satisfied ? "var(--success)" : "#d97706" }}>
                          <strong>EXIF:</strong> {cam.samples.satisfied ? "Requirements met" : `Required samples: ${cam.samples.required}`}
                        </div>
                      )}
                    </div>

                    <div className="camera-actions">
                      <button type="button" onClick={() => handleCameraReview(cam.id, "approved")} className="btn btn-success">Approve</button>
                      <button type="button" onClick={() => handleCameraReview(cam.id, "rejected")} className="btn btn-danger">Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "editor" && (
          <div className="admin-section">
            <h3 className="admin-section-title">Phone & Camera Editor</h3>
            
            {selectedPhone ? (
              <div style={{ background: "var(--spec-bg)", padding: "1.5rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                  <h4 style={{ margin: 0 }}>Editing: {selectedPhone.modelName || selectedPhone.name}</h4>
                  <button type="button" className="btn btn-outline" onClick={() => setSelectedPhone(null)} style={{ flex: "0 0 auto", padding: "0.35rem 0.75rem" }}>← Back</button>
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "1.25rem" }}>Database ID: {selectedPhone.id}</p>

                <form onSubmit={handleSavePhoneChanges} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: "600" }}>Model Name (modelName):</label>
                    <input 
                      type="text" 
                      name="modelName"
                      className="editor-input" 
                      value={phoneForm.modelName || ""} 
                      onChange={handleFormChange} 
                    />
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                    <label style={{ fontSize: "0.85rem", fontWeight: "600" }}>Image URL (imageUrl):</label>
                    <input 
                      type="text" 
                      name="imageUrl"
                      className="editor-input" 
                      value={phoneForm.imageUrl || ""} 
                      onChange={handleFormChange} 
                    />
                  </div>

                  <div>
                    <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "1rem" }}>Camera Modules</h4>
                    {(!phoneForm.cameras || phoneForm.cameras.length === 0) ? (
                      <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>No defined cameras for this model.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {phoneForm.cameras.map((cam, idx) => (
                          <div key={cam.id || idx} style={{ background: "var(--card-bg)", padding: "1rem", borderRadius: "6px", border: "1px solid var(--border-color)" }}>
                            <div style={{ fontSize: "0.85rem", fontWeight: "700", marginBottom: "0.5rem", color: "var(--primary)" }}>
                              Camera #{idx + 1} ({cam.type || "Main"} - {cam.facing || "Back"})
                            </div>
                            
                            <div className="camera-specs-grid" style={{ marginBottom: 0 }}>
                              <div className="spec-item">
                                <span className="spec-label">Resolution (MP)</span>
                                <input 
                                  type="number" 
                                  className="editor-input"
                                  style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem", marginTop: "0.2rem" }}
                                  value={cam.resolutionMp || ""}
                                  onChange={(e) => handleCameraFieldChange(idx, "resolutionMp", e.target.value)}
                                />
                              </div>

                              <div className="spec-item">
                                <span className="spec-label">Focal Length (mm)</span>
                                <input 
                                  type="number" 
                                  className="editor-input"
                                  style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem", marginTop: "0.2rem" }}
                                  value={cam.focalLengthMm || ""}
                                  onChange={(e) => handleCameraFieldChange(idx, "focalLengthMm", e.target.value)}
                                />
                              </div>

                              <div className="spec-item">
                                <span className="spec-label">Aperture (f/)</span>
                                <input 
                                  type="text" 
                                  className="editor-input"
                                  style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem", marginTop: "0.2rem" }}
                                  value={cam.aperture || ""}
                                  onChange={(e) => handleCameraFieldChange(idx, "aperture", e.target.value)}
                                />
                              </div>

                              <div className="spec-item">
                                <span className="spec-label">OIS</span>
                                <input 
                                  type="text" 
                                  className="editor-input"
                                  style={{ padding: "0.3rem 0.5rem", fontSize: "0.85rem", marginTop: "0.2rem" }}
                                  value={cam.ois || ""}
                                  onChange={(e) => handleCameraFieldChange(idx, "ois", e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button type="submit" className="btn btn-success" style={{ marginTop: "0.5rem" }}>
                    {isSaving ? "Saving..." : "Save All Changes"}
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                  Search for a model to edit its parameters and camera specifications directly in the database.
                </p>

                <form onSubmit={handleSearchSmartphones} className="editor-search-bar">
                  <input
                    type="text"
                    className="editor-input"
                    placeholder="Enter model name (e.g. SM-S901B)..."
                    value={editorQuery}
                    onChange={(e) => setEditorQuery(e.target.value)}
                  />
                  <button type="submit" className="btn btn-primary" style={{ flex: "0 0 120px" }}>
                    {isSearching ? "Searching..." : "Search"}
                  </button>
                </form>

                {searchResults.length > 0 && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", maxHeight: "350px", overflowY: "auto", marginTop: "1rem" }}>
                    {searchResults.map((phone) => (
                      <div 
                        key={phone.id} 
                        onClick={() => handleSelectPhone(phone.id)}
                        style={{ padding: "0.75rem", background: "var(--spec-bg)", border: "1px solid var(--border-color)", borderRadius: "6px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}
                      >
                        <div>
                          <span style={{ fontWeight: "600" }}>{phone.modelName || phone.name}</span>
                          <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginLeft: "0.75rem" }}>ID: {phone.id.slice(0, 8)}...</span>
                        </div>
                        <span style={{ fontSize: "0.85rem", color: "var(--primary)", fontWeight: "600" }}>Edit →</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "images" && (
          <div className="admin-section">
            <h3 className="admin-section-title">Image & Sample Manager</h3>
            <div className="image-manager-grid">
              {imagesList.map((img) => (
                <div key={img.id} className="image-card">
                  <div className="image-preview" />
                  <div className="image-card-footer">
                    <div style={{ fontSize: "0.85rem", fontWeight: "600" }}>{img.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{img.phone}</div>
                    <div style={{ fontSize: "0.75rem", fontWeight: "600", color: img.status === "Approved" ? "var(--success)" : "#d97706" }}>
                      Status: {img.status}
                    </div>
                    <div style={{ display: "flex", gap: "0.3rem", marginTop: "0.25rem" }}>
                      {img.status !== "Approved" && (
                        <button type="button" className="btn btn-success" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }} onClick={() => handleImageStatusChange(img.id, "Approved")}>OK</button>
                      )}
                      <button type="button" className="btn btn-danger" style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }} onClick={() => handleImageStatusChange(img.id, "Rejected")}>Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "reviews" && (
          <>
            <DataTable
              title="Pending Reviews"
              columns={[
                { key: "title", label: "Review Title" },
                { key: "authorName", label: "Author" },
                { key: "updatedAt", label: "Last Updated" },
              ]}
              rows={dashboard?.reviewSubmissions || []}
              emptyMessage="No pending reviews."
            />
            <DataTable
              title="Hidden Reviews"
              columns={[
                { key: "title", label: "Review Title" },
                { key: "authorId", label: "Author ID" },
              ]}
              rows={hiddenReviews}
              emptyMessage="No hidden reviews."
            />
          </>
        )}

        {activeTab === "users" && (
          <>
            <DataTable
              title="Recent Bans"
              columns={[
                { key: "userName", label: "User" },
                { key: "reason", label: "Ban Reason" },
                { key: "active", label: "Active" },
              ]}
              rows={bans}
              emptyMessage="No bans."
            />
            <DataTable
              title="System Users"
              columns={[
                { key: "name", label: "Name" },
                { key: "email", label: "E-mail" },
                { key: "role", label: "Role" },
                { key: "createdAt", label: "Created At" },
              ]}
              rows={users}
              emptyMessage="No users."
            />
          </>
        )}
      </main>
    </div>
  );
}