import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookmarkSetController } from './bookmark-set.controller';
import { BookmarkSetService } from './bookmark-set.service';
import { BookmarkSet } from './entities/bookmark-set.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BookmarkSet])],
  controllers: [BookmarkSetController],
  providers: [BookmarkSetService],
})
export class BookmarkSetModule {}
