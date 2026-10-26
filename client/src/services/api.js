const API_BASE = import.meta.env.VITE_API_URL || '';

export const api = {
  async createMeeting({ title, hostName, settings }) {
    const res = await fetch(`${API_BASE}/api/meetings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, hostName, settings })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create meeting');
    return data.data;
  },

  async getMeeting(meetingCode) {
    const code = encodeURIComponent((meetingCode || '').trim().toLowerCase());
    const res = await fetch(`${API_BASE}/api/meetings/${code}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Meeting not found');
    return data.data;
  },

  async verifyHost(meetingCode, hostToken) {
    const code = encodeURIComponent((meetingCode || '').trim().toLowerCase());
    const res = await fetch(`${API_BASE}/api/meetings/${code}/verify-host`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-host-token': hostToken
      },
      body: JSON.stringify({ hostToken })
    });
    const data = await res.json();
    if (!res.ok) return false;
    return !!data.isHost;
  },

  async endMeeting(meetingCode, hostToken) {
    const code = encodeURIComponent((meetingCode || '').trim().toLowerCase());
    const res = await fetch(`${API_BASE}/api/meetings/${code}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-host-token': hostToken
      },
      body: JSON.stringify({ hostToken })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to end meeting');
    return data;
  },

  async getRecentMeetings() {
    try {
      const res = await fetch(`${API_BASE}/api/meetings/recent`);
      const data = await res.json();
      return data.data || [];
    } catch {
      return [];
    }
  }
};
