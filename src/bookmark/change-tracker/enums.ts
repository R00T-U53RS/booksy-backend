import type { FieldValue } from './types';

export enum ChangeType {
  CREATED = 'created',
  UPDATED = 'updated',
  MOVED = 'moved',
  DELETED = 'deleted',
}

export enum ChangeSource {
  SYNC = 'sync',
  MANUAL_UPDATE = 'manual_update',
  API = 'api',
}

export interface FieldChange {
  field: string;
  oldValue: FieldValue;
  newValue: FieldValue;
  changeType: 'added' | 'modified' | 'removed';
}
