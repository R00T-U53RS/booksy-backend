import { Injectable, Logger } from '@nestjs/common';

import { User } from '../../users/entities/user.entity';
import { SyncBookmarkItemDto } from '../dto/sync-request.dto';

import { BookmarkChangeAnalyzer } from './change-analyzer.service';
import { BookmarkProcessor } from './processor.service';
import { BookmarkTreeFlattener } from './tree-flattener.service';
import { BookmarkValidator } from './validator.service';

interface SyncStats {
  updated: number;
  created: number;
  deleted: number;
}

@Injectable()
export class BookmarkSyncService {
  private readonly logger = new Logger(BookmarkSyncService.name);

  constructor(
    private readonly validator: BookmarkValidator,
    private readonly treeFlattener: BookmarkTreeFlattener,
    private readonly changeAnalyzer: BookmarkChangeAnalyzer,
    private readonly processor: BookmarkProcessor,
  ) {}

  async sync(
    profileId: string,
    user: User,
    bookmarks: SyncBookmarkItemDto[],
  ): Promise<SyncStats> {
    this.logger.log(`Starting sync for profile ${profileId}, user ${user.id}`);

    this.validator.validateSyncData(bookmarks);

    const [profile, existingByParent] = await Promise.all([
      this.processor.findProfile(profileId, user.id),
      this.processor.loadExistingBookmarks(profileId, user.id),
    ]);

    const syncByParent = this.treeFlattener.flattenSyncTree(bookmarks);
    this.validator.validateParentReferences(syncByParent, existingByParent);

    const { modified, added, deleted } = this.changeAnalyzer.categorizeChanges(
      existingByParent,
      syncByParent,
    );

    const { moved, remainingDeleted, remainingAdded } =
      this.changeAnalyzer.detectMoves(deleted, added, syncByParent);

    const stats = await this.processor.processChangesInTransaction(
      { modified, moved, added: remainingAdded, deleted: remainingDeleted },
      { profileId, user, profile },
    );

    this.logger.log(
      `Sync completed for profile ${profileId}: ${JSON.stringify(stats)}`,
    );
    return stats;
  }
}
