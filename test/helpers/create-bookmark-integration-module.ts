import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, type TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';

import { BookmarkModule } from '../../src/bookmark/bookmark.module';
import { getDatabaseConfig } from '../../src/config/database.config';
import { validate } from '../../src/config/env.validation';
import { User } from '../../src/users/entities/user.entity';

export function createBookmarkIntegrationTestingModule(): Promise<TestingModule> {
  return Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        validate,
        ignoreEnvFile: true,
      }),
      TypeOrmModule.forRootAsync({
        inject: [ConfigService],
        useFactory: (configService: ConfigService) =>
          getDatabaseConfig(configService),
      }),
      TypeOrmModule.forFeature([User]),
      BookmarkModule,
    ],
  }).compile();
}
