import crypto from 'crypto';

/**
 * Generates an unpredictable educational meeting code.
 * Format: vm-xxx-yyyy-zzz (e.g. vm-742-839-105 or vm-edu-928-k8m)
 */
export function generateMeetingCode() {
  const segment1 = Math.floor(100 + Math.random() * 900).toString();
  const segment2 = crypto.randomBytes(2).toString('hex');
  const segment3 = Math.floor(100 + Math.random() * 900).toString();
  return `vm-${segment1}-${segment2}-${segment3}`;
}

export function generateHostToken() {
  return crypto.randomBytes(24).toString('hex');
}

export function generateParticipantToken() {
  return crypto.randomBytes(16).toString('hex');
}
