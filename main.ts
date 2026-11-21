import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const output = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

for (const name of ['app', 'screenshots']) {
  const source = join(root, name);
  if (!existsSync(source)) throw new Error(`Required ${name}/ directory is missing.`);
  rmSync(join(output, name), { recursive: true, force: true });
}
mkdirSync(output, { recursive: true });
cpSync(join(root, 'app'), join(output, 'app'), { recursive: true });
cpSync(join(root, 'screenshots'), join(output, 'screenshots'), { recursive: true });

const dossier = buildDossier(output, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(output, 'dossier.json'), dossier);
