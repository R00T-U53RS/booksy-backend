import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Profile } from '../../profile/entities/profile.entity';
import { User } from '../../users/entities/user.entity';
import { Bookmark } from '../entity/bookmark.entity';

import { ChangeSource, ChangeType, FieldChange } from './enums';
import type { BookmarkValuesSnapshot } from './types';

@Entity('bookmark_change_logs')
@Index(['bookmarkId'])
@Index(['userId'])
@Index(['profileId'])
@Index(['syncBatchId'])
@Index(['createdAt'])
@Index(['bookmarkId', 'createdAt'])
export class BookmarkChangeLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Reference to the bookmark that changed
  @ManyToOne(() => Bookmark, { nullable: false, onDelete: 'CASCADE' })
  bookmark: Bookmark;

  @Column()
  bookmarkId: string;

  // Change metadata
  @Column({ enum: ChangeType })
  changeType: ChangeType;

  @Column({ enum: ChangeSource })
  source: ChangeSource;

  // Field-level changes (JSONB for flexibility)
  @Column({ type: 'jsonb' })
  fieldChanges: FieldChange[];

  // Snapshot of old values (for rollback/debugging)
  @Column({ type: 'jsonb', nullable: true })
  oldValues?: BookmarkValuesSnapshot;

  // Snapshot of new values
  @Column({ type: 'jsonb', nullable: true })
  newValues?: BookmarkValuesSnapshot;

  // User who made the change
  @ManyToOne(() => User, { nullable: false })
  user: User;

  @Column()
  userId: string;

  // Profile context
  @ManyToOne(() => Profile, { nullable: false })
  profile: Profile;

  @Column()
  profileId: string;

  // Timestamp
  @CreateDateColumn()
  createdAt: Date;

  // Optional: sync batch ID for grouping related changes
  @Column({ nullable: true })
  syncBatchId?: string;
}
