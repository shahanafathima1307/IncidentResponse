export function formatRelativeTime(dateString: string): string {
  try {
    const parsedDate = new Date(dateString).getTime();
    if (isNaN(parsedDate)) return dateString;

    const now = Date.now();
    const diffSeconds = Math.floor((now - parsedDate) / 1000);

    if (diffSeconds < 0) {
      return 'just now';
    }

    if (diffSeconds < 60) return `${diffSeconds}s ago`;
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  } catch {
    return dateString;
  }
}
