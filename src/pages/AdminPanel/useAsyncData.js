import { useCallback, useEffect, useState } from "react";

// Runs `loader` whenever it changes (wrap it in useCallback) or reload() is called.
// Keeps the previous data while reloading so lists don't flash empty.
export function useAsyncData(loader) {
  const [state, setState] = useState({ data: null, error: null, loading: true, source: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    loader().then(
      (data) => {
        if (!cancelled) setState({ data, error: null, loading: false, source: loader });
      },
      (error) => {
        console.error(error);
        if (!cancelled) setState((prev) => ({ ...prev, error, loading: false, source: loader }));
      }
    );

    return () => {
      cancelled = true;
    };
  }, [loader, version]);

  const reload = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true }));
    setVersion((v) => v + 1);
  }, []);

  const setData = useCallback((updater) => {
    setState((prev) => ({
      ...prev,
      data: typeof updater === "function" ? updater(prev.data) : updater,
    }));
  }, []);

  return {
    data: state.data,
    error: state.error,
    // A new loader (e.g. changed page or query) counts as loading until it resolves.
    loading: state.loading || state.source !== loader,
    reload,
    setData,
  };
}
