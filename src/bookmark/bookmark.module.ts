import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookmarkController } from './bookmark.controller';
import { BookmarkService } from './bookmark.service';
import { Bookmark } from './entity/bookmark.entity';
import { CacheService } from './services/cache.service';
import { MetadataExtractionService } from './services/metadata-extraction.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bookmark])],
  controllers: [BookmarkController],
  providers: [BookmarkService, MetadataExtractionService, CacheService],
})
export class BookmarkModule {}
