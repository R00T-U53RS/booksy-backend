import type { TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, type Repository } from 'typeorm';

import { BookmarkService } from '../../src/bookmark/bookmark.service';
import { Profile } from '../../src/profile/entities/profile.entity';
import { User } from '../../src/users/entities/user.entity';

import { clearTestTables } from './clear-test-tables';
import { createBookmarkIntegrationTestingModule } from './create-bookmark-integration-module';
import { seedTestUserAndProfile } from './seed-test-user-profile';

export interface BookmarkIntegrationContext {
  moduleRef: TestingModule;
  dataSource: DataSource;
  bookmarkService: BookmarkService;
  user: User;
  profile: Profile;
}

export async function setupBookmarkIntegrationTest(): Promise<BookmarkIntegrationContext> {
  const moduleRef = await createBookmarkIntegrationTestingModule();
  const dataSource = moduleRef.get(DataSource);
  await clearTestTables(dataSource);

  const userRepository = moduleRef.get<Repository<User>>(
    getRepositoryToken(User),
  );
  const profileRepository = moduleRef.get<Repository<Profile>>(
    getRepositoryToken(Profile),
  );
  const { user, profile } = await seedTestUserAndProfile(
    userRepository,
    profileRepository,
  );
  const bookmarkService = moduleRef.get(BookmarkService);

  return { moduleRef, dataSource, bookmarkService, user, profile };
}
