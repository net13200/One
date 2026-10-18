/* One — screens, the three exercises and the parent area. */
(() => {
  "use strict";

  const App = window.App;
  const D = App.data;
  const S = App.store;
  const A = App.audio;

  const $app = document.getElementById("app");
  const ROUNDS = ["tap", "howMany", "give", "tap", "howMany", "give"];

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const randInt = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
  const shuffle = (a) => {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // ---------- Speech segments ----------
  const settings = () => S.settings() || S.newSettings();
  const gender = () => (settings().gender === "f" ? "f" : "m");
  const he = (key, text) => ({ key, text, lang: "he" });
  const en = (key, text) => ({ key, text, lang: "en" });
  const PAUSE = { pause: 250 }; // between the Hebrew and English halves

  const seg = {
    p(name, g = gender()) {
      const v = D.PHRASES[name];
      return typeof v === "string" ? he("p." + name, v) : he(`p.${name}.${g}`, v[g]);
    },
    praise() {
      const i = Math.floor(Math.random() * D.PHRASES.praise.length);
      return he("p.praise." + i, D.PHRASES.praise[i]);
    },
    name: () => ({ key: null, text: settings().name, lang: "he" }),
    numHe: (n) => he("num.he." + n, D.NUM_HE[n]),
    numEn: (n) => en("num.en." + n, D.NUM_EN[n]),
    // A counted number, in the counting language(s).
    num(n, lang = settings().lang) {
      if (lang === "he") return [seg.numHe(n)];
      if (lang === "en") return [seg.numEn(n)];
      return [seg.numHe(n), PAUSE, seg.numEn(n)];
    },
    intro: (it, g = gender()) => he(`intro.${g}.${it.id}`, D.TEMPLATES.intro[g](it)),
    howMany: (it) => he("howMany." + it.id, D.TEMPLATES.howMany(it)),
    already: (it) => he("already." + it.g, D.ALREADY[it.g]),
    totalHe: (it, n) => he(`total.he.${it.id}.${n}`, D.TEMPLATES.totalHe(it, n)),
    totalEn: (it, n) => en(`total.en.${it.id}.${n}`, D.TEMPLATES.totalEn(it, n)),
    total(it, n, lang = settings().lang) {
      if (lang === "he") return [seg.totalHe(it, n)];
      if (lang === "en") return [seg.totalEn(it, n)];
      return [seg.totalHe(it, n), PAUSE, seg.totalEn(it, n)];
    },
    giveHe: (it, n, g = gender()) => he(`give.${g}.${it.id}.${n}`, D.TEMPLATES.give[g](it, n)),
    give(it, n, lang = settings().lang, g = gender()) {
      const amountEn = en(`qty.en.${it.id}.${n}`, D.qtyEn(it, n));
      if (lang === "he") return [seg.giveHe(it, n, g)];
      if (lang === "en") return [he(`giveNoun.${g}.${it.id}.${n === 1 ? 1 : "n"}`, D.TEMPLATES.giveNoun[g](it, n)), amountEn];
      return [seg.giveHe(it, n, g), PAUSE, amountEn];
    },
  };

  // ---------- Guide character (the owl from Aleph) ----------
  const GUIDE = `
  <svg class="guide" viewBox="0 0 120 124" aria-hidden="true">
    <path d="M60 22 C 66 10, 78 7, 84 9 C 80 18, 70 24, 60 22 Z" fill="#2fae64"/>
    <path d="M60 24 L60 30" stroke="#7c4e30" stroke-width="3" stroke-linecap="round"/>
    <path d="M26 44 L28 20 L46 36 Z" fill="#8a5a44"/>
    <path d="M94 44 L92 20 L74 36 Z" fill="#8a5a44"/>
    <ellipse cx="60" cy="72" rx="40" ry="44" fill="#a06a4c"/>
    <path class="wing" d="M21 70 C 12 84, 16 98, 26 104 C 28 92, 28 80, 21 70 Z" fill="#8a5a44"/>
    <path class="wing" d="M99 70 C 108 84, 104 98, 94 104 C 92 92, 92 80, 99 70 Z" fill="#8a5a44"/>
    <ellipse cx="60" cy="86" rx="25" ry="27" fill="#f6e2c0"/>
    <path d="M50 84 q4 4 8 0 M62 84 q4 4 8 0 M56 94 q4 4 8 0" stroke="#e2c497" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="44" cy="56" r="15" fill="#fff"/>
    <circle cx="76" cy="56" r="15" fill="#fff"/>
    <circle class="pupil" cx="46" cy="57" r="6.5" fill="#3a2e5c"/>
    <circle class="pupil" cx="74" cy="57" r="6.5" fill="#3a2e5c"/>
    <circle cx="48" cy="54.5" r="2" fill="#fff"/>
    <circle cx="76" cy="54.5" r="2" fill="#fff"/>
    <path class="beak" d="M54 68 L66 68 L60 77 Z" fill="#ff9f43"/>
    <path d="M44 114 l-4 6 M48 115 l0 6 M52 114 l4 6 M68 114 l-4 6 M72 115 l0 6 M76 114 l4 6" stroke="#ff9f43" stroke-width="3" stroke-linecap="round"/>
  </svg>`;

  async function talk(segments) {
    const g = document.querySelector(".guide");
    g && g.classList.add("talking");
    const done = await A.say(segments);
    g && g.classList.remove("talking");
    return done;
  }

  // ---------- Icons ----------
  const ICON = {
    speaker: `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 4V5L7 9H3z" fill="currentColor"/><path d="M16 8.5a5 5 0 0 1 0 7M18.8 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
    close: `<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`,
    play: `<svg viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    home: `<svg viewBox="0 0 24 24"><path d="M3 11.5L12 4l9 7.5M5.5 9.8V20h13V9.8" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    lock: `<svg viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.2"/></svg>`,
    book: `<svg viewBox="0 0 24 24"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" fill="currentColor"/><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5z" fill="currentColor" opacity=".55"/><path d="M12 7.2l1.2 2.4 2.6.4-1.9 1.8.5 2.6-2.4-1.3-2.4 1.3.5-2.6-1.9-1.8 2.6-.4z" fill="#fff"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    basket: `<svg viewBox="0 0 64 40"><path d="M4 12h56l-6 26H10z" fill="#d9a066"/><path d="M4 12h56" stroke="#a8713f" stroke-width="5" stroke-linecap="round"/><path d="M18 18v14M32 18v14M46 18v14" stroke="#b9824f" stroke-width="3" stroke-linecap="round"/></svg>`,
  };

  // ---------- Router ----------
  let view = null; // the current screen; .dead once it is left
  function show(html, cls) {
    A.stop();
    if (view) {
      view.dead = true;
      if (view.cleanup) view.cleanup();
    }
    view = {};
    $app.className = "screen " + (cls || "");
    $app.innerHTML = html;
    $app.scrollTop = 0;
    return view;
  }
  const $ = (sel) => $app.querySelector(sel);
  const $$ = (sel) => [...$app.querySelectorAll(sel)];
  function on(sel, evt, fn) {
    const e = typeof sel === "string" ? $(sel) : sel;
    if (e) e.addEventListener(evt, fn);
  }

  function applySettings() {
    const s = settings();
    A.setRate(s.rate);
    A.setVoices({ he: s.voiceHe, en: s.voiceEn });
  }

  function start() {
    if (!S.settings()) return welcome();
    applySettings();
    home();
  }

  // ---------- First run (parent-facing) ----------
  function welcome() {
    show(
      `<div class="parent-page welcome">
        <div class="hero">${GUIDE}</div>
        <h1>ברוכים הבאים ל<span class="brand">One</span></h1>
        <p>משחק ספירה רגוע לגיל הגן: נוגעים בכל דבר וסופרים בקול — בעברית, באנגלית או בשתיהן.</p>
        <p class="muted">כל המידע נשמר על המכשיר הזה בלבד. אין חשבון, אין שרת, אין פרסומות.</p>
        <button class="btn primary" id="go">הגדרות ראשונות</button>
      </div>`,
      "parent"
    );
    on("#go", "click", () => settingsForm(true));
  }

  // ---------- Home ----------
  function home() {
    const s = S.settings();
    if (!s) return welcome();
    const v = show(
      `<button class="corner lock" id="lock" aria-label="אזור הורים (לחיצה ארוכה)">
        <svg class="ring" viewBox="0 0 44 44"><circle cx="22" cy="22" r="19"/></svg>${ICON.lock}
      </button>
      <div class="home-guide" id="guide">${GUIDE}<div class="bubble">שָׁלוֹם ${esc(s.name)}!</div></div>
      <button class="play-btn" id="play" aria-label="מתחילים">${ICON.play}</button>
      <button class="round-btn stickers-btn" id="stickers" aria-label="המדבקות שלי">${ICON.book}<span>${S.progress().stickers.length}</span></button>`,
      "home"
    );
    const greet = () => talk([seg.p("hello"), seg.name(), seg.p("letsCount")]);
    on("#guide", "click", () => {
      A.unlock();
      greet();
    });
    on("#play", "click", () => {
      A.unlock();
      A.sfx.tap();
      startSession();
    });
    on("#stickers", "click", () => {
      A.unlock();
      A.sfx.tap();
      stickerBook();
    });
    longPress($("#lock"), () => parentGate());
    // Browsers that allow it (e.g. after the splash tap) greet right away.
    v.timer = setTimeout(greet, 400);
    v.cleanup = () => clearTimeout(v.timer);
  }

  function longPress(btn, fn) {
    let t = null;
    const cancel = () => {
      clearTimeout(t);
      btn.classList.remove("holding");
    };
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      btn.classList.add("holding");
      t = setTimeout(() => {
        btn.classList.remove("holding");
        fn();
      }, 1200);
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, cancel));
    btn.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  // ---------- Sticker book ----------
  function stickerBook() {
    const got = S.progress().stickers;
    const cells = D.STICKERS.map((st) => `<div class="sticker ${got.includes(st) ? "got" : ""}">${got.includes(st) ? st : ""}</div>`).join("");
    show(
      `<div class="topbar"><button class="icon-btn" id="back" aria-label="הביתה">${ICON.home}</button></div>
       <div class="sticker-grid">${cells}</div>`,
      "stickers"
    );
    on("#back", "click", home);
  }

  // ---------- Session ----------
  let session = null;
  let lastItem = null;

  function startSession() {
    session = { round: 0 };
    nextRound();
  }

  function nextRound() {
    if (!session) return home();
    if (session.round >= ROUNDS.length) return celebrate();
    const kind = ROUNDS[session.round];
    session.round++;
    ({ tap: exTap, howMany: exHowMany, give: exGive })[kind]();
  }

  async function roundDone(v, result) {
    if (result) S.recordRound(result);
    await wait(700);
    if (!v.dead) nextRound();
  }

  function pickItem() {
    const pool = D.ITEMS.filter((it) => it !== lastItem);
    lastItem = pool[Math.floor(Math.random() * pool.length)];
    return lastItem;
  }

  // The frame every round shares: speaker (always in the same place), the
  // owl, progress dots and a way home.
  function roundScreen(kind, n, body) {
    const dots = ROUNDS.map((_, i) => `<i class="${i < session.round ? "on" : ""}"></i>`).join("");
    const v = show(
      `<div class="topbar">
        <button class="icon-btn speaker" id="speaker" aria-label="שוב">${ICON.speaker}</button>
        <div class="mini-guide">${GUIDE}</div>
        <div class="dots">${dots}</div>
        <button class="icon-btn" id="close" aria-label="הביתה">${ICON.close}</button>
      </div>
      <div class="stage ex-${kind}" data-n="${n}">${body}</div>`,
      "round"
    );
    v.busy = false;
    v.instruction = () => [];
    on("#speaker", "click", () => {
      A.unlock();
      if (!v.busy) talk(v.instruction());
    });
    on("#close", "click", () => {
      session = null;
      home();
    });
    return v;
  }

  // Scatter n items over the field: a jittered grid with spare cells, so
  // they look random but never overlap and every target stays big.
  function placeItems(field, it, n) {
    const W = field.clientWidth;
    const H = field.clientHeight;
    let size = n <= 3 ? 116 : n <= 5 ? 100 : n <= 8 ? 88 : n <= 12 ? 80 : 74;
    let cols, rows;
    for (;;) {
      const cell = size * 1.12;
      cols = Math.max(1, Math.floor(W / cell));
      rows = Math.max(1, Math.floor(H / cell));
      if (cols * rows >= Math.ceil(n * 1.25) || size <= 64) break;
      size -= 4;
    }
    const cw = W / cols;
    const ch = H / rows;
    const cells = shuffle([...Array(cols * rows).keys()]).slice(0, n);
    return cells.map((c, i) => {
      const col = c % cols;
      const row = Math.floor(c / cols);
      const x = col * cw + Math.random() * Math.max(0, cw - size);
      const y = row * ch + Math.random() * Math.max(0, ch - size);
      const b = document.createElement("button");
      b.className = "item";
      b.dataset.i = i;
      b.style.cssText = `left:${x}px;top:${y}px;width:${size}px;height:${size}px;font-size:${size * 0.62}px`;
      b.innerHTML = `<span class="emo">${it.emoji}</span>`;
      field.appendChild(b);
      return b;
    });
  }

  function bounce(el) {
    el.classList.remove("bounce");
    void el.offsetWidth;
    el.classList.add("bounce");
  }

  function mark(el) {
    el.classList.add("counted");
    bounce(el);
  }

  // The voice counts these elements one by one, lighting each up.
  async function countTogether(v, els) {
    els.forEach((el) => el.classList.remove("counted", "lit"));
    for (let i = 0; i < els.length; i++) {
      if (v.dead) return;
      els[i].classList.add("lit");
      mark(els[i]);
      A.sfx.pop();
      await talk(seg.num(i + 1));
      await wait(150);
    }
  }

  // Tapping items one by one: shared by "tap and count" and "how many".
  // Calls onLast once every item has been counted.
  function countingField(v, it, n, onLast) {
    const items = placeItems($("#field"), it, n);
    let count = 0;
    items.forEach((b) =>
      b.addEventListener("click", () => {
        A.unlock();
        if (v.busy) return;
        if (b.classList.contains("counted")) {
          A.sfx.tap();
          bounce(b);
          talk([seg.already(it)]);
          return;
        }
        count++;
        mark(b);
        A.sfx.pop();
        if (count < n) talk(seg.num(count));
        else {
          v.busy = true;
          onLast(count);
        }
      })
    );
    return items;
  }

  // 1. Tap and count: the total is repeated with the noun at the end.
  function exTap() {
    const it = pickItem();
    const n = S.pickN();
    const v = roundScreen("tap", n, `<div class="field" id="field"></div>`);
    v.instruction = () => [seg.intro(it)];
    const items = countingField(v, it, n, async (last) => {
      await talk(seg.num(last));
      if (v.dead) return;
      await wait(250);
      A.sfx.chime();
      items.forEach((b) => b.classList.add("done"));
      await talk([...seg.total(it, n), { pause: 200 }, seg.praise()]);
      if (!v.dead) roundDone(v, null);
    });
    talk(v.instruction());
  }

  function pips(k) {
    return `<span class="pips">${"<i></i>".repeat(k)}</span>`;
  }

  // 2. How many: count by tapping, then pick the total from three cards.
  function exHowMany() {
    const it = pickItem();
    const n = S.pickN();
    const v = roundScreen("howMany", n, `<div class="field" id="field"></div><div class="choices" id="choices" dir="ltr"></div>`);
    v.instruction = () => [seg.intro(it)];
    const max = settings().max;
    const near = [n - 1, n + 1, n - 2, n + 2].filter((k) => k >= 1 && k <= max);
    const options = [n, ...shuffle(near.slice(0, 2)).concat(shuffle(near.slice(2))).slice(0, 2)].sort((a, b) => a - b);
    let misses = 0;

    const items = countingField(v, it, n, async (last) => {
      await talk(seg.num(last));
      if (v.dead) return;
      await wait(300);
      $("#choices").innerHTML = options
        .map((k) => `<button class="card num-card pop" data-n="${k}"><span class="digit">${k}</span>${pips(k)}</button>`)
        .join("");
      $$(".num-card").forEach((c) => c.addEventListener("click", () => choose(c)));
      v.instruction = () => [seg.howMany(it)];
      v.busy = false;
      talk(v.instruction());
    });

    async function choose(card) {
      A.unlock();
      if (v.busy || card.disabled) return;
      const k = Number(card.dataset.n);
      v.busy = true;
      if (k === n) {
        card.classList.add("right");
        A.sfx.chime();
        await talk([seg.praise(), { pause: 150 }, ...seg.total(it, n)]);
        if (!v.dead) roundDone(v, misses ? "hint" : "ok");
        return;
      }
      misses++;
      card.classList.add("wrong");
      card.disabled = true;
      A.sfx.soft();
      await wait(300);
      if (misses === 1) {
        // Hint: count the items again together, then ask again.
        await talk([seg.p("countAgain")]);
        await countTogether(v, items);
        if (v.dead) return;
        v.busy = false;
        talk([seg.howMany(it)]);
      } else {
        // Show the answer, count it together and move on.
        $(`.num-card[data-n="${n}"]`).classList.add("reveal");
        await talk([seg.p("countTogether")]);
        await countTogether(v, items);
        if (v.dead) return;
        await talk(seg.total(it, n));
        if (!v.dead) roundDone(v, "shown");
      }
    }
    talk(v.instruction());
  }

  // 3. Give me N: tap items into the basket, then press the green ✓.
  function exGive() {
    const it = pickItem();
    const n = S.pickN(10);
    const shown = Math.min(n + randInt(1, 3), 13);
    const v = roundScreen(
      "give",
      n,
      `<div class="field" id="field"></div>
       <div class="basket-row">
         <div class="basket" id="basket"><div class="basket-art">${ICON.basket}</div><div class="chips" id="chips"></div></div>
         <button class="check-btn" id="check" aria-label="בדיקה">${ICON.check}</button>
       </div>`
    );
    v.instruction = () => [...seg.give(it, n), seg.p("pressCheck")];
    const items = placeItems($("#field"), it, shown);
    let inBasket = []; // item indices, in the order they went in
    let misses = 0;

    function renderChips() {
      $("#chips").innerHTML = inBasket
        .map((i) => `<button class="chip" data-i="${i}"><span class="emo">${it.emoji}</span></button>`)
        .join("");
      $("#chips").classList.toggle("many", inBasket.length > 6);
      $$(".chip").forEach((c) =>
        c.addEventListener("click", () => {
          if (v.busy) return;
          takeOut(Number(c.dataset.i));
        })
      );
    }
    function putIn(i) {
      inBasket.push(i);
      items[i].classList.add("gone");
      renderChips();
      const chip = $$(".chip").pop();
      chip.classList.add("pop");
      A.sfx.pop();
    }
    function takeOut(i) {
      inBasket = inBasket.filter((j) => j !== i);
      items[i].classList.remove("gone");
      bounce(items[i]);
      renderChips();
      A.sfx.tap();
    }

    items.forEach((b, i) =>
      b.addEventListener("click", () => {
        A.unlock();
        if (v.busy || b.classList.contains("gone")) return;
        putIn(i);
        talk(seg.num(inBasket.length));
      })
    );

    on("#check", "click", async () => {
      A.unlock();
      if (v.busy) return;
      if (!inBasket.length) return talk(v.instruction());
      v.busy = true;
      if (inBasket.length === n) {
        $("#basket").classList.add("right");
        A.sfx.chime();
        await talk([seg.praise(), { pause: 150 }, ...seg.total(it, n)]);
        if (!v.dead) roundDone(v, misses ? "hint" : "ok");
        return;
      }
      misses++;
      const tooMany = inBasket.length > n;
      A.sfx.soft();
      await wait(300);
      if (misses === 1) {
        // Count the basket together, say what is off, and ask again.
        await talk([seg.p("countTogether")]);
        await countTogether(v, $$(".chip"));
        if (v.dead) return;
        await talk([seg.p(tooMany ? "tooMany" : "tooFew")]);
        if (v.dead) return;
        $$(".chip").forEach((c) => c.classList.remove("lit", "counted"));
        v.busy = false;
        talk(seg.give(it, n));
      } else {
        // Fix the basket, count it together and move on.
        while (inBasket.length > n) {
          takeOut(inBasket[inBasket.length - 1]);
          await wait(350);
        }
        const free = items.map((_, i) => i).filter((i) => !inBasket.includes(i));
        while (inBasket.length < n) {
          putIn(free.shift());
          await wait(350);
        }
        if (v.dead) return;
        await talk([seg.p("countTogether")]);
        await countTogether(v, $$(".chip"));
        if (v.dead) return;
        $("#basket").classList.add("right");
        await talk(seg.total(it, n));
        if (!v.dead) roundDone(v, "shown");
      }
    });
    talk(v.instruction());
  }

  // ---------- End of session ----------
  function celebrate() {
    session = null;
    const sticker = S.finishSession(D.STICKERS);
    const s = settings();
    show(
      `<div class="confetti">${"<i></i>".repeat(14)}</div>
       <div class="end-guide">${GUIDE}</div>
       <h1>כׇּל הַכָּבוֹד ${esc(s.name)}!</h1>
       <div class="sticker got big pop">${sticker}</div>
       <button class="round-btn" id="home" aria-label="הביתה">${ICON.home}</button>`,
      "end"
    );
    A.sfx.sticker();
    on("#home", "click", () => {
      A.sfx.tap();
      home();
    });
    talk([seg.p("bravo"), seg.name(), { pause: 200 }, seg.p("gotSticker")]);
  }

  // ---------- Parent gate ----------
  function parentGate() {
    const a = 3 + Math.floor(Math.random() * 7);
    const b = 3 + Math.floor(Math.random() * 7);
    let entry = "";
    const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, "⌫", 0, "✓"].map((k) => `<button class="key" data-k="${k}">${k}</button>`).join("");
    show(
      `<div class="topbar"><button class="icon-btn" id="back" aria-label="חזרה">${ICON.close}</button></div>
       <div class="gate">
         <p>להורים: כמה זה</p>
         <div class="q" dir="ltr">${a} × ${b} = <span id="entry">?</span></div>
         <div class="keypad" dir="ltr">${keys}</div>
       </div>`,
      "parent gate-screen"
    );
    on("#back", "click", home);
    $$(".key").forEach((btn) =>
      btn.addEventListener("click", () => {
        const k = btn.dataset.k;
        if (k === "⌫") entry = entry.slice(0, -1);
        else if (k === "✓") {
          if (Number(entry) === a * b) return parentHome();
          entry = "";
          $(".q").classList.add("shake");
          setTimeout(() => $(".q") && $(".q").classList.remove("shake"), 400);
        } else if (entry.length < 3) entry += k;
        $("#entry").textContent = entry || "?";
      })
    );
  }

  // ---------- Parent area ----------
  const LANG_LABEL = { he: "עברית", en: "English", both: "עברית ואנגלית" };

  function voiceStatus() {
    const s = settings();
    const heName = A.voiceName("he");
    const enName = A.voiceName("en");
    let html = heName
      ? `<p>קול עברי: <b dir="auto">${esc(heName)}</b></p>`
      : `<p class="warn">לא נמצא קול עברי במכשיר. באייפון: הגדרות ← נגישות ← תוכן מדובר ← קולות ← עברית. באנדרואיד: הגדרות ← המרת טקסט לדיבור ← התקנת עברית.</p>`;
    if (s.lang !== "he") {
      html += enName
        ? `<p>קול אנגלי: <b dir="auto">${esc(enName)}</b></p>`
        : `<p class="warn">לא נמצא קול אנגלי במכשיר.</p>`;
    }
    return html;
  }

  function parentHome() {
    const s = settings();
    const p = S.progress();
    show(
      `<div class="parent-page dash">
        <div class="dash-head">
          <h1>אזור הורים</h1>
          <button class="btn small" id="back">חזרה לילד</button>
        </div>
        <div class="card-box">
          <div class="stats">
            <div><b>${S.top()}</b><span>הטווח עכשיו: עד</span></div>
            <div><b>${s.max}</b><span>המספר הגבוה ביותר</span></div>
            <div><b>${p.sessions}</b><span>משחקים שהושלמו</span></div>
            <div><b>${p.stickers.length}</b><span>מדבקות</span></div>
          </div>
          <p class="muted">ספירה ב${LANG_LABEL[s.lang]}. הטווח מתרחב אחרי שלוש תשובות נכונות ברצף, ומצטמצם כשצריך להראות את התשובה.</p>
        </div>
        <div class="card-box">${voiceStatus()}</div>
        <button class="btn primary" id="settings">הגדרות</button>
        <button class="btn" id="voices">בדיקת קול — כל המשפטים</button>
        <button class="btn danger" id="reset">איפוס התקדמות</button>
      </div>`,
      "parent"
    );
    on("#back", "click", home);
    on("#settings", "click", () => settingsForm(false));
    on("#voices", "click", voiceCheck);
    on("#reset", "click", () => {
      if (confirm("לאפס את ההתקדמות והמדבקות? ההגדרות יישמרו.")) {
        S.resetProgress();
        parentHome();
      }
    });
  }

  function segCtl(id, options, current) {
    return `<div class="seg-ctl" id="${id}">${options
      .map(([v, label]) => `<button type="button" data-v="${v}" class="${String(v) === String(current) ? "on" : ""}">${label}</button>`)
      .join("")}</div>`;
  }

  function voiceSelect(id, lang, current) {
    const opts = A.voices(lang)
      .map((v) => `<option value="${esc(v.name)}" ${v.name === current ? "selected" : ""}>${esc(v.name)} (${esc(v.lang)}${v.local ? "" : ", רשת"})</option>`)
      .join("");
    return `<select id="${id}"><option value="">אוטומטי</option>${opts}</select>`;
  }

  function settingsForm(isNew) {
    const s = Object.assign(S.newSettings(), S.settings() || {});
    show(
      `<div class="parent-page form">
        <h1>${isNew ? "הגדרות ראשונות" : "הגדרות"}</h1>
        <label class="field"><span>שם הילד</span><input type="text" id="name" value="${esc(s.name)}" maxlength="20" autocomplete="off"></label>
        <div class="field"><span>פנייה</span>${segCtl("gender", [["m", "בן — בּוֹא, סְפֹר"], ["f", "בת — בּוֹאִי, סִפְרִי"]], s.gender)}</div>
        <div class="field"><span>שפת הספירה</span>${segCtl("lang", [["he", "עברית"], ["en", "English"], ["both", "שתיהן"]], s.lang)}
          <span class="sub">ההוראות והמחמאות תמיד בעברית. ״שתיהן״: כל מספר נאמר בעברית ואז באנגלית.</span></div>
        <div class="field"><span>המספר הגבוה ביותר</span>${segCtl("max", S.MAX_OPTIONS.map((m) => [m, m]), s.max)}
          <span class="sub">המשחק מתחיל ב־1–3 ומתקדם לאט עד המספר הזה.</span></div>
        <div class="field"><span>קצב דיבור</span>
          <div class="rate-row"><input type="range" id="rate" min="0.5" max="1.2" step="0.05" value="${s.rate}"><button type="button" class="btn small" id="try">נסו</button></div></div>
        <div class="field"><span>קול עברי</span>${voiceSelect("voiceHe", "he", s.voiceHe)}</div>
        <div class="field"><span>קול אנגלי</span>${voiceSelect("voiceEn", "en", s.voiceEn)}</div>
        <p class="error" id="err" hidden></p>
        <button class="btn primary" id="save">שמירה</button>
        ${isNew ? "" : `<button class="btn" id="cancel">ביטול</button>`}
      </div>`,
      "parent"
    );
    ["#gender", "#lang", "#max"].forEach((id) =>
      $$(`${id} button`).forEach((b) =>
        b.addEventListener("click", () => {
          $$(`${id} button`).forEach((x) => x.classList.remove("on"));
          b.classList.add("on");
        })
      )
    );
    const read = () => ({
      name: $("#name").value.trim(),
      gender: $("#gender .on").dataset.v,
      lang: $("#lang .on").dataset.v,
      max: Number($("#max .on").dataset.v),
      rate: Number($("#rate").value),
      voiceHe: $("#voiceHe").value,
      voiceEn: $("#voiceEn").value,
    });
    on("#try", "click", () => {
      A.unlock();
      const f = read();
      A.setRate(f.rate);
      A.setVoices({ he: f.voiceHe, en: f.voiceEn });
      const it = D.ITEMS[0];
      A.say([seg.intro(it, f.gender), ...seg.num(1, f.lang), ...seg.num(2, f.lang), ...seg.num(3, f.lang), ...seg.total(it, 3, f.lang)]);
    });
    on("#cancel", "click", () => {
      applySettings();
      parentHome();
    });
    on("#save", "click", () => {
      const f = read();
      if (!f.name) {
        const err = $("#err");
        err.textContent = "צריך שם — הדמות פונה אל הילד בשמו.";
        err.hidden = false;
        $("#name").focus();
        return;
      }
      S.saveSettings(f);
      applySettings();
      isNew ? home() : parentHome();
    });
  }

  // Every phrase the game can say, each with a play button, so a parent can
  // hear what the device voice does with the niqqud.
  function voiceCheck() {
    const g = gender();
    const rows = [];
    const section = (title) => rows.push({ title });
    const add = (s) => rows.push({ seg: s });

    section("ספירה בעברית");
    for (let n = 1; n <= 20; n++) add(seg.numHe(n));
    section("ספירה באנגלית");
    for (let n = 1; n <= 20; n++) add(seg.numEn(n));
    section("מספרים לפני שם עצם זכר");
    for (let n = 1; n <= 20; n++) add(he("numM." + n, D.NUM_HE_M[n]));
    section("מספרים לפני שם עצם נקבה");
    for (let n = 1; n <= 20; n++) add(he("numF." + n, D.NUM_HE_F[n]));
    section("משפטים קבועים");
    Object.keys(D.PHRASES).forEach((k) => {
      const v = D.PHRASES[k];
      if (k === "praise") v.forEach((t, i) => add(he("p.praise." + i, t)));
      else if (typeof v === "string") add(seg.p(k));
      else ["m", "f"].forEach((gg) => add(seg.p(k, gg)));
    });
    ["m", "f"].forEach((ig) => add(he("already." + ig, D.ALREADY[ig])));
    D.ITEMS.forEach((it) => {
      section(`${it.emoji} ${it.pl}`);
      add(seg.intro(it, g));
      add(seg.howMany(it));
      [1, 2, 3, 5, 10].forEach((n) => add(seg.totalHe(it, n)));
      [1, 3].forEach((n) => add(seg.giveHe(it, n, g)));
      [1, 3].forEach((n) => add(seg.give(it, n, "en", g)[0]));
      [1, 3].forEach((n) => add(seg.totalEn(it, n)));
    });

    let list = [];
    const html = rows
      .map((r) => {
        if (r.title) return `<h2>${esc(r.title)}</h2>`;
        list.push(r.seg);
        return `<button class="voice-row" data-k="${list.length - 1}">${ICON.speaker}<span dir="auto">${esc(r.seg.text)}</span><small>${esc(r.seg.key)}</small></button>`;
      })
      .join("");
    show(
      `<div class="parent-page">
        <div class="dash-head"><h1>בדיקת קול</h1><button class="btn small" id="back">חזרה</button></div>
        <p class="muted">כל משפט מושמע בקול של המכשיר. הפנייה לפי ההגדרה הנוכחית (${g === "f" ? "בת" : "בן"}).</p>
        <div class="voice-list">${html}</div>
      </div>`,
      "parent"
    );
    on("#back", "click", parentHome);
    $$(".voice-row").forEach((b) =>
      b.addEventListener("click", () => {
        A.unlock();
        A.say([list[Number(b.dataset.k)]]);
      })
    );
  }

  // Start once the splash is gone (or right away if there is none).
  if (document.getElementById("splash")) document.addEventListener("sugi-splash-done", start, { once: true });
  else start();
})();
