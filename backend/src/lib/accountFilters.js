export function getUserVisibilityJoinAndCondition(facesAlias = 'f') {
  const u = 'u';
  const join = `LEFT JOIN users ${u} ON ${u}.id = ${facesAlias}.uploader_id`;
  const condition = `
    (${facesAlias}.type = 'AI'
      OR (
        ${u}.id IS NOT NULL
        AND ${u}.is_active = 1
        AND ${u}.is_suspended = 0
        AND ${u}.profile_completed = 1
        AND (
          (
            ${u}.last_login_at IS NULL
            AND ${u}.created_at >= datetime('now', '-30 days')
          )
          OR ${u}.last_login_at >= datetime('now', '-30 days')
        )
        AND ${facesAlias}.consent_given = 1
      )
    )
  `;
  return { join, condition };
}

