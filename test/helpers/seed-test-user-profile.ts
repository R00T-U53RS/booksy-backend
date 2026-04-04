import * as bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';

import type { Profile } from '../../src/profile/entities/profile.entity';
import type { User } from '../../src/users/entities/user.entity';

const BCRYPT_TEST_ROUNDS = 4;

export interface SeedTestUserProfileResult {
  user: User;
  profile: Profile;
}

export async function seedTestUserAndProfile(
  userRepository: Repository<User>,
  profileRepository: Repository<Profile>,
): Promise<SeedTestUserProfileResult> {
  const user = userRepository.create({
    username: 'test_user_integration',
    email: 'test.integration@booksy.local',
    password: bcrypt.hashSync('test-password', BCRYPT_TEST_ROUNDS),
  });
  await userRepository.save(user);

  const profile = profileRepository.create({
    name: 'Integration Test Profile',
    user,
  });
  await profileRepository.save(profile);

  return { user, profile };
}
