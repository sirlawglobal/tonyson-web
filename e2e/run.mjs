/**
 * Browser end-to-end tests for the Phase 5 auth swap, run in a REAL Chrome against the REAL API.
 *
 * Needs running: the API (port 4000, NODE_ENV=development so emails are logged to its stdout), the store (3000) and the
 * admin app (3001). Email codes/links are read from the API's log: set API_LOG to the file its stdout is written to.
 * A Super Admin must exist: SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (see api/README.md, npm run seed:super-admin).
 *
 *   API_LOG=/path/to/api.log SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... npm test
 *
 * Optional: CHROME_PATH, STORE_URL, ADMIN_URL, API_URL, SHOTS (directory for screenshots).
 */
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';

const STORE = process.env.STORE_URL ?? 'http://localhost:3000';
const ADMIN = process.env.ADMIN_URL ?? 'http://localhost:3001';
const API = process.env.API_URL ?? 'http://localhost:4000';
const API_LOG = process.env.API_LOG;
const SA_EMAIL = process.env.SEED_ADMIN_EMAIL;
const SA_PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const SHOTS = process.env.SHOTS;
const PASSWORD = 'Passw0rd!x';
const CHROME = [process.env.CHROME_PATH, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/usr/bin/google-chrome'].find((p) => p && existsSync(p));

if (!API_LOG || !SA_EMAIL || !SA_PASSWORD) {
  console.error('Set API_LOG, SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (see the header of run.mjs).');
  process.exit(2);
}
if (!CHROME) {
  console.error('No Chrome/Edge found. Set CHROME_PATH.');
  process.exit(2);
}
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

/* ------------------------------- tiny harness ------------------------------- */
const results = [];
let currentPage = null;
async function step(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true });
    console.log(`  \u2713 ${name} (${Date.now() - started} ms)`);
  } catch (err) {
    results.push({ name, ok: false, err });
    console.log(`  \u2717 ${name}\n      ${String(err.message).split('\n').slice(0, 6).join('\n      ')}`);
    if (SHOTS && currentPage) await currentPage.screenshot({ path: `${SHOTS}/FAIL-${name.replace(/\W+/g, '-').slice(0, 60)}.png` }).catch(() => {});
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uniq = (tag) => `${tag}-${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}@example.com`;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Waits (the API dispatches outbox emails every ~2 s) for the last log match for this recipient. */
async function fromEmail(to, pattern, { timeout = 15000, after = 0 } = {}) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const text = readFileSync(API_LOG, 'utf8');
    const matches = [...text.slice(after).matchAll(new RegExp(`To: ${esc(to)}[\\s\\S]{0,700}?${pattern}`, 'g'))];
    if (matches.length) return matches[matches.length - 1][1];
    await sleep(300);
  }
  throw new Error(`no email to ${to} matching ${pattern} within ${timeout} ms`);
}
const logSize = () => readFileSync(API_LOG, 'utf8').length;

