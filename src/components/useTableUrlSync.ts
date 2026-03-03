import { useEffect } from 'react';

/**
 * Syncs selected date with URL query parameter
 */
export function useDateUrlSync(
  selectedDate: string,
  setSelectedDate: (date: string) => void
) {
  // Read date from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dateParam = params.get('date');

    if (dateParam) {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (dateRegex.test(dateParam)) {
        setSelectedDate(dateParam);
      }
    }
  }, []); // Only run on mount

  // Update URL when date changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Get today's date for comparison
    const today = new Date();
    const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Only add date param if it's not today (keep URL clean)
    if (selectedDate === todayString) {
      params.delete('date');
    } else {
      params.set('date', selectedDate);
    }

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, '', newUrl);
  }, [selectedDate]);
}

/**
 * Syncs status filter with URL query parameter
 */
export function useStatusFilterUrlSync(
  selectedStatuses: string[],
  setSelectedStatuses: (statuses: string[]) => void
) {
  // Read statuses from URL on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const statusParam = params.get('status');

    if (statusParam) {
      // Split comma-separated statuses
      const statuses = statusParam.split(',').filter(Boolean);

      // Validate statuses are valid (planeado, visitado, noEncontrado)
      const validStatuses = ['planeado', 'visitado', 'noEncontrado'];
      const filteredStatuses = statuses.filter(s => validStatuses.includes(s));

      if (filteredStatuses.length > 0) {
        setSelectedStatuses(filteredStatuses);
      }
    }
  }, []); // Only run on mount

  // Update URL when statuses change
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (selectedStatuses.length === 0) {
      params.delete('status');
    } else {
      params.set('status', selectedStatuses.join(','));
    }

    const newUrl = params.toString()
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.replaceState({}, '', newUrl);
  }, [selectedStatuses]);
}
