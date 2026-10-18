/* Settings and progress, kept in localStorage on this device only. */
(() => {
  "use strict";

  const App = (window.App = window.App || {});
  const KEY = "one.v1";

  // The top of the number range climbs through these steps.
  const STEPS = [3, 5, 7, 10, 12, 15, 17, 20];
  const MAX_OPTIONS = [3, 5, 10, 15, 20];

  function freshProgress() {
    return { step: 0, streak: 0, rounds: 0, sessions: 0, stickers: [] };
  }

  function defaults() {
    return {
      settings: null, // null until the parent fills in the first-run form
      progress: freshProgress(),
    };
  }

  let state = load();

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw);
        return { settings: s.settings || null, progress: Object.assign(freshProgress(), s.progress) };
      }
    } catch (_) {}
    return defaults();
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function newSettings() {
    return { name: "", gender: "m", lang: "both", max: 5, rate: 0.85, voiceHe: "", voiceEn: "" };
  }

  // Highest number the next round may use.
  function top() {
    const max = state.settings ? state.settings.max : 5;
    return Math.min(STEPS[state.progress.step] || 3, max);
  }

  function randInt(lo, hi) {
    return lo + Math.floor(Math.random() * (hi - lo + 1));
  }

  // A number for the next round: mostly near the top of the current range.
  function pickN(cap) {
    const t = Math.min(top(), cap || 20);
    const lo = t <= 3 ? 1 : Math.max(2, Math.ceil(t / 2));
    return randInt(lo, t);
  }

  // ok: answered right the first time. Three in a row widen the range;
  // a round that needed the answer shown narrows it again.
  function recordRound(result) {
    const p = state.progress;
    p.rounds++;
    if (result === "ok") {
      p.streak++;
      const max = state.settings ? state.settings.max : 5;
      if (p.streak >= 3 && STEPS[p.step] < max && p.step < STEPS.length - 1) {
        p.step++;
        p.streak = 0;
      }
    } else if (result === "hint") {
      p.streak = 0;
    } else if (result === "shown") {
      p.streak = 0;
      if (p.step > 0) p.step--;
    }
    save();
  }

  // Ends a session; returns the new sticker (or a repeat once all are owned).
  function finishSession(pool) {
    const p = state.progress;
    p.sessions++;
    const left = pool.filter((s) => !p.stickers.includes(s));
    const sticker = (left.length ? left : pool)[Math.floor(Math.random() * (left.length || pool.length))];
    p.stickers.push(sticker);
    save();
    return sticker;
  }

  App.store = {
    MAX_OPTIONS,
    settings: () => state.settings,
    progress: () => state.progress,
    newSettings,
    saveSettings(s) {
      state.settings = s;
      // A lower "highest number" pulls the difficulty step down with it.
      const p = state.progress;
      while (p.step > 0 && STEPS[p.step - 1] >= s.max) p.step--;
      save();
    },
    resetProgress() {
      state.progress = freshProgress();
      save();
    },
    top,
    pickN,
    recordRound,
    finishSession,
  };
})();
