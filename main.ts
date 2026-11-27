// Harbor Run — entrypoint: copies game/ and screenshots/ into the output
// directory and writes dossier.json with the kit's buildDossier.
// Runs on Node 22 with the standard library only; deterministic: two runs
// write the same bytes.

import { buildDossier } from './vendor/makefun-game.ts';
import { cpSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Clear only the CONTENTS of the output directory, never the directory
// itself: in the grader sandbox /output is a Docker volume mount point,
// and removing the mount point throws EBUSY (force only ignores ENOENT).
mkdirSync(out, { recursive: true });
for (const child of readdirSync(out)) {
  rmSync(join(out, child), { recursive: true, force: true });
}
cpSync(join(root, 'game'), join(out, 'game'), { recursive: true });
cpSync(join(root, 'screenshots'), join(out, 'screenshots'), { recursive: true });

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);
console.log(`wrote ${out}/dossier.json (${dossier.length} bytes)`);
