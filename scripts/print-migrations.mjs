// Prints migrations in filename order, starting at the one you name, so you can paste them
// into the Supabase SQL Editor in one go.
//
//   node scripts/print-migrations.mjs 20260928000000 | clip      (Windows: copies to clipboard)
//   node scripts/print-migrations.mjs 20260928000000 | pbcopy    (macOS)
//   node scripts/print-migrations.mjs                             (lists the files)
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = join(import.meta.dirname, '..', 'supabase', 'migrations');
const files = readdirSync(dir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

const from = process.argv[2];
if (!from) {
  console.log('Migrations (pass the first one you still need to run):\n');
  for (const name of files) console.log(`  ${name.split('_')[0]}  ${name}`);
  process.exit(0);
}

const chosen = files.filter((name) => name >= from);
if (chosen.length === 0) {
  console.error(`No migrations at or after "${from}".`);
  process.exit(1);
}

for (const name of chosen) {
  process.stdout.write(`-- ═══ ${name} ═══\n\n${readFileSync(join(dir, name), 'utf8').trim()}\n\n`);
}
