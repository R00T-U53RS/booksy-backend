import { getRepositoryToken } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';

import { BookmarkChangeLog } from '../../src/bookmark/change-tracker/bookmark-change-log.entity';
import { Bookmark } from '../../src/bookmark/entity/bookmark.entity';
import { User } from '../../src/users/entities/user.entity';

import type { BookmarkIntegrationContext } from './setup-bookmark-integration';

export interface BookmarkIntegrationRepos {
  readonly bookmarks: Repository<Bookmark>;
  readonly changeLogs: Repository<BookmarkChangeLog>;
  readonly users: Repository<User>;
}

export function getBookmarkIntegrationRepos(
  ctx: BookmarkIntegrationContext,
): BookmarkIntegrationRepos {
  return {
    bookmarks: ctx.moduleRef.get<Repository<Bookmark>>(
      getRepositoryToken(Bookmark),
    ),
    changeLogs: ctx.moduleRef.get<Repository<BookmarkChangeLog>>(
      getRepositoryToken(BookmarkChangeLog),
    ),
    users: ctx.moduleRef.get<Repository<User>>(getRepositoryToken(User)),
  };
}
