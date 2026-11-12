/**
 * For a gallery tile that is a link to the photo: a plain click opens the viewer, while a middle
 * click or Ctrl/Cmd/Shift-click still opens the file in a new tab.
 */
export function openInViewer(event, open) {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  open();
}
