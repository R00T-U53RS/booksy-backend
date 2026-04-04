import * as fs from 'fs';
import * as path from 'path';

import { config } from 'dotenv';

const root = process.cwd();
const envTestPath = path.resolve(root, '.env.test');
const envDefaultPath = path.resolve(root, '.env');

if (fs.existsSync(envTestPath)) {
  config({ path: envTestPath });
} else if (fs.existsSync(envDefaultPath)) {
  config({ path: envDefaultPath });
}

// Jest sets NODE_ENV=test; validate() in src/config/env.validation.ts only allows
// local | staging | production (see Environment enum).
process.env.NODE_ENV = 'local';
