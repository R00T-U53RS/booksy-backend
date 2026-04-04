import { clearBookmarkSyncTables } from '../../helpers/clear-bookmark-sync-tables';
import { clearTestTables } from '../../helpers/clear-test-tables';
import {
  type BookmarkIntegrationContext,
  setupBookmarkIntegrationTest,
} from '../../helpers/setup-bookmark-integration';

export interface BookmarkSyncIntegrationHarness {
  getCtx(): BookmarkIntegrationContext;
}

/**
 * Registers beforeAll / afterAll / beforeEach for bookmark sync integration suites.
 * Each spec file should call this once inside its top-level `describe`.
 */
export function registerBookmarkSyncIntegrationLifecycle(): BookmarkSyncIntegrationHarness {
  let ctx: BookmarkIntegrationContext | undefined;

  beforeAll(async () => {
    ctx = await setupBookmarkIntegrationTest();
  });

  afterAll(async () => {
    if (ctx === undefined) {
      return;
    }
    await clearTestTables(ctx.dataSource);
    await ctx.moduleRef.close();
    ctx = undefined;
  });

  beforeEach(async () => {
    if (ctx === undefined) {
      throw new Error('Bookmark integration context not initialized');
    }
    await clearBookmarkSyncTables(ctx.dataSource);
  });

  return {
    getCtx(): BookmarkIntegrationContext {
      if (ctx === undefined) {
        throw new Error('Bookmark integration context not initialized');
      }
      return ctx;
    },
  };
}
