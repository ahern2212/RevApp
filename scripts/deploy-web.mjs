#!/usr/bin/env node
// Publishes the web version of the app to its public EAS Hosting link.
//
//   npm run deploy:web            build + deploy once, print the link
//   npm run deploy:web:watch      deploy, open the site, then redeploy automatically
//                                 whenever you save changes (Ctrl+C to stop)
//
// Options (after `--`, e.g. `npm run deploy:web:watch -- --no-open`):
//   --no-open         don't open the site in the browser
//   --quiet=SECONDS   how long to wait after the last save before redeploying (default 30)
//   --domain=NAME     first deploy only: pick the NAME.expo.app subdomain
//   --dry-run         build and package, but don't upload

import { spawn } from 'node:child_process';
import { existsSync, watch } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Anything that changes what ships to the browser.
const WATCHED = ['app', 'components', 'constants', 'context', 'lib', 'assets', 'app.json', 'types.ts', '.env'];

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];

const watchMode = flag('watch');
const openBrowser = !flag('no-open');
const dryRun = flag('dry-run');
const domain = option('domain');
const quietMs = Number(option('quiet') ?? 30) * 1000;

const time = () => new Date().toLocaleTimeString();
const log = (msg) => console.log(`[${time()}] ${msg}`);

/** Runs a command, streaming its output, and resolves with everything it printed. */
function run(command, commandArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { cwd: ROOT, shell: true, env: { ...process.env, CI: '1' } });
    let output = '';
    const collect = (stream, sink) =>
      stream.on('data', (chunk) => {
        output += chunk;
        sink.write(chunk);
      });
    collect(child.stdout, process.stdout);
    collect(child.stderr, process.stderr);
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0 ? resolve(output) : reject(new Error(`${command} ${commandArgs.join(' ')} exited with ${code}`))
    );
  });
}

// The production link is the one without a "--<id>" deployment suffix, e.g. garage.expo.app.
function productionUrl(output) {
  const urls = [...new Set(output.match(/https:\/\/[a-z0-9-]+(?:\.[a-z0-9-]+)*\.expo\.app/gi) ?? [])];
  return urls.find((u) => !/--/.test(new URL(u).hostname)) ?? urls[0] ?? null;
}

function open(url) {
  const opener = process.platform === 'win32' ? 'start ""' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawn(`${opener} "${url}"`, { shell: true, stdio: 'ignore', detached: true }).unref();
}

async function deploy() {
  const started = Date.now();
  log('Building the website…');
  await run('npx', ['expo', 'export', '--platform', 'web', '--clear']);

  log(dryRun ? 'Packaging (dry run, nothing uploaded)…' : 'Uploading…');
  const deployArgs = ['eas-cli@latest', 'deploy', '--prod', '--non-interactive'];
  if (domain) deployArgs.push(`--dev-domain=${domain}`);
  if (dryRun) deployArgs.push('--dry-run');
  const output = await run('npx', deployArgs);

  const url = productionUrl(output);
  const secs = Math.round((Date.now() - started) / 1000);
  log(dryRun ? `✅ Packaged in ${secs}s (dry run, not uploaded)` : `✅ Deployed in ${secs}s${url ? ` → ${url}` : ''}`);
  return url;
}

async function main() {
  if (!existsSync(path.join(ROOT, 'app.json'))) throw new Error('Run this from the Expo project.');

  let url = null;
  try {
    url = await deploy();
  } catch (error) {
    log(`❌ Deploy failed: ${error.message}`);
    if (!watchMode) process.exit(1);
  }
  if (url && openBrowser && !dryRun) open(url);
  if (!watchMode) return;

  let timer = null;
  let deploying = false;
  let pending = false;

  const redeploy = async () => {
    if (deploying) {
      pending = true; // another save landed mid-deploy; go again when this one finishes
      return;
    }
    deploying = true;
    try {
      await deploy();
    } catch (error) {
      log(`❌ Deploy failed: ${error.message} — fix the error and save again.`);
    } finally {
      deploying = false;
      if (pending) {
        pending = false;
        redeploy();
      }
    }
  };

  const onChange = (file) => {
    clearTimeout(timer);
    log(`Change detected${file ? ` (${file})` : ''} — redeploying after ${quietMs / 1000}s without edits…`);
    timer = setTimeout(redeploy, quietMs);
  };

  for (const entry of WATCHED) {
    const full = path.join(ROOT, entry);
    if (!existsSync(full)) continue;
    watch(full, { recursive: true }, (_event, file) => onChange(file ? path.join(entry, file) : entry));
  }
  log(`👀 Watching for changes. The site stays live between deploys. Press Ctrl+C to stop watching.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
