export const insertTestUser = async (
  db: D1Database,
  userId: string,
): Promise<void> => {
  const now = Date.now()
  await db
    .prepare(
      `INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
       VALUES (?, ?, ?, 0, ?, ?)`,
    )
    .bind(userId, `User ${userId}`, `${userId}@example.test`, now, now)
    .run()
}
