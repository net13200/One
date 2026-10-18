/* One — every word the game speaks lives in this file.
 *
 * Each spoken segment is { key, text, lang }. The key is stable
 * (num.he.5, p.countAgain.m, total.he.apple.5 …) so checked recordings
 * could replace the device voice later without code changes.
 *
 * Child-addressed phrases have a male (m) and female (f) form.
 * Item phrases follow the item's own grammatical gender. */
(() => {
  "use strict";

  const App = (window.App = window.App || {});

  // Counting forms (feminine), as used when counting out loud: 1..20.
  const NUM_HE = [
    null,
    "אַחַת", "שְׁתַּיִם", "שָׁלוֹשׁ", "אַרְבַּע", "חָמֵשׁ",
    "שֵׁשׁ", "שֶׁבַע", "שְׁמוֹנֶה", "תֵּשַׁע", "עֶשֶׂר",
    "אַחַת־עֶשְׂרֵה", "שְׁתֵּים־עֶשְׂרֵה", "שְׁלוֹשׁ־עֶשְׂרֵה", "אַרְבַּע־עֶשְׂרֵה", "חֲמֵשׁ־עֶשְׂרֵה",
    "שֵׁשׁ־עֶשְׂרֵה", "שְׁבַע־עֶשְׂרֵה", "שְׁמוֹנֶה־עֶשְׂרֵה", "תְּשַׁע־עֶשְׂרֵה", "עֶשְׂרִים",
  ];

  // Masculine forms, used before a masculine noun ("חֲמִשָּׁה תַּפּוּחִים").
  // 1 comes after the noun, 2 is the construct form ("שְׁנֵי").
  const NUM_HE_M = [
    null,
    "אֶחָד", "שְׁנֵי", "שְׁלוֹשָׁה", "אַרְבָּעָה", "חֲמִשָּׁה",
    "שִׁשָּׁה", "שִׁבְעָה", "שְׁמוֹנָה", "תִּשְׁעָה", "עֲשָׂרָה",
    "אַחַד־עָשָׂר", "שְׁנֵים־עָשָׂר", "שְׁלוֹשָׁה־עָשָׂר", "אַרְבָּעָה־עָשָׂר", "חֲמִשָּׁה־עָשָׂר",
    "שִׁשָּׁה־עָשָׂר", "שִׁבְעָה־עָשָׂר", "שְׁמוֹנָה־עָשָׂר", "תִּשְׁעָה־עָשָׂר", "עֶשְׂרִים",
  ];

  // Feminine forms before a feminine noun ("חָמֵשׁ בָּנָנוֹת"). Same as the
  // counting forms except 2, which takes the construct form ("שְׁתֵּי").
  const NUM_HE_F = NUM_HE.map((w, n) => (n === 2 ? "שְׁתֵּי" : w));

  const NUM_EN = [
    null,
    "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
    "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
  ];

  // Things to count. def = plural with the definite article (the article
  // changes the first letter's vowel/dagesh, so it is stored, not built).
  const ITEMS = [
    { id: "apple", emoji: "🍎", g: "m", sg: "תַּפּוּחַ", pl: "תַּפּוּחִים", def: "הַתַּפּוּחִים", en: ["apple", "apples"] },
    { id: "banana", emoji: "🍌", g: "f", sg: "בָּנָנָה", pl: "בָּנָנוֹת", def: "הַבָּנָנוֹת", en: ["banana", "bananas"] },
    { id: "orange", emoji: "🍊", g: "m", sg: "תַּפּוּז", pl: "תַּפּוּזִים", def: "הַתַּפּוּזִים", en: ["orange", "oranges"] },
    { id: "strawberry", emoji: "🍓", g: "m", sg: "תּוּת", pl: "תּוּתִים", def: "הַתּוּתִים", en: ["strawberry", "strawberries"] },
    { id: "cookie", emoji: "🍪", g: "f", sg: "עוּגִיָּה", pl: "עוּגִיּוֹת", def: "הָעוּגִיּוֹת", en: ["cookie", "cookies"] },
    { id: "duck", emoji: "🦆", g: "m", sg: "בַּרְוָז", pl: "בַּרְוָזִים", def: "הַבַּרְוָזִים", en: ["duck", "ducks"] },
    { id: "fish", emoji: "🐟", g: "m", sg: "דָּג", pl: "דָּגִים", def: "הַדָּגִים", en: ["fish", "fish"] },
    { id: "turtle", emoji: "🐢", g: "m", sg: "צָב", pl: "צַבִּים", def: "הַצַּבִּים", en: ["turtle", "turtles"] },
    { id: "chick", emoji: "🐥", g: "m", sg: "אֶפְרוֹחַ", pl: "אֶפְרוֹחִים", def: "הָאֶפְרוֹחִים", en: ["chick", "chicks"] },
    { id: "cat", emoji: "🐱", g: "m", sg: "חָתוּל", pl: "חֲתוּלִים", def: "הַחֲתוּלִים", en: ["cat", "cats"] },
    { id: "frog", emoji: "🐸", g: "f", sg: "צְפַרְדֵּעַ", pl: "צְפַרְדְּעִים", def: "הַצְּפַרְדְּעִים", en: ["frog", "frogs"] },
    { id: "bee", emoji: "🐝", g: "f", sg: "דְּבוֹרָה", pl: "דְּבוֹרִים", def: "הַדְּבוֹרִים", en: ["bee", "bees"] },
    { id: "sheep", emoji: "🐑", g: "f", sg: "כִּבְשָׂה", pl: "כְּבָשִׂים", def: "הַכְּבָשִׂים", en: ["sheep", "sheep"] },
    { id: "butterfly", emoji: "🦋", g: "m", sg: "פַּרְפַּר", pl: "פַּרְפָּרִים", def: "הַפַּרְפָּרִים", en: ["butterfly", "butterflies"] },
    { id: "star", emoji: "⭐", g: "m", sg: "כּוֹכָב", pl: "כּוֹכָבִים", def: "הַכּוֹכָבִים", en: ["star", "stars"] },
    { id: "balloon", emoji: "🎈", g: "m", sg: "בָּלוֹן", pl: "בָּלוֹנִים", def: "הַבָּלוֹנִים", en: ["balloon", "balloons"] },
    { id: "flower", emoji: "🌸", g: "m", sg: "פֶּרַח", pl: "פְּרָחִים", def: "הַפְּרָחִים", en: ["flower", "flowers"] },
    { id: "ball", emoji: "⚽", g: "m", sg: "כַּדּוּר", pl: "כַּדּוּרִים", def: "הַכַּדּוּרִים", en: ["ball", "balls"] },
    { id: "car", emoji: "🚗", g: "f", sg: "מְכוֹנִית", pl: "מְכוֹנִיּוֹת", def: "הַמְּכוֹנִיּוֹת", en: ["car", "cars"] },
  ];

  // Fixed phrases. A string is the same for a boy and a girl; {m, f} differ.
  const PHRASES = {
    hello: "שָׁלוֹם",
    letsCount: { m: "בּוֹא נִסְפֹּר!", f: "בּוֹאִי נִסְפֹּר!" },
    countAgain: { m: "בּוֹא נִסְפֹּר שׁוּב.", f: "בּוֹאִי נִסְפֹּר שׁוּב." },
    countTogether: { m: "בּוֹא נִסְפֹּר יַחַד.", f: "בּוֹאִי נִסְפֹּר יַחַד." },
    pressCheck: { m: "וְאָז לְחַץ עַל הַכַּפְתּוֹר הַיָּרֹק.", f: "וְאָז לַחֲצִי עַל הַכַּפְתּוֹר הַיָּרֹק." },
    tooMany: "זֶה יוֹתֵר מִדַּי.",
    tooFew: "צָרִיךְ עוֹד.",
    bravo: "כׇּל הַכָּבוֹד",
    gotSticker: { m: "קִבַּלְתָּ מַדְבֵּקָה!", f: "קִבַּלְתְּ מַדְבֵּקָה!" },
    praise: ["כׇּל הַכָּבוֹד!", "יָפֶה מְאוֹד!", "מְצֻיָּן!", "נָכוֹן!", "יוֹפִי!"],
  };

  // "Already counted it" follows the item's gender, not the child's.
  const ALREADY = { m: "כְּבָר סָפַרְנוּ אוֹתוֹ.", f: "כְּבָר סָפַרְנוּ אוֹתָהּ." };

  // ---------- Phrases built from an item and a number ----------

  // "חֲמִשָּׁה תַּפּוּחִים", "תַּפּוּחַ אֶחָד", "שְׁתֵּי בָּנָנוֹת"
  function qtyHe(item, n) {
    const nums = item.g === "m" ? NUM_HE_M : NUM_HE_F;
    return n === 1 ? `${item.sg} ${nums[1]}` : `${nums[n]} ${item.pl}`;
  }
  // "five apples", "one apple"
  function qtyEn(item, n) {
    return `${NUM_EN[n]} ${n === 1 ? item.en[0] : item.en[1]}`;
  }

  const TEMPLATES = {
    // Start of a counting round.
    intro: {
      m: (it) => `סְפֹר אֶת ${it.def}. גַּע בְּכָל ${it.sg}.`,
      f: (it) => `סִפְרִי אֶת ${it.def}. גְּעִי בְּכָל ${it.sg}.`,
    },
    howMany: (it) => `כַּמָּה ${it.pl} יֵשׁ?`,
    totalHe: (it, n) => `יֵשׁ ${qtyHe(it, n)}!`,
    totalEn: (it, n) => `${qtyEn(it, n)}!`,
    give: {
      m: (it, n) => `תֵּן לִי ${qtyHe(it, n)}.`,
      f: (it, n) => `תְּנִי לִי ${qtyHe(it, n)}.`,
    },
    // English counting mode: the Hebrew sentence names only the noun, and the
    // amount follows in English ("תֵּן לִי בָּנָנוֹת" … "three bananas").
    giveNoun: {
      m: (it, n) => `תֵּן לִי ${n === 1 ? it.sg : it.pl}:`,
      f: (it, n) => `תְּנִי לִי ${n === 1 ? it.sg : it.pl}:`,
    },
  };

  // Stickers awarded at the end of a session.
  const STICKERS = ["🦁", "🐘", "🦒", "🐼", "🐨", "🐯", "🦊", "🐰", "🐻", "🐵", "🦄", "🐙", "🦀", "🐳", "🐬", "🦉", "🐧", "🦜", "🦖", "🚂", "🚒", "🚁", "🌈", "🍉"];

  App.data = { NUM_HE, NUM_HE_M, NUM_HE_F, NUM_EN, ITEMS, PHRASES, ALREADY, TEMPLATES, STICKERS, qtyHe, qtyEn };
})();
