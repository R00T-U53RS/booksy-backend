import type { DataSource } from 'typeorm';

/**
 * Removes bookmark rows and change logs while keeping users and profiles.
 * Use between integration tests that share one seeded user/profile.
 */
export async function clearBookmarkSyncTables(
  dataSource: DataSource,
): Promise<void> {
  await dataSource.query('DELETE FROM bookmark_change_logs');
  await dataSource.query('DELETE FROM bookmarks');
}