/** Dev servers compile each route on first request (the store home page takes about a minute); production builds do not. */
async function warmUp() {
  const targets = [
    ...['/', '/login', '/register', '/verify', '/account', '/account/profile', '/forgot-password', '/reset-password?token=x'].map((p) => STORE + p),
    ...['/', '/login', '/staff', '/audit-log', '/orders', '/inventory', '/set-password?token=x'].map((p) => ADMIN + p),
  ];
  for (const url of targets) await fetch(url, { signal: AbortSignal.timeout(180000) }).catch(() => {});
}
console.log('Warming up routes...');
await warmUp();

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const consoleErrors = [];
async function newPage(label, opts = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
  const page = await context.newPage();
  page.on('pageerror', (e) => consoleErrors.push(`[${label}] pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) consoleErrors.push(`[${label}] console: ${m.text().slice(0, 200)}`);
  });
  currentPage = page;
  return { context, page };
}
const shot = (page, name) => SHOTS && page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }).catch(() => {});

const cookies = async (context) => (await context.cookies()).filter((c) => c.name.startsWith('tonyson'));

/* ================================== STORE ================================== */
console.log('\nSTORE (customer)');
{
  const { context, page } = await newPage('store');
  const email = uniq('shopper');
  let verifyFrom = 0;

  await step('guests are sent to /login?next= when opening /account', async () => {
    await page.goto(`${STORE}/account`);
    await page.waitForURL(/\/login\?next=%2Faccount/, { timeout: 15000 });
  });

  await step('register creates the account, signs in, and lands on /verify', async () => {
    verifyFrom = logSize();
    await page.goto(`${STORE}/register`);
    await page.getByLabel('Full name').fill('Amara Okafor');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Phone number').fill('08012345678');
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Create account' }).click();
    await page.waitForURL(/\/verify/, { timeout: 20000 });
    await shot(page, 'store-verify');
  });

  await step('refresh token is an httpOnly cookie; no token in JS-readable storage', async () => {
    const [rt] = await cookies(context);
    assert(rt && rt.name === 'tonyson_rt', 'refresh cookie not set');
    assert(rt.httpOnly, 'cookie is not httpOnly');
    assert(rt.path === '/api/v1/auth', `cookie path is ${rt.path}`);
    const leaked = await page.evaluate(() => ({
      cookie: document.cookie,
      storage: JSON.stringify({ ...localStorage, ...sessionStorage }),
    }));
    assert(!leaked.cookie.includes('tonyson_rt'), 'cookie readable from JS');
    assert(!/eyJ|accessToken|refresh/i.test(leaked.storage), `token-like value in storage: ${leaked.storage}`);
  });

  await step('a wrong code shows the API message; the right code (from the emailed log) verifies', async () => {
    const code = await fromEmail(email, 'verification code is (\\d{6})', { after: verifyFrom });
    const wrong = code === '000000' ? '111111' : '000000';
    await page.getByLabel('Digit 1').click();
    await page.keyboard.type(wrong);
    await page.getByText('That code is not correct').waitFor({ timeout: 10000 });
    await page.getByLabel('Digit 1').click();
    await page.keyboard.type(code);
    await page.waitForURL(/\/account$/, { timeout: 15000 });
  });

  await step('reload keeps the user signed in (session restored from the refresh cookie)', async () => {
    const refreshCalls = [];
    page.on('request', (r) => r.url().includes('/auth/refresh') && refreshCalls.push(r.method()));
    await page.reload();
    await page.waitForURL(/\/account$/);
    await page.getByRole('link', { name: /Amara/ }).first().waitFor({ timeout: 10000 });
    assert(refreshCalls.includes('POST'), 'expected a POST /auth/refresh on reload');
  });

  await step('a rejected access token is refreshed and the request retried, invisibly', async () => {
    let blocked = false;
    await page.route('**/api/v1/auth/me', async (route) => {
      if (!blocked) {
        blocked = true;
        return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ statusCode: 401, code: 'UNAUTHENTICATED', message: 'expired' }) });
      }
      return route.continue();
    });
    await page.reload();
    await page.getByRole('link', { name: /Amara/ }).first().waitFor({ timeout: 10000 });
    await page.unroute('**/api/v1/auth/me');
    assert(blocked, 'the 401 was never injected');
    assert(!page.url().includes('/login'), 'user was bounced to login');
  });

  await step('profile edits are saved by the API and survive a reload', async () => {
    await page.goto(`${STORE}/account/profile`);
    await page.getByLabel('Full name').fill('Amara N. Okafor');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await page.getByText('Profile updated').waitFor({ timeout: 10000 });
    await page.reload();
    assert((await page.getByLabel('Full name').inputValue()) === 'Amara N. Okafor', 'name not persisted');
  });

  await step('sign out clears the session: cookie gone, /account redirects to login', async () => {
    await page.getByRole('button', { name: /sign out/i }).first().click();
    await page.waitForURL(`${STORE}/`, { timeout: 10000 });
    assert((await cookies(context)).filter((c) => c.value).length === 0, 'refresh cookie still present');
    await page.goto(`${STORE}/account`);
    await page.waitForURL(/\/login/, { timeout: 10000 });
  });

  await step('login rejects a wrong password with the API message, accepts the right one', async () => {
    await page.goto(`${STORE}/login`);
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill('Wrong-password1');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.getByText('Incorrect email or password').waitFor({ timeout: 10000 });
    await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.waitForURL(/\/account$/, { timeout: 15000 });
  });

  await step('registering the same email again shows an error on the email field', async () => {
    const other = await newPage('store-dup');
    await other.page.goto(`${STORE}/register`);
    await other.page.getByLabel('Full name').fill('Someone Else');
    await other.page.getByLabel('Email').fill(email);
    await other.page.getByLabel('Phone number').fill('08099998888');
    await other.page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await other.page.getByRole('button', { name: 'Create account' }).click();
    await other.page.getByText('already exists').first().waitFor({ timeout: 10000 });
    assert(other.page.url().includes('/register'), 'left the register page');
    await other.context.close();
    currentPage = page;
  });

  await step('forgot password: generic confirmation, emailed link resets it, old password stops working', async () => {
    const fp = await newPage('store-forgot');
    const from = logSize();
    await fp.page.goto(`${STORE}/forgot-password`);
    await fp.page.getByLabel('Email').fill(email);
    await fp.page.getByRole('button', { name: 'Send reset link' }).click();
    await fp.page.getByText('Check your inbox').waitFor({ timeout: 10000 });
    assert((await fp.page.getByText(/open demo reset link/i).count()) === 0, 'demo reset link still shown');
    const token = await fromEmail(email, 'reset-password\\?token=([\\w-]+)', { after: from });
    await fp.page.goto(`${STORE}/reset-password?token=${token}`);
    await fp.page.getByLabel('New password').fill('Brand-new-pass9');
    await fp.page.getByLabel('Confirm password').fill('Brand-new-pass9');
    await fp.page.getByRole('button', { name: 'Update password' }).click();
    await fp.page.waitForURL(/\/login/, { timeout: 15000 });
    // the same link must not work twice
    await fp.page.goto(`${STORE}/reset-password?token=${token}`);
    await fp.page.getByLabel('New password').fill('Another-pass-77');
    await fp.page.getByLabel('Confirm password').fill('Another-pass-77');
    await fp.page.getByRole('button', { name: 'Update password' }).click();
    await fp.page.getByText(/invalid or has expired/i).first().waitFor({ timeout: 10000 });
    // old password is dead, the new one works
    await fp.page.goto(`${STORE}/login`);
    await fp.page.getByLabel('Email').fill(email);
    await fp.page.getByLabel('Password', { exact: true }).fill(PASSWORD);
    await fp.page.getByRole('button', { name: 'Log in' }).click();
    await fp.page.getByText('Incorrect email or password').waitFor({ timeout: 10000 });
    await fp.page.getByLabel('Password', { exact: true }).fill('Brand-new-pass9');
    await fp.page.getByRole('button', { name: 'Log in' }).click();
    await fp.page.waitForURL(/\/account$/, { timeout: 15000 });
    await fp.context.close();
    currentPage = page;
  });

  await step('a password reset signs out a session that was already open elsewhere', async () => {
    // Sign in on device B, reset the password from device C, then device B must lose its session.
    const b = await newPage('store-device-b');
    await b.page.goto(`${STORE}/login`);
    await b.page.getByLabel('Email').fill(email);
    await b.page.getByLabel('Password', { exact: true }).fill('Brand-new-pass9');
    await b.page.getByRole('button', { name: 'Log in' }).click();
    await b.page.waitForURL(/\/account$/, { timeout: 15000 });

    const c = await newPage('store-device-c');
    const from = logSize();
    await c.page.goto(`${STORE}/forgot-password`);
    await c.page.getByLabel('Email').fill(email);
    await c.page.getByRole('button', { name: 'Send reset link' }).click();
    await c.page.getByText('Check your inbox').waitFor({ timeout: 10000 });
    const token = await fromEmail(email, 'reset-password\\?token=([\\w-]+)', { after: from });
    await c.page.goto(`${STORE}/reset-password?token=${token}`);
    await c.page.getByLabel('New password').fill('Newest-pass-123');
    await c.page.getByLabel('Confirm password').fill('Newest-pass-123');
    await c.page.getByRole('button', { name: 'Update password' }).click();
    await c.page.waitForURL(/\/login/, { timeout: 15000 });
    await c.context.close();

    currentPage = b.page;
    await b.page.goto(`${STORE}/account`); // a full reload: the memory token is gone and the refresh cookie was revoked by the reset
    await b.page.waitForURL(/\/login\?next=%2Faccount/, { timeout: 15000 });
    await b.context.close();
    currentPage = page;
  });
  await context.close();
}

/* ================================== ADMIN ================================== */
console.log('\nADMIN (staff)');
{
  const { context, page } = await newPage('admin');
  const inviteeEmail = uniq('invitee');
  const inviteeName = `Ngozi ${Date.now().toString(36)}`;
  let inviteFrom = 0;

  await step('anonymous visitors are sent to /login?next= when opening a protected page', async () => {
    await page.goto(`${ADMIN}/staff`);
    await page.waitForURL(/\/login\?next=%2Fstaff/, { timeout: 15000 });
  });

  await step('wrong password shows the API message', async () => {
    await page.getByLabel('Email').fill(SA_EMAIL);
    await page.getByLabel('Password').fill('Wrong-password1');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.getByText('Incorrect email or password').waitFor({ timeout: 10000 });
  });

  await step('Super Admin signs in, returns to the page they wanted, and the topbar shows who they are', async () => {
    await page.getByLabel('Password').fill(SA_PASSWORD);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL(/\/staff$/, { timeout: 20000 });
    await page.getByRole('heading', { name: 'Staff & Permissions' }).waitFor({ timeout: 10000 });
    await page.getByRole('button', { name: /sign out/i }).waitFor();
    assert((await page.getByText('Super Admin', { exact: true }).count()) > 0, 'role not shown');
    assert((await page.getByText('Preview as').count()) === 0, 'dev role switcher is visible');
    assert((await page.getByText('Simulate API error').count()) === 0, 'dev tools are visible');
    await shot(page, 'admin-staff');
  });

  await step('admin refresh cookie is httpOnly and scoped to the admin auth path', async () => {
    const rt = (await cookies(context)).find((c) => c.name === 'tonyson_admin_rt');
    assert(rt && rt.httpOnly && rt.path === '/api/v1/admin/auth', `bad admin cookie: ${JSON.stringify(rt)}`);
    assert(!(await cookies(context)).some((c) => c.name === 'tonyson_rt'), 'store cookie present in admin session');
  });

  await step('inviting staff creates the account through the real API and emails a set-password link', async () => {
    inviteFrom = logSize();
    await page.getByRole('button', { name: /invite staff/i }).click();
    await page.getByLabel('Full name').fill(inviteeName);
    await page.getByLabel('Email').fill(inviteeEmail);
    await page.getByLabel('Phone').fill('08033334444');
    await page.getByLabel('Role', { exact: true }).selectOption({ label: 'Inventory Manager' });
    await page.getByRole('button', { name: 'Send invite' }).click();
    await page.getByText(`Invitation sent to ${inviteeEmail}`).waitFor({ timeout: 10000 });
    await page.getByText(inviteeName).first().waitFor({ timeout: 10000 });
  });

  await step('the invitee opens the link, chooses a password, and signs in with limited access', async () => {
    const token = await fromEmail(inviteeEmail, 'set-password\\?token=([\\w-]+)', { after: inviteFrom });
    const inv = await newPage('invitee');
    await inv.page.goto(`${ADMIN}/set-password?token=${token}`);
    await inv.page.getByLabel('New password').fill('Chosen-password-42');
    await inv.page.getByLabel('Confirm password').fill('Chosen-password-42');
    await inv.page.getByRole('button', { name: 'Set password' }).click();
    await inv.page.waitForURL(/\/login/, { timeout: 15000 });
    await inv.page.getByLabel('Email').fill(inviteeEmail);
    await inv.page.getByLabel('Password').fill('Chosen-password-42');
    await inv.page.getByRole('button', { name: 'Sign in' }).click();
    await inv.page.getByRole('button', { name: /sign out/i }).waitFor({ timeout: 20000 });
    // menu only shows what the role may use
    assert((await inv.page.getByRole('link', { name: 'Inventory' }).count()) > 0, 'Inventory link missing');
    assert((await inv.page.getByRole('link', { name: /Staff & Permissions/ }).count()) === 0, 'Staff link shown to an Inventory Manager');
    assert((await inv.page.getByRole('link', { name: 'Audit log' }).count()) === 0, 'Audit link shown to an Inventory Manager');
    // and typing the URL does not help: the page refuses, and so does the API
    await inv.page.goto(`${ADMIN}/staff`);
    await inv.page.getByText("You don't have access to this section").waitFor({ timeout: 10000 });
    await shot(inv.page, 'admin-no-access');
    const status = await inv.page.evaluate(async (api) => {
      const r = await fetch(`${api}/api/v1/admin/auth/refresh`, { method: 'POST', credentials: 'include' });
      const { accessToken } = await r.json();
      const s = await fetch(`${api}/api/v1/admin/staff`, { headers: { Authorization: `Bearer ${accessToken}` } });
      return s.status;
    }, API);
    assert(status === 403, `API answered ${status} instead of 403 for the Inventory Manager`);
    assert((await inv.context.cookies()).some((c) => c.name === 'tonyson_admin_rt'), 'cookie rotated away unexpectedly');
    await inv.context.close();
    currentPage = page;
  });

  await step('the invite link works once', async () => {
    const token = await fromEmail(inviteeEmail, 'set-password\\?token=([\\w-]+)', { after: inviteFrom });
    const again = await newPage('invitee-again');
    await again.page.goto(`${ADMIN}/set-password?token=${token}`);
    await again.page.getByLabel('New password').fill('Another-password-7');
    await again.page.getByLabel('Confirm password').fill('Another-password-7');
    await again.page.getByRole('button', { name: 'Set password' }).click();
    await again.page.getByText(/invalid or has expired/i).first().waitFor({ timeout: 10000 });
    await again.context.close();
    currentPage = page;
  });

  await step('changing a role in the UI is applied by the API and refused for the last Super Admin', async () => {
    const select = page.getByLabel(`Role for ${inviteeName}`);
    await select.selectOption({ label: 'Store Manager' });
    await page.getByText(`${inviteeName} is now Store Manager`).waitFor({ timeout: 10000 });
    // the only Super Admin cannot demote themselves: the API's message is shown
    const saRow = page.locator('tr', { hasText: SA_EMAIL });
    await saRow.getByLabel(/^Role for /).selectOption({ label: 'Store Manager' });
    await page.getByText(/at least one active Super Admin/i).waitFor({ timeout: 10000 });
    await sleep(500);
    assert((await saRow.getByLabel(/^Role for /).inputValue()) === 'SUPER_ADMIN', 'Super Admin role was changed');
  });

  await step('the audit log shows these actions from the real API, and filters work', async () => {
    await page.goto(`${ADMIN}/audit-log`);
    // scope to the table: the action filter dropdown lists the same words in (hidden) <option>s
    const table = page.locator('tbody');
    await table.getByText('staff.invited').first().waitFor({ timeout: 15000 });
    await table.getByText('staff.role_changed').first().waitFor();
    assert((await table.getByText(inviteeName).count()) > 0, 'invitee missing from the audit log');
    await shot(page, 'admin-audit');
    const total = await page.locator('tbody tr').count();
    assert(total >= 3, `expected several audit rows, saw ${total}`);

    // action filter: only that action remains
    await page.locator('#audit-action').selectOption('staff.role_changed');
    await page.waitForFunction(
      () => document.querySelectorAll('tbody tr').length > 0 && [...document.querySelectorAll('tbody tr')].every((r) => r.textContent.includes('staff.role_changed')),
      null,
      { timeout: 10000 },
    );

    // the actor filter is a literal "contains": regex characters must not match everything
    await page.locator('#audit-action').selectOption('');
    await page.locator('#audit-actor').fill('.*');
    await page.getByText('No matching entries').waitFor({ timeout: 10000 });
    await page.locator('#audit-actor').fill('tony');
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 0, null, { timeout: 10000 });

    // date filter: Lagos "today" includes today's entries, tomorrow has none
    const lagosToday = new Date(Date.now() + 3600e3).toISOString().slice(0, 10);
    const lagosTomorrow = new Date(Date.now() + 3600e3 + 86400e3).toISOString().slice(0, 10);
    await page.locator('#audit-actor').fill('');
    await page.locator('#audit-from').fill(lagosToday);
    await page.waitForFunction(() => document.querySelectorAll('tbody tr').length > 0, null, { timeout: 10000 });
    await page.locator('#audit-from').fill(lagosTomorrow);
    await page.getByText('No matching entries').waitFor({ timeout: 10000 });
  });

  await step('deactivating staff signs them out of their open session', async () => {
    const victim = await newPage('victim');
    await victim.page.goto(`${ADMIN}/login`);
    await victim.page.getByLabel('Email').fill(inviteeEmail);
    await victim.page.getByLabel('Password').fill('Chosen-password-42');
    await victim.page.getByRole('button', { name: 'Sign in' }).click();
    await victim.page.getByRole('button', { name: /sign out/i }).waitFor({ timeout: 20000 });

    currentPage = page;
    await page.goto(`${ADMIN}/staff`);
    await page.getByRole('button', { name: `Deactivate ${inviteeName}` }).click();
    await page.getByRole('button', { name: 'Deactivate', exact: true }).click();
    await page.getByText(`${inviteeName} deactivated`).waitFor({ timeout: 10000 });

    // next navigation in their tab: the session is gone and they are sent to sign in
    await victim.page.goto(`${ADMIN}/orders`);
    await victim.page.waitForURL(/\/login/, { timeout: 15000 });
    await victim.page.getByLabel('Email').fill(inviteeEmail);
    await victim.page.getByLabel('Password').fill('Chosen-password-42');
    await victim.page.getByRole('button', { name: 'Sign in' }).click();
    await victim.page.getByText('Incorrect email or password').waitFor({ timeout: 10000 });
    await victim.context.close();
    currentPage = page;
  });

  await step('sign out ends the session and protected pages redirect again', async () => {
    await page.getByRole('button', { name: /sign out/i }).click();
    await page.waitForURL(/\/login/, { timeout: 10000 });
    assert((await cookies(context)).filter((c) => c.value).length === 0, 'admin cookie still present');
    await page.goto(`${ADMIN}/audit-log`);
    await page.waitForURL(/\/login\?next=%2Faudit-log/, { timeout: 10000 });
  });
  await context.close();
}

/* =================================== report =================================== */
await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (consoleErrors.length) {
  console.log(`\nBrowser console/page errors (${consoleErrors.length}):`);
  [...new Set(consoleErrors)].slice(0, 15).forEach((e) => console.log('  - ' + e));
}
process.exit(failed.length ? 1 : 0);
