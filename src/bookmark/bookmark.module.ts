import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Profile } from '../profile/entities/profile.entity';

import { BookmarkController } from './bookmark.controller';
import { BookmarkService } from './bookmark.service';
import { Bookmark } from './entity/bookmark.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Bookmark, Profile])],
  controllers: [BookmarkController],
  providers: [BookmarkService],
})
export class BookmarkModule {}
