import { Module } from '@nestjs/common';

import { BookmarkSetController } from './bookmark-set.controller';
import { BookmarkSetService } from './bookmark-set.service';

@Module({
  controllers: [BookmarkSetController],
  providers: [BookmarkSetService],
})
export class BookmarkSetModule {}
