import * as bcrypt from 'bcrypt';
import type { Repository } from 'typeorm';

import type { User } from '../../src/users/entities/user.entity';

const BCRYPT_TEST_ROUNDS = 4;

export function seedSecondTestUser(
  userRepository: Repository<User>,
): Promise<User> {
  const user = userRepository.create({
    username: 'test_user_integration_other',
    email: 'test.integration.other@booksy.local',
    password: bcrypt.hashSync('test-password-other', BCRYPT_TEST_ROUNDS),
  });
  return userRepository.save(user);
}
