import { Injectable } from '@nestjs/common';

export interface User {
  id: number;
  username: string;
  password: string;
}

// FIXME: a better way to store users
const users: User[] = [
  { id: 1, username: 'admin', password: 'admin' },
  { id: 2, username: 'user', password: 'user' },
];

@Injectable()
export class UsersService {
  // eslint-disable-next-line @typescript-eslint/require-await, require-await
  async findUserByName(username: string): Promise<User | undefined> {
    return users.find(user => user.username === username);
  }
}
