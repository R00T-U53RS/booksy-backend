# Booksy Backend

A powerful bookmark management system backend built with NestJS, PostgreSQL, and JWT authentication. Booksy enables users to organize, search, and sync their bookmarks across multiple browser profiles while keeping each profile's bookmarks completely separate.

## 🎯 About Booksy

Booksy is a comprehensive bookmark management platform that helps users organize and access their bookmarks efficiently. Key features include:

### Core Features

- 📚 **Bookmark Management** - Create, read, update, and delete bookmarks
- 🔍 **Advanced Search** - Search bookmarks by title, URL, tags, and folders
- 👤 **Multi-Profile Support** - Manage separate bookmark collections for different browser profiles
- 🔄 **Cross-Browser Sync** - Sync bookmarks across Chrome, Firefox, Edge, and more
- 🏷️ **Tagging System** - Organize bookmarks with custom tags
- 📁 **Folder Structure** - Hierarchical organization of bookmarks
- 🔐 **Secure Authentication** - JWT-based user authentication
- 🌐 **Profile Isolation** - Each browser profile maintains separate bookmarks

### Technical Features

- ✅ **NestJS Framework** - Progressive Node.js framework
- ✅ **PostgreSQL** - Robust relational database
- ✅ **TypeORM** - Advanced ORM with entities and migrations
- ✅ **JWT Authentication** - Secure token-based authentication
- ✅ **Environment Validation** - Type-safe environment variables
- ✅ **Class Validation** - Request/response validation with DTOs
- ✅ **Class Transformer** - Clean DTO serialization
- ✅ **ESLint & Prettier** - Code quality and formatting
- ✅ **Husky & Lint-staged** - Pre-commit hooks

## Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v14 or higher)
- npm or yarn

## Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd booksy-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your configuration:

   ```env
   NODE_ENV=local
   PORT=3000

   DB_HOST=localhost
   DB_PORT=5432
   DB_USERNAME=postgres
   DB_PASSWORD=your_password
   DB_DATABASE=booksy
   DB_SYNC=true

   JWT_SECRET=your-super-secret-key
   JWT_EXPIRES_IN=1d
   ```

4. **Create PostgreSQL database**
   ```bash
   psql -U postgres
   CREATE DATABASE booksy;
   \q
   ```

## Running the Application

### Development

```bash
npm run start:dev
```

### Production

```bash
npm run build
npm run start:prod
```

### Debug Mode

```bash
npm run start:debug
```

## Project Structure

```
src/
├── auth/                    # Authentication module
│   ├── dto/                # Auth DTOs (request/response)
│   ├── guards/             # JWT and Local guards
│   ├── strategies/         # Passport strategies
│   ├── auth.controller.ts  # Auth endpoints
│   ├── auth.module.ts
│   └── auth.service.ts
├── config/                  # Configuration files
│   ├── database.config.ts  # TypeORM configuration
│   └── env.validation.ts   # Environment validation schema
├── users/                   # Users module
│   ├── dto/                # User DTOs
│   ├── entities/           # User entity
│   ├── users.module.ts
│   └── users.service.ts
├── app.module.ts           # Root module
└── main.ts                 # Application entry point
```

## API Endpoints

### Authentication

**POST** `/auth/login`

- Login with username and password
- Request body:
  ```json
  {
    "username": "admin",
    "password": "password"
  }
  ```
- Response:
  ```json
  {
    "accessToken": "jwt_token_here",
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```

**GET** `/auth/me`

- Get current user profile (requires JWT token)
- Headers: `Authorization: Bearer <token>`
- Response:
  ```json
  {
    "id": 1,
    "username": "admin",
    "email": "admin@example.com",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
  ```

## Environment Variables

| Variable       | Description                                         | Default   |
| -------------- | --------------------------------------------------- | --------- |
| NODE_ENV       | Environment (local/staging/production)              | local     |
| PORT           | Application port                                    | 3000      |
| DB_HOST        | PostgreSQL host                                     | localhost |
| DB_PORT        | PostgreSQL port                                     | 5432      |
| DB_USERNAME    | Database username                                   | postgres  |
| DB_PASSWORD    | Database password                                   | postgres  |
| DB_DATABASE    | Database name                                       | booksy    |
| DB_SYNC        | Auto-sync database schema (use false in production) | true      |
| JWT_SECRET     | JWT signing secret                                  | -         |
| JWT_EXPIRES_IN | JWT expiration time                                 | 1d        |

