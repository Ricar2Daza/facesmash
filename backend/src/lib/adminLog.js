import { run } from '../db/index.js';

export async function logAdminAction(adminId, action, details, level = 'INFO') {
  try {
    const payload = typeof details === 'string' ? details : JSON.stringify(details || {});
    await run(
      'INSERT INTO admin_logs (admin_id, action, details, level) VALUES (?, ?, ?, ?)',
      [adminId || null, action, payload, level]
    );
    await run(
      "DELETE FROM admin_logs WHERE created_at < datetime('now', '-30 days')"
    );
  } catch (e) {
    console.error('Error logging admin action', e);
  }
}

