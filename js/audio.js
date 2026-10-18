/* Audio for אחת שתיים שלוש.
 *
 * Speech uses the device's own voices (Web Speech API): a Hebrew voice for
 * everything Hebrew and an English voice for English numbers. Each segment is
 * one utterance in one voice, so voices never mix inside a phrase.
 * Sound effects are short WebAudio tones — no audio files. */
(() => {
  "use strict";

  const App = (window.App = window.App || {});

  const NOVELTY = /albert|bad news|bahh|bells|boing|bubbles|cellos|good news|jester|organ|superstar|trinoids|whisper|wobble|zarvox|fred|junior|kathy|ralph|grandpa|grandma|eddy|flo|reed|rocko|sandy|shelley/i;

  let rate = 0.85;
  let prefs = { he: "", en: "" }; // voice names chosen in settings ("" = automatic)
  let voices = { he: null, en: null };
  let ctx = null;
  let token = 0; // bumps on every new say() / stop(), cancelling older chains
  let cutCurrent = null; // resolves the utterance in flight when cancelled

  const synth = "speechSynthesis" in window ? window.speechSynthesis : null;

  function list(lang) {
    if (!synth) return [];
    const all = synth.getVoices() || [];
    if (lang === "he") return all.filter((v) => /^(he|iw)/i.test(v.lang));
    return all.filter((v) => /^en/i.test(v.lang));
  }

  function score(v, lang) {
    let s = 0;
    if (v.localService) s += 8; // offline voices first
    if (lang === "en") {
      if (/^en[-_]US/i.test(v.lang)) s += 4;
      else if (/^en[-_]GB/i.test(v.lang)) s += 3;
      if (NOVELTY.test(v.name)) s -= 20;
      if (/samantha|google us english|daniel|karen/i.test(v.name)) s += 2;
    }
    if (v.default) s += 1;
    return s;
  }

  function pickVoices() {
    ["he", "en"].forEach((lang) => {
      const vs = list(lang);
      const chosen = prefs[lang] && vs.find((v) => v.name === prefs[lang]);
      voices[lang] = chosen || vs.slice().sort((a, b) => score(b, lang) - score(a, lang))[0] || null;
    });
  }
  if (synth) {
    pickVoices();
    if (synth.addEventListener) synth.addEventListener("voiceschanged", pickVoices);
    else synth.onvoiceschanged = pickVoices;
  }

  function speakText(text, lang) {
    return new Promise((resolve) => {
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        clearTimeout(guard);
        if (cutCurrent === finish) cutCurrent = null;
        resolve();
      };
      cutCurrent = finish;
      // Some engines never fire onend; never let the game hang on it.
      const guard = setTimeout(finish, 1500 + (text.length * 160) / rate);
      if (!synth) return;
      const u = new SpeechSynthesisUtterance(text);
      const v = voices[lang];
      u.lang = v ? v.lang : lang === "en" ? "en-US" : "he-IL";
      if (v) u.voice = v;
      u.rate = rate;
      u.onend = finish;
      u.onerror = finish;
      synth.speak(u);
    });
  }

  function stop() {
    token++;
    if (synth) synth.cancel();
    if (cutCurrent) cutCurrent();
  }

  // say([{key, text, lang} | {pause: ms}, ...]) — speaks the segments in
  // order, cutting off anything already speaking. Resolves true when it ran to
  // the end, false when another say()/stop() interrupted it.
  async function say(segments) {
    stop();
    const my = token;
    for (const seg of segments) {
      if (my !== token) return false;
      if (!seg) continue;
      if (seg.pause) await new Promise((r) => setTimeout(r, seg.pause));
      else if (seg.text) await speakText(seg.text, seg.lang || "he");
    }
    return my === token;
  }

  // ---------- Sound effects ----------
  function audioCtx() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type = "sine", gain = 0.18) {
    const c = audioCtx();
    if (!c) return;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    const t0 = c.currentTime + start;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  const sfx = {
    pop() {
      tone(520, 0, 0.07, "sine", 0.12);
      tone(780, 0.03, 0.08, "sine", 0.08);
    },
    tap() {
      tone(660, 0, 0.06, "sine", 0.08);
    },
    chime() {
      tone(784, 0, 0.2, "triangle");
      tone(1175, 0.12, 0.32, "triangle");
    },
    soft() {
      // A gentle, non-punishing "hmm" for a wrong answer.
      tone(330, 0, 0.22, "sine", 0.12);
      tone(294, 0.14, 0.26, "sine", 0.1);
    },
    sticker() {
      [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, "triangle", 0.15));
    },
  };

  // iOS only lets audio start from a user gesture; call this from one.
  function unlock() {
    audioCtx();
    if (synth && !unlock.done) {
      unlock.done = true;
      const u = new SpeechSynthesisUtterance(" ");
      u.volume = 0;
      synth.speak(u);
    }
  }

  App.audio = {
    say,
    stop,
    sfx,
    unlock,
    setRate(r) {
      rate = r;
    },
    setVoices(p) {
      prefs = { he: p.he || "", en: p.en || "" };
      pickVoices();
    },
    voices(lang) {
      return list(lang).map((v) => ({ name: v.name, lang: v.lang, local: !!v.localService }));
    },
    voiceName(lang) {
      pickVoices();
      return voices[lang] ? voices[lang].name : null;
    },
  };
})();
