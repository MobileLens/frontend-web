import { useCallback, useState } from "react";
import { getHiddenReviews, getPendingReviews } from "../../../api/admin";
import { useAsyncData } from "../useAsyncData";
import { asArray, formatDate } from "../format";
import DataTable from "../components/DataTable";
import Icon from "../components/Icon";
import ReviewModal from "./ReviewModal";

const COLUMNS = [
  { key: "title", label: "Title", render: (row) => <span className="cell-strong">{row.title || "Untitled"}</span> },
  { key: "authorName", label: "Author" },
  { key: "media", label: "Media", render: (row) => row.media?.length ?? 0 },
  { key: "updatedAt", label: "Last updated", render: (row) => formatDate(row.updatedAt, true) },
];

export default function ReviewsTab({ isAdmin, onChanged }) {
  const loader = useCallback(async () => {
    const [pending, hidden] = await Promise.all([
      getPendingReviews(),
      isAdmin ? getHiddenReviews() : Promise.resolve(null),
    ]);
    return { pending: asArray(pending), hidden: hidden && asArray(hidden) };
  }, [isAdmin]);

  const { data, loading, error, reload } = useAsyncData(loader);
  const [openId, setOpenId] = useState(null);

  const handleClose = useCallback(() => setOpenId(null), []);

  function handleDone() {
    setOpenId(null);
    reload();
    onChanged();
  }

  return (
    <>
      {error && <div className="admin-error" role="alert">Could not load reviews: {error.message}</div>}

      <section className="admin-section">
        <div className="admin-section-title">
          <span>
            Pending reviews <span className="admin-badge">{data?.pending.length ?? 0}</span>
          </span>
          <button type="button" className="btn btn-outline btn-sm btn-inline" onClick={reload} disabled={loading}>
            <Icon name="refresh" size={14} /> Refresh
          </button>
        </div>
        {loading && !data ? (
          <p className="admin-empty">Loading reviews…</p>
        ) : (
          <DataTable
            columns={COLUMNS}
            rows={data?.pending}
            emptyMessage="No reviews waiting for moderation."
            onRowClick={(row) => setOpenId(row.id)}
          />
        )}
      </section>

      {isAdmin && (
        <section className="admin-section">
          <h3 className="admin-section-title">
            <span>
              Hidden reviews <span className="admin-badge">{data?.hidden?.length ?? 0}</span>
            </span>
          </h3>
          {loading && !data ? (
            <p className="admin-empty">Loading reviews…</p>
          ) : (
            <DataTable
              columns={COLUMNS}
              rows={data?.hidden}
              emptyMessage="No hidden reviews."
              onRowClick={(row) => setOpenId(row.id)}
            />
          )}
        </section>
      )}

      {openId && <ReviewModal reviewId={openId} isAdmin={isAdmin} onClose={handleClose} onDone={handleDone} />}
    </>
  );
}
