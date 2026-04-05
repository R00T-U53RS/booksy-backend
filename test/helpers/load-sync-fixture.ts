import { readFileSync } from 'fs';
import { join } from 'path';

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { SyncBookmarkItemDto } from '../../src/bookmark/dto/sync-request.dto';

export function loadSyncFixtureFile(
  fixtureRelativePath: string,
): SyncBookmarkItemDto[] {
  const fullPath = join(__dirname, '..', 'fixtures', fixtureRelativePath);
  const raw = JSON.parse(readFileSync(fullPath, 'utf8')) as unknown;
  return parseSyncFixtureTree(raw);
}

function parseSyncFixtureTree(raw: unknown): SyncBookmarkItemDto[] {
  if (!Array.isArray(raw)) {
    throw new Error('Sync fixture must be a JSON array');
  }

  const instances = plainToInstance(SyncBookmarkItemDto, raw, {
    enableImplicitConversion: true,
  });

  for (const item of instances) {
    validateSyncTree(item);
  }

  return instances;
}

function validateSyncTree(dto: SyncBookmarkItemDto): void {
  const errors = validateSync(dto);
  if (errors.length > 0) {
    throw new Error(errors.toString());
  }

  if (dto.children) {
    for (const child of dto.children) {
      validateSyncTree(child);
    }
  }
}
