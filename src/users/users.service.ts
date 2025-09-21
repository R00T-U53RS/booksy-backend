import { Injectable } from '@nestjs/common';

import { UserDto } from './dto/user.dto';

// FIXME: a better way to store users
const users: UserDto[] = [
  { id: 1, username: 'admin', password: 'admin' },
  { id: 2, username: 'user', password: 'user' },
];

@Injectable()
export class UsersService {
  // eslint-disable-next-line @typescript-eslint/require-await, require-await
  async findUserByName(username: string): Promise<UserDto | undefined> {
    return users.find(user => user.username === username);
  }
}
