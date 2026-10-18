/* End-to-end play-through with a mocked speechSynthesis.
 *
 *   npx http-server -p 8080 -c-1 -s &   (from the repo root)
 *   node tests/play.cjs [out-dir]
 *
 * Plays a full session on the right path, then a session on the wrong-answer
 * path, checks what was said, takes screenshots, and finally reloads offline. */
const path = require("path");
let pw;
try {
  pw = require("playwright");
} catch (_) {
  pw = require("/opt/node22/lib/node_modules/playwright");
}
const { chromium, devices } = pw;

const BASE = process.env.BASE || "http://localhost:8080/";
const OUT = process.argv[2] || path.join(__dirname, "out");
require("fs").mkdirSync(OUT, { recursive: true });

// Fake voices: every utterance "ends" ~15 ms later and is logged.
const MOCK = () => {
  window.__said = [];
  const voices = [
    { name: "Carmit", lang: "he-IL", localService: true, default: true },
    { name: "Samantha", lang: "en-US", localService: true, default: false },
  ];
  let pending = [];
  window.SpeechSynthesisUtterance = function (text) {
    this.text = text;
  };
  const synth = {
    speak(u) {
      if (u.text.trim()) window.__said.push({ text: u.text, lang: u.lang });
      const t = setTimeout(() => {
        pending = pending.filter((x) => x !== t);
        u.onend && u.onend();
      }, 15);
      pending.push(t);
    },
    cancel() {
      pending.forEach(clearTimeout);
      pending = [];
    },
    getVoices: () => voices,
    addEventListener() {},
  };
  Object.defineProperty(window, "speechSynthesis", { value: synth, configurable: true });
};

