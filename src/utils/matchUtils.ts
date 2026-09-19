import { Match } from '../types.ts';

/**
 * Parses kickoffDate (e.g. 'Hoje', 'Amanhã', '2026-09-09', '09/09/2026') and kickoffTime ('15:00', '15:30')
 * into a concrete Date instance.
 */
export function parseMatchKickoff(kickoffDate: string, kickoffTime: string): Date | null {
  if (!kickoffTime) return null;
  const now = new Date();

  const [hoursStr, minutesStr] = kickoffTime.split(':');
  const hours = parseInt(hoursStr || '0', 10);
  const minutes = parseInt(minutesStr || '0', 10);

  if (isNaN(hours) || isNaN(minutes)) return null;

  const dateStr = (kickoffDate || '').trim().toLowerCase();

  if (dateStr === 'hoje' || dateStr.startsWith('hoje')) {
    const d = new Date(now);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  if (
    dateStr === 'amanhã' ||
    dateStr === 'amanha' ||
    dateStr.startsWith('amanhã') ||
    dateStr.startsWith('amanha')
  ) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }

  // Check if DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyy = dateStr.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    return new Date(year, month, day, hours, minutes, 0, 0);
  }

  // Try standard ISO Date string YYYY-MM-DD
  const isoTime = kickoffTime.length === 5 ? `${kickoffTime}:00` : kickoffTime;
  const isoParsed = new Date(`${kickoffDate}T${isoTime}`);
  if (!isNaN(isoParsed.getTime())) {
    return isoParsed;
  }

  return null;
}

/**
 * Checks if a match has already kicked off / started.
 */
export function isMatchStarted(match: { status: string; kickoffDate: string; kickoffTime: string }): boolean {
  if (match.status !== 'OPEN') return true;

  const kickoff = parseMatchKickoff(match.kickoffDate, match.kickoffTime);
  if (kickoff && kickoff.getTime() <= Date.now()) {
    return true;
  }

  return false;
}

/**
 * Checks if a match is open for betting.
 * Returns false as soon as the match starts or status is closed/suspended/finished.
 */
export function isMatchBettingOpen(match: { status: string; kickoffDate: string; kickoffTime: string }): boolean {
  if (match.status !== 'OPEN') return false;
  if (isMatchStarted(match)) return false;
  return true;
}
