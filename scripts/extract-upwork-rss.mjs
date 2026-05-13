/**
 * Run this once to extract Upwork session cookies.
 * A real browser will open — log in normally (including email code).
 * Script saves everything to .env.local automatically.
 *
 * Usage:
 *   node scripts/extract-upwork-rss.mjs
 */

import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, '..', '.env.local');

const RSS_URL = 'https://www.upwork.com/ab/feed/jobs/rss?q=n8n+automation&sort=recency&paging=0%3B25';
const SEARCH_QUERIES = [
  'n8n+automation',
  'AI+automation+chatbot',
  'Python+RAG+LangChain',
  'Next.js+SaaS+API',
];

async function main() {
  console.log('\n🚀 Opening Upwork in a browser...');
  console.log('   Log in normally — including any email verification code.\n');

  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized', '--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    viewport: null,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });

  const page = await context.newPage();
  await page.goto('https://www.upwork.com/ab/account-security/login', { waitUntil: 'domcontentloaded' });

  console.log('⏳ Waiting for you to log in (5 minute timeout)...');

  // Wait until the URL changes away from the login/security pages
  await page.waitForFunction(
    () =>
      !window.location.pathname.includes('account-security') &&
      !window.location.pathname.includes('login') &&
      window.location.hostname === 'www.upwork.com',
    { timeout: 300_000, polling: 1000 }
  );

  console.log('✅ Login detected. Checking RSS feed access...\n');

  // Test the RSS feed using the browser's authenticated session
  const results = [];
  for (const q of SEARCH_QUERIES) {
    const url = `https://www.upwork.com/ab/feed/jobs/rss?q=${q}&sort=recency&paging=0%3B25`;
    const result = await page.evaluate(async (feedUrl) => {
      try {
        const res = await fetch(feedUrl, { credentials: 'include' });
        const text = await res.text();
        return { status: res.status, isRss: text.includes('<rss') || text.includes('<?xml') };
      } catch (e) {
        return { status: 0, isRss: false };
      }
    }, url);

    if (result.isRss) {
      results.push({ q, url });
      console.log(`  ✅ RSS works for: ${q}`);
    } else {
      console.log(`  ❌ RSS failed (${result.status}) for: ${q}`);
    }
  }

  if (results.length === 0) {
    console.log('\n❌ RSS feeds still blocked after login. Upwork may require a saved search URL.');
    console.log('   Screenshot saved as upwork-debug.png for inspection.');
    await page.screenshot({ path: join(__dirname, '..', 'upwork-debug.png') });
    await browser.close();
    return;
  }

  // Export all cookies from the session
  const cookies = await context.cookies('https://www.upwork.com');
  const cookieString = cookies.map((c) => `${c.name}=${c.value}`).join('; ');

  console.log(`\n✅ Got ${cookies.length} session cookies.`);
  console.log(`✅ ${results.length} RSS feed(s) working.\n`);

  // Patch .env.local
  let env = existsSync(ENV_PATH) ? readFileSync(ENV_PATH, 'utf8') : '';

  const rssUrls = results.map((r) => r.url).join(',');

  if (env.includes('UPWORK_RSS_URL=')) {
    env = env.replace(/UPWORK_RSS_URL=.*/, `UPWORK_RSS_URL="${results[0].url}"`);
  } else {
    env += `\nUPWORK_RSS_URL="${results[0].url}"`;
  }

  if (env.includes('UPWORK_COOKIES=')) {
    env = env.replace(/UPWORK_COOKIES="[^"]*"/, `UPWORK_COOKIES="${cookieString}"`);
  } else {
    env += `\nUPWORK_COOKIES="${cookieString}"`;
  }

  if (env.includes('UPWORK_RSS_URLS=')) {
    env = env.replace(/UPWORK_RSS_URLS="[^"]*"/, `UPWORK_RSS_URLS="${rssUrls}"`);
  } else {
    env += `\nUPWORK_RSS_URLS="${rssUrls}"`;
  }

  writeFileSync(ENV_PATH, env);

  console.log('✅ Saved to .env.local:');
  console.log(`   UPWORK_RSS_URL  = ${results[0].url}`);
  console.log(`   UPWORK_COOKIES  = [${cookies.length} cookies]`);
  console.log('\n🎉 Done! Close the browser and run the pipeline:');
  console.log('   curl -X POST http://localhost:3002/api/jobs/run\n');

  // Keep browser open briefly so user can see it worked
  await page.waitForTimeout(3000);
  await browser.close();
}

main().catch((err) => {
  console.error('Script failed:', err.message);
  process.exit(1);
});
