/**  Helper to parse date string (YYYY-MM-DD) in local timezone */
export const parseDateLocal = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0); // january is 0 in Date internal representation
};

/** returns today with 0 hours, minutes, seconds, milliseconds */
export const getToday = () => {
  const now = new Date();

  now.setHours(0, 0, 0, 0);

  return now;
};

/** stringifies local date in the YYYY-MM-DD format */
export const stringifyDate = (date: Date) => {
  const day = date.getDate();
  const month = date.getMonth() + 1; // january is 0 in .getMonth
  const fullYear = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();

  return {
    date: `${String(fullYear)}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    time: `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
  };
};
