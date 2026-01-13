export function schedule(event: { startTime?: string; meetUrl?: string }) {
  if (!event.startTime || !event.meetUrl) return;

  const [h, m] = event.startTime.split(":").map(Number);
  const target = new Date();
  target.setHours(h, m - 1, 0, 0);

  const delay = target.getTime() - Date.now();
  if (delay <= 0) return;

  setTimeout(() => {
    (window as any).calendar.openMeet(event.meetUrl!);
  }, delay);
}
