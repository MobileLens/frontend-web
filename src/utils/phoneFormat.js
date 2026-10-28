const releaseDateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

// Release dates are YYYY, YYYY-MM or YYYY-MM-DD; only full dates get formatted.
export function formatReleaseDate(releaseDate) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    return releaseDate;
  }

  return releaseDateFormat.format(new Date(releaseDate));
}

export function formatViews(viewCount) {
  return `${viewCount.toLocaleString("en-US")} ${viewCount === 1 ? "view" : "views"}`;
}
