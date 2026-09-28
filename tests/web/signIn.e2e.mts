// Browser tests for the sign-in / sign-up screen, run against the exported website in
// headless Chrome. Build it first with `npx expo export --platform web`, then run
// `npm run test:web`. Supabase is mocked inside the browser, so nothing reaches a real
// project. Every field is filled by clicking its centre and typing, like a person
// tapping it, so a layer drawn over a field (it happened: the frosted glass behind the
// form swallowed taps on the website) fails the test instead of shipping.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { extname, join, resolve, sep } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';

import puppeteer, { type Browser, type HTTPRequest, type Page } from 'puppeteer-core';

const DIST = resolve(fileURLToPath(new URL('../../dist/', import.meta.url)));
const TIMEOUT = { timeout: 90_000 };

// Chrome that's already installed: GitHub's Ubuntu runners have it, and so do most PCs.
const CHROME = [
  process.env.CHROME_PATH,
  process.env.CHROME_BIN,
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
].find((path): path is string => Boolean(path && existsSync(path)));

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

/** Serves dist/ the way EAS Hosting does for these pages: "/" is index.html. */
function serveDist(): Server {
  return createServer((request, response) => {
    const path = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    let file = resolve(DIST, `.${path.endsWith('/') ? `${path}index.html` : path}`);
    if (!existsSync(file) && existsSync(`${file}.html`)) file = `${file}.html`;
    if (!file.startsWith(DIST + sep) || !existsSync(file) || !statSync(file).isFile()) {
      file = join(DIST, 'index.html');
    }
    response.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    response.end(readFileSync(file));
  });
}

// ─── Mock Supabase ──────────────────────────────────────────────────────────

const USER_ID = '00000000-0000-4000-8000-0000000000aa';
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkaPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);

type Reply = { status: number; body: unknown };
type AuthBody = { email?: string; password?: string; data?: { username?: string } };

type Backend = {
  /** Show featured-car photos (and so the frosted glass) behind the form. */
  featured: boolean;
  signUp?: (body: AuthBody) => Reply;
  signIn?: (body: AuthBody) => Reply;
  /** What the app sent to /auth/v1/signup and /auth/v1/token. */
  signUps: AuthBody[];
  signIns: AuthBody[];
  /** Set once the page has run its effects (it asks for the featured photos). */
  hydrated: boolean;
};

const base64url = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');

function authUser(body: AuthBody) {
  return {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: body.email,
    user_metadata: body.data ?? {},
    identities: [{ provider: 'email' }],
  };
}

/** Supabase's reply to a sign-up or sign-in that logs the person straight in. */
function session(body: AuthBody): Reply {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const claims = { sub: USER_ID, exp: expiresAt, role: 'authenticated', aud: 'authenticated' };
  return {
    status: 200,
    body: {
      access_token: `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(claims)}.signature`,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: expiresAt,
      refresh_token: 'refresh-token',
      user: authUser(body),
    },
  };
}

const authError = (status: number, code: string, msg: string): Reply => ({
  status,
  body: { code: status, error_code: code, msg },
});

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': '*',
  'access-control-expose-headers': '*',
};

function answer(request: HTTPRequest, backend: Backend) {
  const url = new URL(request.url());
  const method = request.method();
  if (method === 'OPTIONS') return request.respond({ status: 204, headers: CORS });
  const json = ({ status, body }: Reply) =>
    request.respond({
      status,
      headers: { ...CORS, 'content-range': '*/0' },
      contentType: 'application/json',
      body: method === 'HEAD' ? '' : JSON.stringify(body),
    });
  const sent = () => JSON.parse(request.postData() ?? '{}') as AuthBody;

  if (url.pathname === '/auth/v1/signup') {
    const body = sent();
    backend.signUps.push(body);
    return json(backend.signUp?.(body) ?? authError(500, 'unexpected', 'No sign-up reply in this test'));
  }
  if (url.pathname === '/auth/v1/token') {
    const body = sent();
    backend.signIns.push(body);
    return json(backend.signIn?.(body) ?? authError(400, 'invalid_credentials', 'Invalid login credentials'));
  }
  if (url.pathname === '/auth/v1/user') return json({ status: 200, body: authUser({}) });
  if (url.pathname.startsWith('/storage/v1/')) {
    return request.respond({ status: 200, headers: CORS, contentType: 'image/png', body: ONE_PIXEL_PNG });
  }
  if (url.pathname === '/rest/v1/rpc/featured_photos') backend.hydrated = true;
  if (url.pathname === '/rest/v1/rpc/featured_photos' && backend.featured) {
    const image_url = `${url.origin}/storage/v1/object/public/post-images/featured.png`;
    return json({ status: 200, body: [{ image_url, image_path: null, title: 'Test Car' }] });
  }
  // A brand-new account: nothing posted, followed or saved yet.
  return json({ status: 200, body: [] });
}

