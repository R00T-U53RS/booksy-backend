import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Profile } from '../profile/entities/profile.entity';

import { BookmarkController } from './bookmark.controller';
import { BookmarkService } from './bookmark.service';
import { BookmarkChangeLog } from './change-tracker/bookmark-change-log.entity';
import { BookmarkChangeTracker } from './change-tracker/change-tracker.service';
import { BookmarkFieldDiff } from './change-tracker/field-diff.service';
import { BookmarkHistoryService } from './change-tracker/history.service';
import { BookmarkValueUtils } from './change-tracker/value-utils.service';
import { Bookmark } from './entity/bookmark.entity';
import { BookmarkChangeAnalyzer } from './sync/change-analyzer.service';
import { BookmarkSyncService } from './sync/orchestrator.service';
import { BookmarkProcessor } from './sync/processor.service';
import { BookmarkTreeFlattener } from './sync/tree-flattener.service';
import { BookmarkValidator } from './sync/validator.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bookmark, Profile, BookmarkChangeLog])],
  controllers: [BookmarkController],
  providers: [
    BookmarkService,
    BookmarkSyncService,
    BookmarkValidator,
    BookmarkTreeFlattener,
    BookmarkChangeAnalyzer,
    BookmarkProcessor,
    BookmarkChangeTracker,
    BookmarkHistoryService,
    BookmarkFieldDiff,
    BookmarkValueUtils,
  ],
})
export class BookmarkModule {}
