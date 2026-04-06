/**
 * Formats a duration in seconds into a human-readable string (e.g., "1h 20m" or "2m 30s").
 */
export const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
};
