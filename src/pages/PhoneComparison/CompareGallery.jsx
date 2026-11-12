import { useCallback, useEffect, useState } from "react";
import { getSmartphonePhotos } from "../../api/smartphones";
import Icon from "../../components/Icon/Icon";
import PhotoViewer from "../../components/PhotoViewer/PhotoViewer";
import { openInViewer } from "../../components/PhotoViewer/openInViewer";
import { slotLabel } from "../../utils/camera";
import { photoCameraLabel, photoCaption } from "../../utils/format";
import { shotCameras } from "../../utils/shotDetails";

const PHOTOS_PER_PAGE = 6;
const ALL_LENSES = "all";

// One phone's verified sample photos, from one camera or all of them.
function PhotoColumn({ phone, cameraId }) {
  const [viewerIndex, setViewerIndex] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let ignore = false;

    getSmartphonePhotos(phone.id, page, PHOTOS_PER_PAGE, { cameraId }).then(
      (data) => {
        if (ignore) return;
        setPhotos((prev) => (page === 1 ? data.data : [...prev, ...data.data]));
        setTotal(data.total);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        if (ignore) return;
        setError(true);
        setLoading(false);
      },
    );

    return () => {
      ignore = true;
    };
  }, [phone.id, cameraId, page]);

  const showMore = useCallback(() => {
    setLoading(true);
    setPage((current) => current + 1);
  }, []);

  return (
    <div className="compare-gallery-column">
      {viewerIndex !== null && (
        <PhotoViewer
          photos={photos}
          initialIndex={viewerIndex}
          total={total}
          onLoadMore={showMore}
          loadingMore={loading}
          cameras={shotCameras(phone.cameras)}
          onClose={() => setViewerIndex(null)}
        />
      )}

      <h3 className="compare-gallery-phone">
        {phone.brandName && <span className="phone-brand">{phone.brandName}</span>}
        <span>{phone.modelName}</span>
        {total > 0 && <span className="compare-gallery-count">{total} {total === 1 ? "photo" : "photos"}</span>}
      </h3>

      {error && <p className="compare-gallery-empty">Could not load photos.</p>}
      {!error && !loading && photos.length === 0 && <p className="compare-gallery-empty">No sample photos yet.</p>}

      <ul className="compare-gallery-photos">
        {photos.map((photo, index) => {
          const caption = photoCaption(photo);

          return (
            <li key={photo.id}>
              <a
                href={photo.url}
                target="_blank"
                rel="noreferrer"
                className="photo-tile"
                onClick={(event) => openInViewer(event, () => setViewerIndex(index))}
              >
                <img src={photo.thumbUrl || photo.url} alt="" loading="lazy" decoding="async" />
              </a>
              <div className="photo-meta">
                {!cameraId && <span className="photo-camera">{photoCameraLabel(photo)}</span>}
                {caption && <span>{caption}</span>}
              </div>
            </li>
          );
        })}

        {loading && photos.length === 0 && Array.from({ length: 2 }, (_, index) => (
          <li key={index} aria-hidden="true"><span className="photo-tile skeleton-area" /></li>
        ))}
      </ul>

      {photos.length < total && (
        <button type="button" className="ui-btn ui-btn-small" disabled={loading} onClick={showMore}>
          <Icon name="camera" /> {loading ? "Loading…" : "Show more"}
        </button>
      )}
    </div>
  );
}

/**
 * Sample photos side by side, one column per phone. A lens tab shows the photos of the matching
 * camera of each phone (wide with wide, telephoto with telephoto), as in the table above.
 */
export default function CompareGallery({ phones, slots, slotsByPhone }) {
  const [selected, setSelected] = useState(ALL_LENSES);
  const slot = slots.includes(selected) ? selected : ALL_LENSES;

  return (
    <section className="compare-gallery" aria-labelledby="compare-gallery-title">
      <h2 id="compare-gallery-title" className="compare-gallery-title">Sample photos</h2>

      <div className="lens-tabs" role="group" aria-label="Lens">
        {[ALL_LENSES, ...slots].map((item) => (
          <button
            key={item}
            type="button"
            className={`lens-tab ${item === slot ? "is-active" : ""}`}
            aria-pressed={item === slot}
            onClick={() => setSelected(item)}
          >
            <span className="lens-tab-name">{item === ALL_LENSES ? "All lenses" : slotLabel(item)}</span>
          </button>
        ))}
      </div>

      <div className="compare-gallery-grid" style={{ "--compare-cols": phones.length }}>
        {phones.map((phone, index) => {
          const camera = slot === ALL_LENSES ? null : slotsByPhone[index][slot];

          if (slot !== ALL_LENSES && !camera) {
            return (
              <div key={phone.id} className="compare-gallery-column">
                <h3 className="compare-gallery-phone">
                  {phone.brandName && <span className="phone-brand">{phone.brandName}</span>}
                  <span>{phone.modelName}</span>
                </h3>
                <p className="compare-gallery-empty">This phone has no such lens.</p>
              </div>
            );
          }

          return <PhotoColumn key={`${phone.id}-${camera?.id || ALL_LENSES}`} phone={phone} cameraId={camera?.id} />;
        })}
      </div>
    </section>
  );
}
