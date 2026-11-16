// LUMEN DRIFT — make.fun best-game-01 entrypoint (Node 22, stdlib only).
//
// The grader runs `node /bot/main.ts` in a sandbox with no network: this
// program copies the static game (game/) and the screenshots (screenshots/)
// beside it into /output (or $MAKEFUN_OUTPUT_DIR outside the grader) and
// writes /output/dossier.json with the kit's vendored buildDossier. It is
// deterministic: the same repository always produces the same bytes.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });

// The game itself: plain static files, index.html at game/index.html.
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

// The screenshots the judge reads first (the first by name is the cover).
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The dossier: the judge's view of the game, built by the kit's library.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
