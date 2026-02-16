import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Profile } from '../profile/entities/profile.entity';

import { BookmarkController } from './bookmark.controller';
import { BookmarkService } from './bookmark.service';
import { Bookmark } from './entity/bookmark.entity';
import { BookmarkChangeAnalyzer } from './sync/change-analyzer.service';
import { BookmarkSyncService } from './sync/orchestrator.service';
import { BookmarkProcessor } from './sync/processor.service';
import { BookmarkTreeFlattener } from './sync/tree-flattener.service';
import { BookmarkValidator } from './sync/validator.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bookmark, Profile])],
  controllers: [BookmarkController],
  providers: [
    BookmarkService,
    BookmarkSyncService,
    BookmarkValidator,
    BookmarkTreeFlattener,
    BookmarkChangeAnalyzer,
    BookmarkProcessor,
  ],
})
export class BookmarkModule {}
