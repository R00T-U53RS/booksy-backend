import { assertSingleBookmarkUnderRootCreatesSyncAndLog } from '../assertions/single-bookmark-under-root';
import { clearTestTables } from '../helpers/clear-test-tables';
import {
  type BookmarkIntegrationContext,
  setupBookmarkIntegrationTest,
} from '../helpers/setup-bookmark-integration';

describe('Bookmark sync (integration)', () => {
  let ctx: BookmarkIntegrationContext | undefined;

  beforeAll(async () => {
    ctx = await setupBookmarkIntegrationTest();
  });

  afterAll(async () => {
    if (!ctx) {
      return;
    }
    await clearTestTables(ctx.dataSource);
    await ctx.moduleRef.close();
  });

  it('creates one bookmark and one change log from toolbar root fixture', async () => {
    if (ctx === undefined) {
      throw new Error('Integration context not initialized');
    }
    await assertSingleBookmarkUnderRootCreatesSyncAndLog(ctx);
  });
});