// ─── Browser helpers ────────────────────────────────────────────────────────

let server: Server;
let origin: string;
let browser: Browser;

before(async () => {
  assert.ok(
    existsSync(join(DIST, 'index.html')),
    'No website build in dist/. Run `npx expo export --platform web` first.'
  );
  assert.ok(CHROME, 'Chrome not found. Install Google Chrome or set CHROME_PATH to a Chrome/Chromium binary.');
  server = serveDist();
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    // GitHub's Ubuntu runners don't allow Chrome's sandbox; the page is our own build.
    args: process.env.CI ? ['--no-sandbox'] : [],
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
  });
});

after(async () => {
  await browser?.close();
  server?.close();
});

type App = { page: Page; backend: Backend; crashes: string[]; close: () => Promise<void> };

/** Opens the website signed out, in a fresh profile, with Supabase mocked by `backend`. */
async function openApp(options: Partial<Backend>): Promise<App> {
  const backend: Backend = { featured: false, signUps: [], signIns: [], hydrated: false, ...options };
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const crashes: string[] = [];
  page.on('pageerror', (error) => crashes.push(String((error as Error).message ?? error)));

  // No realtime in tests: sockets are created but never connect.
  await page.evaluateOnNewDocument(() => {
    class OfflineSocket extends EventTarget {
      static CONNECTING = 0;
      static OPEN = 1;
      static CLOSING = 2;
      static CLOSED = 3;
      readyState = 0;
      send() {}
      close() {
        this.readyState = 3;
      }
    }
    Object.defineProperty(window, 'WebSocket', { value: OfflineSocket });
  });
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin === origin || url.protocol === 'data:' || url.protocol === 'blob:') return request.continue();
    if (/^\/(auth|rest|storage)\/v1\//.test(url.pathname)) return answer(request, backend);
    return request.abort(); // Nothing else leaves the machine.
  });

  await page.goto(origin, { waitUntil: 'load', timeout: 60_000 });
  // The HTML arrives pre-rendered; typing before React takes over would be lost.
  await until(() => backend.hydrated, 'the page to start up');
  await page.waitForSelector('[aria-label="Email"]', { visible: true });
  if (backend.featured) {
    // The frosted glass goes up when the photos arrive; fill the form after that.
    await page.waitForFunction(() => document.body.innerText.includes('Test Car'));
  }
  return { page, backend, crashes, close: () => context.close() };
}

/** Clicks the middle of a field like a finger would, types, and checks the text went in. */
async function tapAndType(page: Page, label: string, text: string): Promise<string> {
  const field = await page.waitForSelector(`[aria-label="${label}"]`, { visible: true });
  assert.ok(field, `no ${label} field`);
  const covered = await field.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return hit === element ? null : `${hit?.tagName ?? 'nothing'} ${hit?.getAttribute('class') ?? ''}`;
  });
  assert.equal(covered, null, `A tap on the ${label} field lands on something drawn over it: ${covered}`);
  const box = await field.boundingBox();
  assert.ok(box, `${label} field is not on screen`);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.keyboard.type(text);
  return field.evaluate((element) => (element as HTMLInputElement).value);
}

/** Clicks the button whose whole label is `label` ("Sign in" is also in the welcome text). */
async function press(page: Page, label: string) {
  for (const button of await page.$$('button, [role="button"]')) {
    const text = await button.evaluate((element) => (element as HTMLElement).innerText.trim());
    if (text === label) return button.click();
  }
  assert.fail(`no "${label}" button`);
}