## DTO Architecture

### Request DTOs

- Use `class-validator` decorators for validation
- Example: `LoginRequestDto`, `CreateUserDto`

### Response DTOs

- Use `class-transformer` decorators (`@Expose()`, `@Exclude()`)
- Automatically exclude sensitive fields (e.g., passwords)
- Example: `UserResponseDto`, `LoginResponseDto`

### Entity to DTO Transformation

```typescript
import { plainToInstance } from 'class-transformer';

const dto = plainToInstance(UserResponseDto, user, {
  excludeExtraneousValues: true,
});
```

## Database

### TypeORM Configuration

- Entity-first approach
- Automatic synchronization in development (set `DB_SYNC=true`)
- Use migrations in production

### User Entity

Located in `src/users/entities/user.entity.ts`

```typescript
@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column({ unique: true, nullable: true })
  email?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

## Security

- JWT tokens for authentication
- Password validation with `class-validator`
- CORS enabled
- Environment variable validation
- Input validation on all endpoints
- Whitelist validation (strips unknown properties)

## 🚧 Roadmap

### Phase 1: Core Bookmark Features (In Progress)

- [ ] Implement bookmark CRUD operations
- [ ] Add folder/collection management
- [ ] Implement tagging system
- [ ] Add search functionality (full-text search)
- [ ] Create bookmark import/export

### Phase 2: Multi-Profile Support

- [ ] Browser profile management
- [ ] Profile-specific bookmark storage
- [ ] Profile switching API
- [ ] Profile isolation enforcement

### Phase 3: Sync & Collaboration

- [ ] Real-time sync across devices
- [ ] Browser extension API endpoints
- [ ] Conflict resolution for synced bookmarks
- [ ] Shared bookmark collections

### Phase 4: Advanced Features

- [ ] Bookmark metadata extraction (favicon, description)
- [ ] Dead link detection
- [ ] Duplicate bookmark detection
- [ ] Bookmark analytics and insights
- [ ] Smart folders (auto-categorization)

### Phase 5: Security & Production

- [ ] Implement bcrypt for password hashing
- [ ] Add refresh token functionality
- [ ] Implement user registration endpoint
- [ ] Add email verification
- [ ] Create database migrations
- [ ] Add API documentation (Swagger/OpenAPI)
- [ ] Implement rate limiting
- [ ] Add comprehensive error handling
- [ ] Write unit and e2e tests
- [ ] Add logging service (Winston/Pino)

## 🎨 Use Cases

- **Developers:** Organize technical resources, documentation, and code examples
- **Researchers:** Manage research papers, articles, and reference materials
- **Professionals:** Keep work and personal bookmarks separate with different profiles
- **Multi-Device Users:** Access bookmarks across all devices seamlessly
- **Privacy-Conscious Users:** Maintain isolated bookmark collections for different contexts

## 📖 Documentation

All development guidelines, patterns, and best practices are available in the `.cursor/` directory as Cursor Rules:

- **[booksy-development-rules.mdc](./.cursor/booksy-development-rules.mdc)** - Complete development guidelines with DTO patterns and best practices
- **[SETUP_GUIDE.md](./SETUP_GUIDE.md)** - Detailed setup instructions

The MDC file is automatically loaded by Cursor AI and provides context-aware assistance.

## 🛠️ Scripts

```bash
npm run build          # Build the project
npm run start          # Start production server
npm run start:dev      # Start development server with watch
npm run start:debug    # Start with debugger
npm run lint           # Run ESLint
npm run lint:fix       # Fix ESLint issues
npm run format         # Format code with Prettier
npm run format:check   # Check code formatting
npm run type-check     # Check TypeScript types
```

## 🤝 Contributing

Contributions are welcome! Please fork this repo and raise a PR against main branch.
