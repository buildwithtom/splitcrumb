export const dateLabel = (date: string) =>
  new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(`${date.slice(0, 10)}T12:00:00`),
  );