const pageText = (page: Page) => page.evaluate(() => document.body.innerText);
const settle = (ms = 400) => new Promise((done) => setTimeout(done, ms));

async function until(check: () => boolean, what: string, ms = 30_000) {
  const deadline = Date.now() + ms;
  while (!check()) {
    if (Date.now() > deadline) assert.fail(`timed out waiting for ${what}`);
    await settle(50);
  }
}

/** Waits until the sign-in screen is gone and the tabs are showing. */
async function waitForFeed(page: Page) {
  await page.waitForFunction(
    () => !document.querySelector('[aria-label="Password"]') && document.body.innerText.includes('Feed'),
    { timeout: 30_000 }
  );
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test('sign-up over the featured-car photos: every field takes taps and the new account lands on the feed', TIMEOUT, async () => {
  const app = await openApp({ featured: true, signUp: session });
  try {
    await press(app.page, 'New here? Create an account');
    assert.equal(await tapAndType(app.page, 'Handle', "Joe's Car"), 'joescar', 'handles are cleaned as you type');
    assert.equal(await tapAndType(app.page, 'Email', 'new.driver@example.com'), 'new.driver@example.com');

    // Not enough yet: the button does nothing until the password has 6+ characters.
    assert.equal(await tapAndType(app.page, 'Password', 'abc'), 'abc');
    await press(app.page, 'Create account');
    await settle();
    assert.equal(app.backend.signUps.length, 0, 'sent a sign-up with a too-short password');

    await tapAndType(app.page, 'Password', 'def');
    await press(app.page, 'Create account');
    await waitForFeed(app.page);

    assert.equal(app.backend.signUps.length, 1);
    const [sent] = app.backend.signUps;
    assert.equal(sent.email, 'new.driver@example.com');
    assert.equal(sent.password, 'abcdef');
    assert.deepEqual(sent.data, { username: 'joescar' });
    assert.deepEqual(app.crashes, []);
  } finally {
    await app.close();
  }
});

test('sign-up: an error from Supabase shows on the form', TIMEOUT, async () => {
  const app = await openApp({
    signUp: () => authError(422, 'user_already_exists', 'User already registered'),
  });
  try {
    await press(app.page, 'New here? Create an account');
    await tapAndType(app.page, 'Handle', 'taken');
    await tapAndType(app.page, 'Email', 'taken@example.com');
    await tapAndType(app.page, 'Password', 'secret123');
    await press(app.page, 'Create account');
    await app.page.waitForFunction(() => document.body.innerText.includes('User already registered'));
    assert.ok(await app.page.$('[aria-label="Handle"]'), 'stays on the sign-up form');
    assert.deepEqual(app.crashes, []);
  } finally {
    await app.close();
  }
});

test('sign-up with email confirmation turned on asks the person to check their email', TIMEOUT, async () => {
  // With "Confirm email" on, Supabase returns the user but no session.
  const app = await openApp({ signUp: (body) => ({ status: 200, body: authUser(body) }) });
  try {
    await press(app.page, 'New here? Create an account');
    await tapAndType(app.page, 'Handle', 'pending');
    await tapAndType(app.page, 'Email', 'pending@example.com');
    await tapAndType(app.page, 'Password', 'secret123');
    await press(app.page, 'Create account');
    await app.page.waitForFunction(() => document.body.innerText.includes('Check your email'));
    assert.equal(app.backend.signUps.length, 1);
    assert.deepEqual(app.crashes, []);
  } finally {
    await app.close();
  }
});

test('sign-in over the featured-car photos: both fields take taps and it opens the feed', TIMEOUT, async () => {
  const app = await openApp({ featured: true, signIn: session });
  try {
    assert.ok((await pageText(app.page)).includes('Welcome back'));
    await tapAndType(app.page, 'Email', 'driver@example.com');
    await tapAndType(app.page, 'Password', 'secret123');
    await press(app.page, 'Sign in');
    await waitForFeed(app.page);
    assert.equal(app.backend.signIns.length, 1);
    assert.equal(app.backend.signIns[0].email, 'driver@example.com');
    assert.equal(app.backend.signIns[0].password, 'secret123');
    assert.deepEqual(app.crashes, []);
  } finally {
    await app.close();
  }
});
