import fs from 'fs';
import path from 'path';

const prismaDir = path.resolve(process.cwd(), 'prisma');
const mainPath = path.join(prismaDir, 'schema.prisma');
const sqlitePath = path.join(prismaDir, 'schema.sqlite.prisma');
const postgresPath = path.join(prismaDir, 'schema.postgres.prisma');

function read(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').trim();
}

function stripDatasourceBlock(schema) {
  return schema
    .replace(/datasource\s+db\s*\{[\s\S]*?\n\}/m, 'datasource db {\n  provider = "__PROVIDER__"\n  url      = env("DATABASE_URL")\n}')
    .trim();
}

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

const mainSchema = read(mainPath);
const sqliteSchema = read(sqlitePath);
const postgresSchema = read(postgresPath);

if (mainSchema !== sqliteSchema) {
  fail('prisma/schema.prisma must stay identical to prisma/schema.sqlite.prisma for local development.');
}

if (stripDatasourceBlock(sqliteSchema) !== stripDatasourceBlock(postgresSchema)) {
  fail('prisma/schema.sqlite.prisma and prisma/schema.postgres.prisma drifted beyond the datasource block.');
}

console.log('Prisma schema parity OK');
