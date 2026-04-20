/**
 * Calculates absolute UTC Timestamp boundaries resolving the user's localized chronological midnight
 * structurally avoiding Node server and OS geographical assumptions.
 */
export function getUserMidnight(offsetMinutes?: string | number | null): Date {
  const now = new Date();
  
  if (offsetMinutes === undefined || offsetMinutes === null || offsetMinutes === '') {
      // Fallback securely to absolute standard UTC midnight if request lacks boundaries
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  const offset = Number(offsetMinutes);
  if (isNaN(offset)) {
      return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }

  // 1. Mathematically shift standard UTC time by user's raw geolocation offset
  const shiftedMs = now.getTime() - (offset * 60 * 1000);
  const shiftedDate = new Date(shiftedMs);
  
  // 2. Lock structural boundary exactly on "Midnight" within their shifted geographic window
  const shiftedMidnightUTC = Date.UTC(shiftedDate.getUTCFullYear(), shiftedDate.getUTCMonth(), shiftedDate.getUTCDate());
  
  // 3. Shift the bound inversely back to the Absolute UTC timestamp layer for precise SQL caching
  return new Date(shiftedMidnightUTC + (offset * 60 * 1000));
}