const errors = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function check(cond, msg) {
  if (!cond) throw new Error("FAILED: " + msg);
  console.log("  ok -", msg);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ ...devices["iPhone 12 Pro"], deviceScaleFactor: 2 });
  await ctx.addInitScript(MOCK);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => m.type() === "error" && errors.push("console: " + m.text()));

  const said = () => page.evaluate(() => window.__said.map((s) => s.text));
  const clearSaid = () => page.evaluate(() => (window.__said = []));
  const shot = (name) => page.screenshot({ path: path.join(OUT, name + ".png") });
  const D = () => page.evaluate(() => window.App.data);
  const kind = () => page.evaluate(() => (document.querySelector(".stage") || {}).className || "");
  const target = () => page.evaluate(() => Number(document.querySelector(".stage").dataset.n));
  const waitKind = async (k) => page.waitForSelector(`.stage.ex-${k}`, { timeout: 8000 });

  await page.goto(BASE);
  await page.click("#splash");
  await page.waitForSelector(".welcome");
  await shot("01-welcome");
  await page.click("#go");
  await page.fill("#name", "יואב");
  await page.click('#lang button[data-v="both"]');
  await page.click('#max button[data-v="5"]');
  await shot("02-settings");
  await page.click("#save");
  await page.waitForSelector("#play");
  await sleep(600);
  await shot("03-home");
  const greet = await said();
  check(greet.includes("יואב"), "home greets the child by name");

  // ---------- Session 1: right answers ----------
  console.log("session 1 (right path)");
  await page.click("#play");
  for (let r = 0; r < 6; r++) {
    const k = (await kind()).match(/ex-(\w+)/)[1];
    const n = await target();
    await clearSaid();
    if (k === "tap" || k === "howMany") {
      const items = await page.$$(".item");
      check(items.length === n, `${k}: ${n} items on screen`);
      // Items must not overlap and must be ≥ 70px.
      const boxes = await Promise.all(items.map((i) => i.boundingBox()));
      check(boxes.every((b) => b.width >= 64), `${k}: targets are big (${Math.round(boxes[0].width)}px)`);
      let overlap = false;
      for (let i = 0; i < boxes.length; i++)
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i], b = boxes[j];
          if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) overlap = true;
        }
      check(!overlap, `${k}: items do not overlap`);
      for (let i = 0; i < n; i++) {
        await items[i].click();
        await sleep(80);
        if (i === 0 && n > 1) {
          // Tapping a counted item again does not count it.
          await items[0].click();
          await sleep(80);
        }
        if (r === 0 && i === Math.min(2, n - 1)) await shot("04-tap-counting");
      }
      if (k === "tap") {
        await page.waitForFunction(() => window.__said.some((s) => s.text.startsWith("יֵשׁ ")), null, { timeout: 8000 });
        const s = await said();
        const data = await D();
        check(s.includes(data.NUM_HE[n]) && s.includes(data.NUM_EN[n]), `tap: said ${n} in Hebrew and English`);
        check(s.some((t) => t.startsWith("יֵשׁ ")), "tap: said the total with the noun");
        check(s.some((t) => t.startsWith("כְּבָר סָפַרְנוּ")) || n === 1, "tap: re-tap says 'already counted'");
        check((await page.$$(".item.counted")).length === n, "tap: every item marked counted");
        check(!(await page.$(".badge")), "tap: no number badges on the items");
        if (r === 0) await shot("05-tap-done");
      } else {
        await page.waitForSelector(".num-card");
        await sleep(200);
        if (r === 1) await shot("06-howmany-cards");
        const cards = await page.$$eval(".num-card", (cs) => cs.map((c) => Number(c.dataset.n)));
        check(cards.length === 3 && cards.includes(n) && cards.every((c) => c <= 5), `howMany: cards ${cards} include ${n}, none above 5`);
        await page.click(`.num-card[data-n="${n}"]`);
        await sleep(300);
        if (r === 1) await shot("07-howmany-right");
      }
    } else if (k === "give") {
      const items = await page.$$(".item");
      check(items.length > n, `give: ${items.length} items for "give me ${n}"`);
      // The speaker button replays the instruction.
      await page.click("#speaker");
      await sleep(300);
      const s0 = await said();
      check(s0.some((t) => t.startsWith("תֵּן לִי")), "give: speaker replays 'תֵּן לִי …'");
      for (let i = 0; i < n; i++) {
        await items[i].click();
        await sleep(80);
      }
      check((await page.$$(".chip")).length === n, `give: ${n} in the basket`);
      if (r === 2) await shot("08-give-basket");
      await page.click("#check");
      await sleep(300);
      if (r === 2) await shot("09-give-right");
    }
    if (r < 5) {
      await page.waitForFunction((rr) => document.querySelectorAll(".dots i.on").length === rr + 1, r + 1, { timeout: 15000 });
    }
  }
  await page.waitForSelector(".screen.end", { timeout: 15000 });
  await sleep(900);
  await shot("10-celebrate");
  check((await said()).some((t) => t.includes("כׇּל הַכָּבוֹד")), "celebration praises");
  check((await page.evaluate(() => window.App.store.progress().stickers.length)) === 1, "got a sticker");

  // ---------- Session 2: wrong answers ----------
  console.log("session 2 (wrong-answer path)");
  await page.click("#home");
  await page.waitForSelector("#play");
  await page.click("#play");
  for (let r = 0; r < 6; r++) {
    const k = (await kind()).match(/ex-(\w+)/)[1];
    const n = await target();
    await clearSaid();
    if (k === "tap") {
      // Any order works: tap from the last item to the first.
      for (const it of (await page.$$(".item")).reverse()) {
        await it.click();
        await sleep(30); // fast taps: numbers cut each other off, no backlog
      }
    } else if (k === "howMany") {
      for (const it of await page.$$(".item")) {
        await it.click();
        await sleep(60);
      }
      await page.waitForSelector(".num-card");
      const wrong = await page.$$eval(".num-card", (cs, nn) => cs.map((c) => Number(c.dataset.n)).filter((c) => c !== nn), n);
      await page.click(`.num-card[data-n="${wrong[0]}"]`);
      await page.waitForFunction(() => window.__said.some((s) => s.text.startsWith("כַּמָּה")) && window.__said.filter((s) => s.text.startsWith("כַּמָּה")).length >= 2, null, { timeout: 15000 });
      check((await said()).some((t) => t.includes("נִסְפֹּר שׁוּב")), "howMany: first wrong → count again, ask again");
      if (r === 1) await shot("11-howmany-hint");
      await page.click(`.num-card[data-n="${wrong[1]}"]`);
      await sleep(200);
      if (r === 1) await shot("12-howmany-reveal");
      await page.waitForFunction(() => window.__said.some((s) => s.text.startsWith("יֵשׁ ")), null, { timeout: 15000 });
      check(true, "howMany: second wrong → answer shown, counted together");
    } else {
      const items = await page.$$(".item");
      for (let i = 0; i < Math.min(n + 1, items.length); i++) {
        await items[i].click();
        await sleep(60);
      }
      await clearSaid();
      await page.click("#check");
      await page.waitForFunction(() => window.__said.some((s) => s.text.startsWith("תֵּן לִי")), null, { timeout: 15000 });
      const s = await said();
      check(s.includes("זֶה יוֹתֵר מִדַּי."), "give: too many → counted together, 'too many', asked again");
      if (r === 2) await shot("13-give-hint");
      // Take two out (too few now, unless n == 1 → empty basket re-asks).
      for (let i = 0; i < 2; i++) {
        const chips = await page.$$(".chip");
        if (chips.length) await chips[chips.length - 1].click();
        await sleep(60);
      }
      // Make sure the basket is still wrong (never empty, never exactly n).
      if ((await page.$$(".chip")).length === 0) await page.click(".item:not(.gone)");
      if ((await page.$$(".chip")).length === n) await page.click(".item:not(.gone)");
      await clearSaid();
      await page.click("#check");
      await page.waitForFunction(() => window.__said.some((s) => s.text.startsWith("יֵשׁ ")), null, { timeout: 15000 });
      check((await page.$$(".chip")).length === n, `give: second wrong → basket fixed to ${n}`);
      if (r === 2) await shot("14-give-fixed");
    }
    if (r < 5) await page.waitForFunction((rr) => document.querySelectorAll(".dots i.on").length === rr + 1, r + 1, { timeout: 20000 });
  }
  await page.waitForSelector(".screen.end", { timeout: 20000 });
  check((await page.evaluate(() => window.App.store.progress().step)) === 0, "difficulty stays at the start after mistakes");

  // ---------- Parent area ----------
  console.log("parent area");
  await page.click("#home");
  await page.waitForSelector("#lock");
  const lock = await page.$("#lock");
  const box = await lock.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await sleep(1400);
  await page.mouse.up();
  await page.waitForSelector(".gate");
  const q = await page.$eval(".q", (e) => e.textContent);
  const [a, b] = q.match(/\d+/g).map(Number);
  for (const d of String(a * b)) await page.click(`.key[data-k="${d}"]`);
  await page.click('.key[data-k="✓"]');
  await page.waitForSelector(".dash");
  await shot("15-parent");
  await page.click("#voices");
  await page.waitForSelector(".voice-row");
  const rows = await page.$$(".voice-row");
  check(rows.length > 200, `voice check lists ${rows.length} phrases`);
  await shot("16-voice-check");
  await clearSaid();
  await rows[0].click();
  await sleep(100);
  check((await said())[0] === (await D()).NUM_HE[1], "voice check plays a phrase");

  // ---------- Offline ----------
  console.log("offline");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await sleep(500);
  await ctx.setOffline(true);
  await page.reload();
  await page.click("#splash");
  await page.waitForSelector("#play", { timeout: 8000 });
  check(true, "reloads with the network off");
  await ctx.setOffline(false);

  check(errors.length === 0, "no page or console errors" + (errors.length ? ": " + errors.join(" | ") : ""));
  await browser.close();
  console.log("ALL PASSED");
})().catch((e) => {
  console.error(e);
  if (errors.length) console.error(errors);
  process.exit(1);
});
