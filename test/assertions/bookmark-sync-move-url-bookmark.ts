import type { BookmarkChangeLog } from '../../src/bookmark/change-tracker/bookmark-change-log.entity';
import {
  ChangeSource,
  ChangeType,
} from '../../src/bookmark/change-tracker/enums';
import { assertFound } from '../helpers/assert-found';
import { assertStableStateAfterIdenticalResyncFromFixture } from '../helpers/assert-stable-after-identical-resync';
import { getBookmarkIntegrationRepos } from '../helpers/bookmark-integration-repos';
import { loadSyncFixtureFile } from '../helpers/load-sync-fixture';
import type { BookmarkIntegrationContext } from '../helpers/setup-bookmark-integration';

const BEFORE = 'move-url-bookmark-before.json';
const AFTER = 'move-url-bookmark-after.json';

/**
 * Moving a URL bookmark between folders (detected move, not delete+add) should emit MOVED
 * with parentId (and position when applicable) in fieldChanges.
 */
export async function assertSyncMoveUrlBookmarkLogsMovedWithParentChange(
  ctx: BookmarkIntegrationContext,
): Promise<void> {
  await ctx.bookmarkService.sync(
    ctx.profile.id,
    ctx.user,
    loadSyncFixtureFile(BEFORE),
  );

  const stats = await ctx.bookmarkService.sync(
    ctx.profile.id,
    ctx.user,
    loadSyncFixtureFile(AFTER),
  );
  expect(stats).toEqual({ created: 0, updated: 1, deleted: 0 });

  const { bookmarks: bookmarkRepo, changeLogs: changeLogRepo } =
    getBookmarkIntegrationRepos(ctx);

  const link = await bookmarkRepo.findOne({
    where: {
      profile: { id: ctx.profile.id },
      user: { id: ctx.user.id },
      title: 'Moved Link',
      url: 'https://moved.example/',
    },
  });
  const moved = assertFound(link, 'Moved Link bookmark after sync');

  const logs = await changeLogRepo.find({
    where: { bookmarkId: moved.id },
    order: { version: 'ASC' },
  });

  expect(logs.length).toBeGreaterThanOrEqual(2);
  expect(logs[0].changeType).toBe(ChangeType.CREATED);
  expectMoveLogWithParentChange(logs[1]);

  expect(moved.parentId).toBe('cccccccc-cccc-4ccc-8ccc-cccccccccccc');

  await assertStableStateAfterIdenticalResyncFromFixture(ctx, AFTER);
}

function expectMoveLogWithParentChange(log: BookmarkChangeLog): void {
  expect(log.changeType).toBe(ChangeType.MOVED);
  expect(log.source).toBe(ChangeSource.SYNC);
  expect(log.fieldChanges).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        field: 'parentId',
        changeType: 'modified',
        oldValue: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        newValue: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      }),
    ]),
  );
}
