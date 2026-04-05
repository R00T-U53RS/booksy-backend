import type { DataSource } from 'typeorm';

export async function clearTestTables(dataSource: DataSource): Promise<void> {
  await dataSource.query('DELETE FROM bookmark_change_logs');
  await dataSource.query('DELETE FROM bookmarks');
  await dataSource.query('DELETE FROM profiles');
  await dataSource.query('DELETE FROM users');
}
