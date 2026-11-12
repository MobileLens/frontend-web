import {
  formatAperture,
  formatAspectRatio,
  formatAutofocus,
  formatBinnedPitch,
  formatEquivalentAperture,
  formatEquivalentFocal,
  formatFocalLength,
  formatMegapixels,
  formatPixelPitch,
  formatSensorDimensions,
  formatSensorPixels,
  formatSensorSize,
  videoSummary,
} from "../../utils/camera";
import { OIS_LABELS } from "../../utils/format";
import { photoSizesSummary } from "../../utils/photoResolutions";
import Icon from "../Icon/Icon";
import "./CameraSpecs.css";

const EQUIVALENT_CAPTION = "35 mm equiv.";

// The notable video modes, each with its note under it.
export function VideoLines({ modes }) {
  const entries = videoSummary(modes);

  if (entries.length === 0) return <span className="spec-value is-empty">—</span>;

  return (
    <ul className="spec-video-lines">
      {entries.map((entry) => (
        <li key={entry.text}>
          <span className="spec-video-line">{entry.text}</span>
          {entry.note && <span className="spec-caption">{entry.note}</span>}
        </li>
      ))}
    </ul>
  );
}

function Tile({ icon, title, value, caption, actual, detail, wide, children }) {
  return (
    <div className={`spec-tile ${wide ? "is-wide" : ""}`}>
      <div className="spec-tile-title">
        <Icon name={icon} />
        <span>{title}</span>
      </div>

      {children || <span className={`spec-value ${value === "—" ? "is-empty" : ""}`}>{value}</span>}
      {caption && <span className="spec-caption">{caption}</span>}

      {actual && actual !== "—" && (
        <div className="spec-actual">
          <strong>{actual}</strong> <span className="spec-caption">actual</span>
        </div>
      )}

      {detail && <span className="spec-detail">{detail}</span>}
    </div>
  );
}

// One camera's specs grouped like the mobile apps: optics, sensor, features, then video.
export default function CameraSpecs({ camera }) {
  return (
    <div className="spec-groups">
      <section>
        <h3 className="spec-group-title">Optics</h3>
        <div className="spec-grid spec-grid-2">
          <Tile
            icon="focal"
            title="Focal length"
            value={formatEquivalentFocal(camera)}
            caption={EQUIVALENT_CAPTION}
            actual={formatFocalLength(camera)}
          />
          <Tile
            icon="aperture"
            title="Aperture"
            value={formatEquivalentAperture(camera)}
            caption={EQUIVALENT_CAPTION}
            actual={formatAperture(camera)}
          />
        </div>
      </section>

      <section>
        <h3 className="spec-group-title">
          Sensor
          {camera.sensorModel && <span className="spec-group-note">{camera.sensorModel}</span>}
        </h3>
        <div className="spec-grid spec-grid-4">
          <Tile
            icon="grid"
            title="Resolution"
            value={formatMegapixels(camera.resolutionMp)}
            caption={formatSensorPixels(camera)}
            detail={photoSizesSummary(camera)}
          />
          <Tile
            icon="sensor"
            title="Sensor size"
            value={formatSensorSize(camera)}
            caption={formatSensorDimensions(camera)}
          />
          <Tile icon="grid" title="Pixel pitch" value={formatPixelPitch(camera)} detail={formatBinnedPitch(camera)} />
          <Tile icon="focal" title="Aspect ratio" value={formatAspectRatio(camera)} />
        </div>
      </section>

      <section>
        <h3 className="spec-group-title">Features</h3>
        <div className="spec-grid spec-grid-2">
          <Tile icon="stabilisation" title="Stabilisation" value={OIS_LABELS[camera.ois] || "—"} />
          <Tile icon="autofocus" title="Autofocus" value={formatAutofocus(camera)} />
        </div>
      </section>

      <div className="spec-grid">
        <Tile icon="video" title="Video" wide>
          <VideoLines modes={camera.videoModes} />
        </Tile>
      </div>

      {camera.note && <p className="spec-note">{camera.note}</p>}
    </div>
  );
}
