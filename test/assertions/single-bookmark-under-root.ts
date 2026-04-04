import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { BookmarkChangeLog } from '../../src/bookmark/change-tracker/bookmark-change-log.entity';
import {
  ChangeSource,
  ChangeType,
} from '../../src/bookmark/change-tracker/enums';
import { Bookmark } from '../../src/bookmark/entity/bookmark.entity';
import { loadSyncFixtureFile } from '../helpers/load-sync-fixture';
import type { BookmarkIntegrationContext } from '../helpers/setup-bookmark-integration';

// Expectations for fixture `test/fixtures/bookmark-sync/single-bookmark-under-root.json`.
export async function assertSingleBookmarkUnderRootCreatesSyncAndLog(
  ctx: BookmarkIntegrationContext,
): Promise<void> {
  const payload = loadSyncFixtureFile(
    'bookmark-sync/single-bookmark-under-root.json',
  );

  const stats = await ctx.bookmarkService.sync(
    ctx.profile.id,
    ctx.user,
    payload,
  );

  expect(stats).toEqual({ created: 1, updated: 0, deleted: 0 });

  const bookmarkRepo = ctx.moduleRef.get<Repository<Bookmark>>(
    getRepositoryToken(Bookmark),
  );
  const bookmarks = await bookmarkRepo.find({
    where: { profile: { id: ctx.profile.id }, user: { id: ctx.user.id } },
  });
  expect(bookmarks).toHaveLength(1);
  expect(bookmarks[0].title).toBe('Example');
  expect(bookmarks[0].url).toBe('https://example.com/');

  const changeLogRepo = ctx.moduleRef.get<Repository<BookmarkChangeLog>>(
    getRepositoryToken(BookmarkChangeLog),
  );
  const logs = await changeLogRepo.find({
    where: { profile: { id: ctx.profile.id }, user: { id: ctx.user.id } },
  });
  expect(logs).toHaveLength(1);
  expect(logs[0].changeType).toBe(ChangeType.CREATED);
  expect(logs[0].source).toBe(ChangeSource.SYNC);
}
