// Pattern definitions for OpenRNGdle.
//
// Badge names, EP values, and family groupings mirror the real RNGdle's public
// badge economy (233 badges, 39 supersession families). The pattern-matching
// logic below is an independent implementation written from each badge's
// stated rule — not a copy of any other project's code.
//
// ctx = { n, s, len, d, counts, distinct, sum, prod, maxCount, has(sub), countExact(k), withCount(k) }
//   n       rolled number
//   s       digit string, no leading zeros (e.g. "0", "424242")
//   d       digits as an array of numbers
//   counts  digit -> how many times it appears
//   has(sub)        s.includes(sub)
//   countExact(k)   how many distinct digit values appear EXACTLY k times
//   withCount(k)    how many distinct digit values appear AT LEAST k times
//
// Each badge's test(ctx) returns:
//   false / falsy   -> no match
//   true            -> match, every digit "contributed" (whole-number properties:
//                       exact values, primality, digit sums, distinct-digit counts, etc.)
//   number[]        -> match, only these 0-based digit positions contributed

function buildContext(n) {
  const s = String(n);
  const d = [...s].map(Number);
  const counts = {};
  for (const x of d) counts[x] = (counts[x] || 0) + 1;
  const countValues = Object.values(counts);
  return {
    n,
    s,
    len: s.length,
    d,
    counts,
    distinct: countValues.length,
    sum: d.reduce((a, b) => a + b, 0),
    prod: d.reduce((a, b) => a * b, 1),
    maxCount: Math.max(...countValues),
    has: (sub) => s.includes(sub),
    countExact: (k) => countValues.filter((v) => v === k).length,
    withCount: (k) => countValues.filter((v) => v >= k).length,
  };
}

// ---------------------------------------------------------------------------
// Digit-position helpers — find *where* a pattern occurred, for highlighting.
// ---------------------------------------------------------------------------

function idxOfSub(s, sub) {
  const i = s.indexOf(sub);
  return i === -1 ? false : Array.from({ length: sub.length }, (_, k) => i + k);
}
function idxOfSuffix(s, len) {
  return Array.from({ length: len }, (_, i) => s.length - len + i);
}
function idxOfDigit(s, digitChar) {
  const i = s.indexOf(digitChar);
  return i === -1 ? false : [i];
}
function idxOfAllDigit(s, digitChar) {
  const idx = [];
  for (let i = 0; i < s.length; i++) if (s[i] === digitChar) idx.push(i);
  return idx.length ? idx : false;
}
function idxWhereCount(s, counts, predicate) {
  const idx = [];
  for (let i = 0; i < s.length; i++) if (predicate(counts[s[i]] || 0)) idx.push(i);
  return idx.length ? idx : false;
}

// ---------------------------------------------------------------------------
// Math helpers
// ---------------------------------------------------------------------------

function isPerfectPower(n, exp) {
  if (n <= 1) return true; // 0 = 0^exp, 1 = 1^exp
  for (let b = 2; ; b++) {
    let v = 1;
    for (let i = 0; i < exp; i++) v *= b;
    if (v > n) return false;
    if (v === n) return true;
  }
}

function isPowerFromOne(n, base) {
  if (n <= 0) return false;
  let v = 1; // counts base^0 = 1
  while (v < n) v *= base;
  return v === n;
}

const FACTORIALS = new Set([1, 2, 6, 24, 120, 720, 5040, 40320, 362880]);

const FIBONACCI = (() => {
  const set = new Set([0, 1]);
  let a = 0, b = 1;
  while (b <= 1000000) {
    set.add(b);
    [a, b] = [b, a + b];
  }
  return set;
})();

const PRONICS = (() => {
  const set = new Set();
  for (let k = 0; k * (k + 1) <= 1000000; k++) set.add(k * (k + 1));
  return set;
})();

function isPrime(n) {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Digit-shape helpers
// ---------------------------------------------------------------------------

function digitRuns(s) {
  const runs = [];
  let i = 0;
  while (i < s.length) {
    let j = i;
    while (j < s.length && s[j] === s[i]) j++;
    runs.push({ start: i, len: j - i });
    i = j;
  }
  return runs;
}
function runRangeOfAtLeast(s, len) {
  const run = digitRuns(s).find((r) => r.len >= len);
  return run ? Array.from({ length: run.len }, (_, k) => run.start + k) : false;
}

const isStrictAsc = (d) => d.length >= 2 && d.every((x, i) => i === 0 || x > d[i - 1]);
const isStrictDesc = (d) => d.length >= 2 && d.every((x, i) => i === 0 || x < d[i - 1]);
const isNonDecreasing = (d) => {
  if (d.length < 2) return false;
  let rose = false;
  for (let i = 1; i < d.length; i++) {
    if (d[i] < d[i - 1]) return false;
    if (d[i] > d[i - 1]) rose = true;
  }
  return rose;
};
const isNonIncreasing = (d) => {
  if (d.length < 2) return false;
  let fell = false;
  for (let i = 1; i < d.length; i++) {
    if (d[i] > d[i - 1]) return false;
    if (d[i] < d[i - 1]) fell = true;
  }
  return fell;
};
const stepsBy = (d, delta) => d.length >= 2 && d.every((x, i) => i === 0 || x - d[i - 1] === delta);
const isConstantDiff = (d, absolute) => {
  if (d.length < 3) return false;
  const target = absolute ? Math.abs(d[1] - d[0]) : d[1] - d[0];
  for (let i = 2; i < d.length; i++) {
    const diff = absolute ? Math.abs(d[i] - d[i - 1]) : d[i] - d[i - 1];
    if (diff !== target) return false;
  }
  return true;
};
const isTurtle = (d) => d.length >= 2 && d.every((x, i) => i === 0 || Math.abs(x - d[i - 1]) <= 1);
const isAlternatingParity = (d) => d.length >= 2 && d.every((x, i) => i === 0 || x % 2 !== d[i - 1] % 2);
const isSameParity = (d) => d.length >= 1 && d.every((x) => x % 2 === d[0] % 2);

// Mountain/valley return just the peak/trough digit index (the single strongest
// piece of evidence), matching how the real game highlights the pivot point.
function mountainPivot(d) {
  if (d.length < 3) return false;
  let i = 0;
  while (i + 1 < d.length && d[i] < d[i + 1]) i++;
  if (i === 0 || i === d.length - 1) return false;
  const peak = i;
  while (i + 1 < d.length && d[i] > d[i + 1]) i++;
  return i === d.length - 1 ? [peak] : false;
}
function valleyPivot(d) {
  if (d.length < 3) return false;
  let i = 0;
  while (i + 1 < d.length && d[i] > d[i + 1]) i++;
  if (i === 0 || i === d.length - 1) return false;
  const trough = i;
  while (i + 1 < d.length && d[i] < d[i + 1]) i++;
  return i === d.length - 1 ? [trough] : false;
}
function isMesa(d) {
  let rose = false, fell = false;
  for (let i = 1; i < d.length; i++) {
    if (d[i] > d[i - 1]) { if (fell) return false; rose = true; }
    else if (d[i] < d[i - 1]) fell = true;
  }
  return rose && fell;
}
function isCanyon(d) {
  let rose = false, fell = false;
  for (let i = 1; i < d.length; i++) {
    if (d[i] < d[i - 1]) { if (rose) return false; fell = true; }
    else if (d[i] > d[i - 1]) rose = true;
  }
  return rose && fell;
}
function isHills(d) {
  if (d.length < 3) return false;
  let prevSign = 0;
  for (let i = 1; i < d.length; i++) {
    const diff = d[i] - d[i - 1];
    if (diff === 0) return false;
    const sign = diff > 0 ? 1 : -1;
    if (prevSign !== 0 && sign === prevSign) return false;
    prevSign = sign;
  }
  return true;
}
function isDunes(d) {
  const collapsed = [];
  for (const x of d) if (collapsed.length === 0 || collapsed[collapsed.length - 1] !== x) collapsed.push(x);
  if (collapsed.length < 4) return false;
  for (let i = 2; i < collapsed.length; i++) {
    const dir1 = collapsed[i - 1] - collapsed[i - 2];
    const dir2 = collapsed[i] - collapsed[i - 1];
    if ((dir1 > 0 && dir2 > 0) || (dir1 < 0 && dir2 < 0)) return false;
  }
  return true;
}
function hasDigitRunSequence(d, len) {
  for (let i = 0; i + len <= d.length; i++) {
    let asc = true, desc = true;
    for (let k = 1; k < len; k++) {
      if (d[i + k] - d[i + k - 1] !== 1) asc = false;
      if (d[i + k] - d[i + k - 1] !== -1) desc = false;
    }
    if (asc || desc) return true;
  }
  return false;
}

const isPalindromeStr = (s) => {
  for (let i = 0, j = s.length - 1; i < j; i++, j--) if (s[i] !== s[j]) return false;
  return true;
};
function substringPalindromeRange(s, minLen) {
  for (let len = minLen; len <= s.length; len++)
    for (let i = 0; i + len <= s.length; i++)
      if (isPalindromeStr(s.slice(i, i + len))) return Array.from({ length: len }, (_, k) => i + k);
  return false;
}
function isStrobogrammatic(s) {
  const map = { 0: "0", 1: "1", 6: "9", 8: "8", 9: "6" };
  let out = "";
  for (let i = s.length - 1; i >= 0; i--) {
    const m = map[s[i]];
    if (m === undefined) return false;
    out += m;
  }
  return out === s;
}
function isConsecutiveDigitSet(digits) {
  const sorted = [...digits].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) if (sorted[i] !== sorted[i - 1] + 1) return false;
  return true;
}
function hasMiniScramble(d) {
  for (let len = 3; len <= d.length; len++)
    for (let i = 0; i + len <= d.length; i++)
      if (isConsecutiveDigitSet(d.slice(i, i + len))) return true;
  return false;
}
function rhymeRange(s) {
  for (let len = 2; len <= s.length - 1; len++)
    for (let i = 0; i + len <= s.length; i++) {
      const j = s.indexOf(s.slice(i, i + len), i + len);
      if (j !== -1) {
        const idx = [];
        for (let k = 0; k < len; k++) { idx.push(i + k); idx.push(j + k); }
        return idx;
      }
    }
  return false;
}

const isFullHouse = (counts) => {
  const v = Object.values(counts).sort((a, b) => b - a);
  return v[0] >= 3 && (v[1] || 0) >= 2;
};
function hasContiguousFullHouse(s) {
  const m1 = s.match(/(\d)\1\1(\d)\2/);
  if (m1 && m1[1] !== m1[2]) return true;
  const m2 = s.match(/(\d)\1(\d)\2\2/);
  return !!(m2 && m2[1] !== m2[2]);
}
const isFirefly = (len, distinct, counts) => len >= 4 && distinct === 2 && Object.values(counts).some((v) => v === 1);

function contiguousPairStarts(s) {
  const counts = {};
  for (const ch of s) counts[ch] = (counts[ch] || 0) + 1;
  const starts = [];
  for (const [digit, n] of Object.entries(counts)) {
    if (n === 2) {
      const idx = s.indexOf(digit + digit);
      if (idx !== -1) starts.push(idx);
    }
  }
  return starts.sort((a, b) => a - b);
}
function hasContiguousNPair(s, n) {
  const starts = contiguousPairStarts(s);
  for (let i = 0; i + n - 1 < starts.length; i++) {
    let ok = true;
    for (let k = 1; k < n; k++) if (starts[i + k] !== starts[i + k - 1] + 2) ok = false;
    if (ok) return true;
  }
  return false;
}
function hasDoubleHop(s, len, distinct) {
  if (len < 5 || distinct < 2) return false;
  for (let i = 0; i + 4 < len; i++) if (s[i + 2] === s[i] && s[i + 4] === s[i]) return true;
  return false;
}
function hasHopscotch(s, len, distinct) {
  if (len < 3 || distinct < 2) return false;
  for (let i = 0; i + 2 < len; i++) {
    if (s[i + 2] === s[i]) {
      const ahead = len > i + 4 && s[i + 4] === s[i];
      const behind = i >= 2 && s[i - 2] === s[i];
      if (!ahead && !behind) return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Digit-string partitioning (for the "consecutive integers" and split-based badges)
// ---------------------------------------------------------------------------

const validPart = (p) => p.length === 1 || p[0] !== "0";

function partitions(s, count) {
  const results = [];
  (function rec(start, parts) {
    if (parts.length === count) {
      if (start === s.length) results.push(parts.slice());
      return;
    }
    const remaining = count - parts.length;
    for (let end = start + 1; end <= s.length - (remaining - 1); end++) {
      parts.push(s.slice(start, end));
      rec(end, parts);
      parts.pop();
    }
  })(0, []);
  return results;
}
const isAscNums = (nums) => { for (let i = 1; i < nums.length; i++) if (nums[i] - nums[i - 1] !== 1) return false; return true; };
const isConsecutiveSet = (nums) => { const t = [...nums].sort((a, b) => a - b); return isAscNums(t); };
const hasMultiDigitPart = (parts) => parts.some((p) => p.length >= 2);

// Whole string splits into `count` parts forming consecutive integers (so the
// match always spans the whole number — highlight-all is correct for these).
// ordered=true -> must read ascending in place; ordered=false -> must NOT.
function splitsIntoConsecutive(s, count, ordered, requireMultiDigit) {
  for (const parts of partitions(s, count)) {
    if (!parts.every(validPart)) continue;
    if (requireMultiDigit && !hasMultiDigitPart(parts)) continue;
    const nums = parts.map(Number);
    if (!isConsecutiveSet(nums)) continue;
    if (ordered === true && !isAscNums(nums)) continue;
    if (ordered === false && isAscNums(nums)) continue;
    return true;
  }
  return false;
}
// Some contiguous substring (shorter than the whole string) splits into `count`
// consecutive ascending parts. Returns the substring's index range.
function consecutiveRunRange(s, count, requireMultiDigit) {
  for (let i = 0; i < s.length; i++)
    for (let j = i + count; j <= s.length; j++) {
      if (i === 0 && j === s.length) continue; // that's the EXACT badge, not CONTAINS
      if (splitsIntoConsecutive(s.slice(i, j), count, true, requireMultiDigit))
        return Array.from({ length: j - i }, (_, k) => i + k);
    }
  return false;
}
function allSubstringValues(s) {
  const subs = [];
  for (let i = 0; i < s.length; i++)
    for (let j = i + 1; j <= s.length; j++) {
      const t = s.slice(i, j);
      if (validPart(t)) subs.push({ value: Number(t), start: i, end: j });
    }
  return subs;
}
function rangeUnion(a, b) {
  const idx = [];
  for (let k = a.start; k < a.end; k++) idx.push(k);
  for (let k = b.start; k < b.end; k++) idx.push(k);
  return idx;
}
// Two directly-adjacent substrings whose values are consecutive, not spanning the
// whole number (that's EXACT).
function adjacentConsecutivePairRange(s) {
  const subs = allSubstringValues(s);
  for (const a of subs)
    for (const b of subs) {
      if (b.start !== a.end) continue;
      if (a.start === 0 && b.end === s.length) continue;
      if (Math.abs(a.value - b.value) === 1) return rangeUnion(a, b);
    }
  return false;
}
// Two substrings anywhere (may or may not touch) whose values are consecutive.
function nearbyConsecutivePairRange(s) {
  const subs = allSubstringValues(s);
  for (const a of subs)
    for (const b of subs) {
      if (b.start < a.end) continue; // b must not start before a ends
      if (a.start === 0 && b.end === s.length && b.start === a.end) continue; // EXACT
      if (Math.abs(a.value - b.value) === 1) return rangeUnion(a, b);
    }
  return false;
}

// splitIntoPartsWhere always partitions the WHOLE string (start=0 through
// s.length), so ARITHMETIC/GEOMETRIC/EQUATION matches legitimately span every
// digit — highlight-all is correct for those.
function splitIntoPartsWhere(s, count, predicate) {
  function rec(start, parts) {
    if (parts.length === count - 1) {
      const last = s.slice(start);
      if (!validPart(last)) return false;
      return predicate([...parts, Number(last)]);
    }
    const remaining = count - 1 - parts.length;
    for (let end = start + 1; end <= s.length - remaining; end++) {
      const part = s.slice(start, end);
      if (!validPart(part)) continue;
      if (rec(end, [...parts, Number(part)])) return true;
    }
    return false;
  }
  return rec(0, []);
}
function hasArithmeticSplit(s) {
  for (let count = 3; count <= s.length; count++) {
    const found = splitIntoPartsWhere(s, count, (nums) => {
      const diff = nums[1] - nums[0];
      if (Math.abs(diff) <= 1) return false;
      for (let i = 2; i < nums.length; i++) if (nums[i] - nums[i - 1] !== diff) return false;
      return true;
    });
    if (found) return true;
  }
  return false;
}
function hasGeometricSplit(s) {
  for (let count = 3; count <= s.length; count++) {
    const found = splitIntoPartsWhere(s, count, (nums) => {
      if (nums.some((v) => v <= 0) || nums[0] === nums[1]) return false;
      for (let i = 0; i + 2 < nums.length; i++) if (nums[i + 1] * nums[i + 1] !== nums[i] * nums[i + 2]) return false;
      return true;
    });
    if (found) return true;
  }
  return false;
}
function hasEquation(s) {
  return splitIntoPartsWhere(s, 3, ([a, b, c]) => {
    if (a === 0 || b === 0 || c === 0) return false;
    return a + b === c || a - b === c || a * b === c || (a % b === 0 && a / b === c);
  });
}

// ---------------------------------------------------------------------------
// Badges: [id, name, emoji, ep, description, test(ctx)]
// EP determines rarity tier: common <1,000, uncommon <10,000, rare <100,000,
// epic <1,000,000, anomaly <10,000,000, mythic 10,000,000+.
// ---------------------------------------------------------------------------

const BADGES = [
  // --- Mythic exacts ---
  ["NICE_EXACT", "Exact Nice", "😏", 100000100, 'Exactly "69".', (c) => c.n === 69],
  ["JACKPOT_EXACT", "Exact Jackpot", "💰", 100000100, 'Exactly "777".', (c) => c.n === 777],
  ["JACKPOT_SIX", "Jackpot Six", "🏦", 100000100, "Six 7s in a row.", (c) => idxOfSub(c.s, "777777")],
  ["BOTANIST_EXACT", "Exact Botanist", "🌿", 100000100, 'Exactly "420".', (c) => c.n === 420],
  ["DEVIL_EXACT", "Exact Devil", "😈", 100000100, 'Exactly "666".', (c) => c.n === 666],
  ["LEET_EXACT", "Exact Leet", "💻", 100000100, 'Exactly "1337".', (c) => c.n === 1337],
  ["EXACT_HELL", "Exact Hell", "👹", 100000100, 'Exactly "7734".', (c) => c.n === 7734],
  ["EXACT_BOOB_80085", "Exact 80085", "💎", 100000100, 'Exactly "80085".', (c) => c.n === 80085],
  ["MEANING_EXACT", "Exact Meaning", "🌌", 100000100, 'Exactly "42".', (c) => c.n === 42],
  ["EMERGENCY_EXACT", "Exact Emergency", "🚑", 100000100, 'Exactly "911".', (c) => c.n === 911],
  ["VERY_VERY_NICE", "Very Very Nice", "😏", 100000100, 'Exactly "696969".', (c) => c.n === 696969],
  ["HOTBOX", "Hotbox", "🌿", 100000100, 'Exactly "420420".', (c) => c.n === 420420],
  ["MAYDAY", "Mayday", "🚑", 100000100, 'Exactly "911911".', (c) => c.n === 911911],
  ["UNIVERSAL_ANSWER", "Universal Answer", "🌌", 100000100, 'Exactly "424242".', (c) => c.n === 424242],
  ["BIG_BROTHER_EXACT", "Orwellian", "👁️", 100000100, 'Exactly "1984".', (c) => c.n === 1984],
  ["DIGIT_ZERO", "Zero", "0️⃣", 100000100, "The number zero.", (c) => c.n === 0],
  ["DIGIT_ONE", "One", "1️⃣", 100000100, "The number one.", (c) => c.n === 1],
  ["DIGIT_TWO", "Two", "2️⃣", 100000100, "The number two.", (c) => c.n === 2],
  ["DIGIT_THREE", "Three", "3️⃣", 100000100, "The number three.", (c) => c.n === 3],
  ["DIGIT_FOUR", "Four", "4️⃣", 100000100, "The number four.", (c) => c.n === 4],
  ["DIGIT_FIVE", "Five", "5️⃣", 100000100, "The number five.", (c) => c.n === 5],
  ["DIGIT_SIX", "Six", "6️⃣", 100000100, "The number six.", (c) => c.n === 6],
  ["DIGIT_SEVEN", "Seven", "7️⃣", 100000100, "The number seven.", (c) => c.n === 7],
  ["DIGIT_EIGHT", "Eight", "8️⃣", 100000100, "The number eight.", (c) => c.n === 8],
  ["DIGIT_NINE", "Nine", "9️⃣", 100000100, "The number nine.", (c) => c.n === 9],
  ["SIXTY_SEVEN_EXACT", "Exact Six-Seven", "🫠", 100000100, 'Exactly "67".', (c) => c.n === 67],
  ["EIGHTY_SIX_EXACT", "Exact Eighty-Six", "🍽️", 100000100, 'Exactly "86".', (c) => c.n === 86],
  ["ORIENTATION_EXACT", "Exact Orientation", "🧭", 100000100, 'Exactly "101".', (c) => c.n === 101],
  ["CALENDAR_EXACT", "Exact Calendar", "📅", 100000100, 'Exactly "365".', (c) => c.n === 365],
  ["BRAINROT", "Brainrot", "🫠", 100000100, 'Exactly "676767".', (c) => c.n === 676767],
  ["GROUNDHOG_DAY", "Groundhog Day", "📅", 100000100, 'Exactly "365365".', (c) => c.n === 365365],
  ["ONE_MILLION", "One Million", "🐐", 100000100, "The number one million.", (c) => c.n === 1000000],
  ["ERROR_EXACT", "Not Found", "🚫", 100000100, 'Exactly "404".', (c) => c.n === 404],
  ["FULL_DAY", "Full Day", "⏳", 100000100, "Seconds in a day: 86400.", (c) => c.n === 86400],
  ["FOOTBALL_17776", "17776", "🏈", 100000100, 'Exactly "17776".', (c) => c.n === 17776],
  ["INFERNAL", "Infernal", "🔱", 100000100, 'Exactly "666666".', (c) => c.n === 666666],
  ["ALWAYS", "Always", "♾️", 50000050, "24/7, 365.", (c) => c.s === "247365" || c.s === "365247"],
  ["ULTIMEME_EXACT", "Funny Number", "😂", 50000050, 'Exactly "69420" or "42069".', (c) => c.s === "69420" || c.s === "42069"],
  ["EXACT_BOOB", "Exact Boob", "🍈", 50000050, 'Exactly "8008" or "58008".', (c) => c.n === 8008 || c.n === 58008],

  // --- Powers / math ---
  ["THIRTEENTH_POWER", "13th Power", "💀", 33333367, "A perfect 13th power.", (c) => isPerfectPower(c.n, 13)],
  ["SEVENTEENTH_POWER", "17th Power", "🧙", 33333367, "A perfect 17th power.", (c) => isPerfectPower(c.n, 17)],
  ["NINETEENTH_POWER", "19th Power", "🌑", 33333367, "A perfect 19th power.", (c) => isPerfectPower(c.n, 19)],
  ["TAU", "Tau", "🌀", 33333367, "Exactly τ.", (c) => c.s === "6283" || c.s === "62831" || c.s === "628318"],
  ["GOLDEN_RATIO", "Golden Ratio", "🐚", 33333367, "Exactly φ.", (c) => c.s === "1618" || c.s === "16180" || c.s === "161803"],
  ["TENTH_POWER", "10th Power", "🔟", 25000025, "A perfect 10th power.", (c) => isPerfectPower(c.n, 10)],
  ["ELEVENTH_POWER", "11th Power", "🕚", 25000025, "A perfect 11th power.", (c) => isPerfectPower(c.n, 11)],
  ["PI", "Pi", "🥧", 25000025, "Exactly π.", (c) => [314, 3141, 31415, 314159].includes(c.n)],
  ["E", "Euler's Number", "📈", 25000025, "Exactly e.", (c) => [271, 2718, 27182, 271828].includes(c.n)],
  ["CONSEC_QUAD_EXACT", "4 Consecutive Numbers", "⛓️", 25000025, "Splits into 4 consecutive integers in order.", (c) => splitsIntoConsecutive(c.s, 4, true, false)],
  ["NINTH_POWER", "9th Power", "☁️", 20000020, "A perfect 9th power.", (c) => isPerfectPower(c.n, 9)],
  ["EIGHTH_POWER", "8th Power", "🎱", 16666683, "A perfect 8th power.", (c) => isPerfectPower(c.n, 8)],
  ["OUROBOROS", "Ouroboros", "🐍", 14285729, "n raised to itself.", (c) => [1, 4, 27, 256, 3125, 46656, 823543].includes(c.n)],
  ["SEVENTH_POWER", "7th Power", "🌈", 12500013, "A perfect 7th power.", (c) => isPerfectPower(c.n, 7)],
  ["POWER_OF_SEVEN", "Power of Seven", "7️⃣", 12500013, "A power of 7.", (c) => isPowerFromOne(c.n, 7)],
  ["FACTORIAL", "Factorial", "❗", 11111122, "A factorial number.", (c) => FACTORIALS.has(c.n)],
  ["POWER_OF_FIVE", "Power of Five", "5️⃣", 11111122, "A power of 5.", (c) => isPowerFromOne(c.n, 5)],
  ["HELLO", "Hello", "👋", 11111122, 'Contains "07734" (upside-down HELLO).', (c) => idxOfSub(c.s, "07734")],
  ["SEQUENCE_6", "Sequence (6)", "🔢", 11111122, "6 consecutive digits in a row.", (c) => hasDigitRunSequence(c.d, 6)],
  ["EON", "Eon", "🗿", 10000010, "Ends in five zeros.", (c) => c.s.endsWith("00000") && idxOfSuffix(c.s, 5)],
  ["CONTIGUOUS_SIXES", "Contiguous Sixes", "➖➖➖➖", 10000010, "Six identical digits in a row.", (c) => runRangeOfAtLeast(c.s, 6)],
  ["DEEP_VOID_FIVE", "Deep Void (5)", "⚫", 10000010, 'Contains "00000".', (c) => idxOfSub(c.s, "00000")],
  ["ONE_DIGIT", "Single Digit", "☝️", 10000010, "Exactly one digit.", (c) => c.len === 1],
  ["QUINT_NINE", "Quint Nine", "🥳", 10000010, "Ends in 99999.", (c) => c.s.endsWith("99999") && idxOfSuffix(c.s, 5)],
  ["SEMI_EON", "Semi-Eon", "🦴", 10000010, 'Ends in "50000".', (c) => c.s.endsWith("50000") && idxOfSuffix(c.s, 5)],
  ["SIXTH_POWER", "6th Power", "🎲", 9090918, "A perfect 6th power.", (c) => isPerfectPower(c.n, 6)],
  ["POWER_OF_THREE", "Power of Three", "🔺", 7692315, "A power of 3.", (c) => isPowerFromOne(c.n, 3)],
  ["FIFTH_POWER", "5th Power", "🖐️", 6250006, "A perfect 5th power.", (c) => isPerfectPower(c.n, 5)],
  ["JACKPOT_FIVE", "Jackpot Five", "💰💰💰", 5263163, "Five 7s in a row.", (c) => idxOfSub(c.s, "77777")],
  ["POWER_OF_TWO", "Power of Two", "💾", 5000005, "A power of 2.", (c) => c.n > 0 && (c.n & (c.n - 1)) === 0],
  ["ROYAL_FLUSH", "Royal Flush", "👑", 5000005, "Contains the highest straight, 56789.", (c) => idxOfSub(c.s, "56789")],
  ["BOOB_58008", "58008", "🔠", 5000005, 'Contains "58008".', (c) => idxOfSub(c.s, "58008")],
  ["BOOB_80085", "80085", "🅱️", 5000005, 'Contains "80085".', (c) => idxOfSub(c.s, "80085")],
  ["PI_CONTAINS_5", "Pi Slice (5)", "🥧", 5000005, 'Contains "31415".', (c) => idxOfSub(c.s, "31415")],
  ["E_CONTAINS_5", "E Slice (5)", "📈", 5000005, 'Contains "27182".', (c) => idxOfSub(c.s, "27182")],
  ["TAU_SLICE_5", "Tau Slice (5)", "🌀", 5000005, 'Contains "62831".', (c) => idxOfSub(c.s, "62831")],
  ["CASCADE", "Cascade", "🌊", 3333337, "Every digit is +1 from the last.", (c) => stepsBy(c.d, 1)],
  ["FIBONACCI", "Fibonacci Number", "🐚", 3333337, "A Fibonacci number.", (c) => FIBONACCI.has(c.n)],
  ["FOURTH_POWER", "4th Power", "📦", 3125003, "A perfect 4th power.", (c) => isPerfectPower(c.n, 4)],
  ["WATERFALL", "Waterfall", "🚿", 2857146, "Every digit is -1 from the last.", (c) => stepsBy(c.d, -1)],
  ["CONSEC_QUAD_CONTAINS", "4 Consecutive Numbers (Contains)", "🔗", 2631582, "Contains 4 adjacent consecutive integers.", (c) => consecutiveRunRange(c.s, 4, false)],
  ["CONSEC_QUAD_SCRAMBLED", "4 Consecutive Numbers (Scrambled)", "🔀", 2272730, "Splits into 4 consecutive integers, out of order.", (c) => splitsIntoConsecutive(c.s, 4, false, false)],
  ["HOMOGENEOUS", "Homogeneous", "🥛", 2222224, "Every digit is the same.", (c) => c.len >= 2 && c.distinct === 1],
  ["ULTIMEME", "Funny Numbers", "😂", 1666668, 'Contains both "69" and "420".', (c) => { const a = idxOfSub(c.s, "69"), b = idxOfSub(c.s, "420"); return a && b && [...new Set([...a, ...b])].sort((x, y) => x - y); }],
  ["BINARY_SOUL", "Binary Soul", "🤖", 1538463, "Only 0s and 1s.", (c) => /^[01]+$/.test(c.s)],
  ["STRAIGHT_FLUSH", "Straight Flush", "🃏", 1449277, "5 consecutive same-parity digits.", (c) => { for (const p of ["02468", "13579", "86420", "97531"]) { const idx = idxOfSub(c.s, p); if (idx) return idx; } return false; }],
  ["TWO_DIGITS", "Two Digits", "✌️", 1111112, "Exactly two digits.", (c) => c.len === 2],
  ["SPY", "Spy Number", "🕵️", 1030929, "Digit sum equals digit product.", (c) => c.n !== 1 && c.n !== 2 && c.sum === c.prod],
  ["EPOCH", "Epoch", "🏛️", 1000001, "Ends in four zeros.", (c) => c.s.endsWith("0000") && idxOfSuffix(c.s, 4)],
  ["QUAD_NINE", "Quad Nine", "🎊", 1000001, "Ends in 9999.", (c) => c.s.endsWith("9999") && idxOfSuffix(c.s, 4)],
  ["SEMI_EPOCH", "Semi-Epoch", "⌛", 1000001, 'Ends in "5000".', (c) => c.s.endsWith("5000") && idxOfSuffix(c.s, 4)],
  ["CUBE", "3rd Power", "🧊", 990100, "A perfect cube.", (c) => isPerfectPower(c.n, 3)],
  ["EVEN_SPACING", "Even Spacing", "📏", 862070, "Digits form an arithmetic sequence.", (c) => isConstantDiff(c.d, false)],

  // --- Epic ---
  ["CONSEC_TRIPLE_EXACT", "3 Consecutive Numbers", "⛓️", 555556, "Splits into 3 consecutive integers in order.", (c) => splitsIntoConsecutive(c.s, 3, true, false)],
  ["CONTIGUOUS_FIVES", "Contiguous Fives", "➖➖➖", 552487, "Five identical digits in a row.", (c) => runRangeOfAtLeast(c.s, 5)],
  ["DEEP_VOID_FOUR", "Deep Void (4)", "🌌", 552487, 'Contains "0000".', (c) => idxOfSub(c.s, "0000")],
  ["STROBOGRAMMATIC", "Strobogrammatic", "🙃", 502513, "Looks the same rotated 180°.", (c) => isStrobogrammatic(c.s)],
  ["STRAIGHT", "Straight", "📏", 454546, "5 consecutive digits, either direction.", (c) => hasDigitRunSequence(c.d, 5)],
  ["JACKPOT_FOUR", "Jackpot Four", "💰💰", 357143, "Four 7s in a row.", (c) => idxOfSub(c.s, "7777")],
  ["VERY_NICE", "Very Nice", "🥵", 334448, 'Contains "6969".', (c) => idxOfSub(c.s, "6969")],
  ["DEEPER_MEANING", "Deeper Meaning", "🌌", 334448, 'Contains "4242".', (c) => idxOfSub(c.s, "4242")],
  ["SIXTY_SEVEN_DOUBLE", "6767", "🫠", 334448, 'Contains "6767".', (c) => idxOfSub(c.s, "6767")],
  ["LEET", "Leet", "💻", 333334, 'Contains "1337".', (c) => idxOfSub(c.s, "1337")],
  ["HELL", "Hell", "🔥", 333334, 'Contains "7734".', (c) => idxOfSub(c.s, "7734")],
  ["BOOB_8008", "8008", "🔢", 333334, 'Contains "8008".', (c) => idxOfSub(c.s, "8008")],
  ["BIG_BROTHER", "Big Brother", "👁️", 333334, 'Contains "1984".', (c) => idxOfSub(c.s, "1984")],
  ["PI_CONTAINS_4", "Pi Slice (4)", "🥧", 333334, 'Contains "3141".', (c) => idxOfSub(c.s, "3141")],
  ["E_CONTAINS_4", "E Slice (4)", "📈", 333334, 'Contains "2718".', (c) => idxOfSub(c.s, "2718")],
  ["TAU_SLICE_4", "Tau Slice (4)", "🌀", 333334, 'Contains "6283".', (c) => idxOfSub(c.s, "6283")],
  ["CONSEC_TRIPLE_SCRAMBLED", "3 Consecutive Numbers (Scrambled)", "🔀", 277778, "Splits into 3 consecutive integers, out of order.", (c) => splitsIntoConsecutive(c.s, 3, false, false)],
  ["ZIPPER", "Zipper", "🤐", 246914, "Two digits alternating perfectly.", (c) => c.len >= 2 && c.distinct === 2 && c.d.every((x, i) => i === 0 || x !== c.d[i - 1])],
  ["ASCENSION", "Ascension", "📈", 219298, "Every digit is larger than the last.", (c) => isStrictAsc(c.d)],
  ["GEOMETRIC", "Crescendo", "🔊", 208334, "Splits into a geometric sequence.", (c) => hasGeometricSplit(c.s)],
  ["FIVE_OF_A_KIND", "Five of a Kind", "🃏", 198020, "Five identical digits.", (c) => idxWhereCount(c.s, c.counts, (n) => n >= 5)],
  ["CONSEC_TRIPLE_CONTAINS", "3 Consecutive Numbers (Contains)", "🔗", 157978, "Contains 3 adjacent consecutive integers.", (c) => consecutiveRunRange(c.s, 3, false)],
  ["CONTIGUOUS_THREE_PAIR", "Contiguous Three Pair", "👨‍👩‍👧‍👦👯", 154321, "Three adjacent contiguous pairs.", (c) => hasContiguousNPair(c.s, 3)],
  ["FRAMED_PAIR", "Framed Pair", "🖼️", 137174, "4 digits, matching middle pair, different ends.", (c) => c.len === 4 && c.d[1] === c.d[2] && c.d[0] !== c.d[1] && c.d[3] !== c.d[1]],
  ["FRAMED_TRIPLE", "Framed Triple", "🖼️🖼️", 137174, "A triple in the middle, framed by different digits.", (c) => c.len === 5 && c.d[1] === c.d[2] && c.d[2] === c.d[3] && c.d[0] !== c.d[1] && c.d[4] !== c.d[1]],
  ["FRAMED_QUAD", "Framed Quad", "🪟", 137174, "Four of a kind in the middle, framed by different digits.", (c) => c.len === 6 && c.d[1] === c.d[2] && c.d[2] === c.d[3] && c.d[3] === c.d[4] && c.d[0] !== c.d[1] && c.d[5] !== c.d[4]],
  ["DECAY", "Decay", "📉", 119474, "Every digit is smaller than the last.", (c) => isStrictDesc(c.d)],
  ["THREE_DIGITS", "Three Digits", "🤟", 111111, "Exactly three digits.", (c) => c.len === 3],
  ["ECHO", "Echo", "📣", 100100, "First half repeats as the second half.", (c) => c.len >= 2 && c.len % 2 === 0 && c.s.slice(0, c.len / 2) === c.s.slice(c.len / 2)],
  ["MILLENNIUM", "Millennium", "🗓️", 100000, "Ends in triple zeros.", (c) => c.s.endsWith("000") && idxOfSuffix(c.s, 3)],
  ["PRONIC", "Pronic Number", "🧮", 100000, "n × (n+1) for some integer n.", (c) => PRONICS.has(c.n)],
  ["TRIPLE_NINE", "Triple Nine", "🎉", 100000, "Ends in 999.", (c) => c.s.endsWith("999") && idxOfSuffix(c.s, 3)],
  ["SEMI_MILLENNIUM", "Semi-Millennium", "📜", 100000, 'Ends in "500".', (c) => c.s.endsWith("500") && idxOfSuffix(c.s, 3)],
  ["COLOSSAL", "Colossal", "🪨", 100000, "Greater than 999,000.", (c) => c.n > 999000],
  ["SQUARE", "2nd Power", "🟦", 99900, "A perfect square.", (c) => isPerfectPower(c.n, 2)],
  ["EVEN_SPACING_ABS", "Even Spacing (Absolute)", "📐", 90992, "Digits are evenly spaced by absolute value.", (c) => isConstantDiff(c.d, true)],
  ["FIREFLY", "Firefly", "🪲", 82237, "One unique digit among identical others.", (c) => isFirefly(c.len, c.distinct, c.counts) && idxWhereCount(c.s, c.counts, (n) => n === 1)],
  ["CONSEC_PAIR_EXACT", "2 Consecutive Numbers", "🔗", 50505, "Splits into two consecutive integers.", (c) => splitsIntoConsecutive(c.s, 2, null, true)],
  ["PALINDROME", "Palindrome", "🪞", 50025, "Reads the same forwards and backwards.", (c) => c.len >= 2 && c.s === [...c.s].reverse().join("")],

  // --- Rare ---
  ["CONTIGUOUS_QUADS", "Contiguous Quads", "➖➖", 37023, "Four identical digits in a row.", (c) => runRangeOfAtLeast(c.s, 4)],
  ["DEEP_VOID_THREE", "Deep Void (3)", "🌑", 37023, 'Contains "000".', (c) => idxOfSub(c.s, "000")],
  ["TURTLE", "Turtle", "🐢", 36049, "Consecutive digits differ by at most 1.", (c) => isTurtle(c.d)],
  ["SECRET_AGENT", "Secret Agent", "🕶️", 34614, 'Contains "007".', (c) => idxOfSub(c.s, "007")],
  ["HEAVY", "Heavy", "🧱", 33300, "Digit sum exceeds 45.", (c) => c.sum > 45],
  ["CONTIGUOUS_BOAT", "Contiguous Full House", "🏰", 30111, "A contiguous triple next to a contiguous pair.", (c) => hasContiguousFullHouse(c.s)],
  ["JACKPOT", "Jackpot", "💰", 27027, 'Contains "777".', (c) => idxOfSub(c.s, "777")],
  ["DEVIL", "Devil", "😈", 27027, 'Contains "666".', (c) => idxOfSub(c.s, "666")],
  ["SEQUENCE_4", "Sequence (4)", "🔢", 25907, "4 consecutive digits in a row.", (c) => hasDigitRunSequence(c.d, 4)],
  ["ERROR", "Error 404", "🚫", 25132, 'Contains "404".', (c) => idxOfSub(c.s, "404")],
  ["ORIENTATION", "Orientation", "🧭", 25132, 'Contains "101".', (c) => idxOfSub(c.s, "101")],
  ["BOTANIST", "Botanist", "🌿", 25006, 'Contains "420".', (c) => idxOfSub(c.s, "420")],
  ["EMERGENCY", "Emergency", "🚑", 25006, 'Contains "911".', (c) => idxOfSub(c.s, "911")],
  ["PI_CONTAINS_3", "Pi Slice (3)", "🥧", 25006, 'Contains "314".', (c) => idxOfSub(c.s, "314")],
  ["E_CONTAINS_3", "E Slice (3)", "📈", 25006, 'Contains "271".', (c) => idxOfSub(c.s, "271")],
  ["CALENDAR", "Calendar", "📅", 25006, 'Contains "365".', (c) => idxOfSub(c.s, "365")],
  ["DIVISIBLE_BY_THREE", "Divisible by Three", "🔺", 24414, "Every digit is divisible by 3.", (c) => c.d.every((x) => x % 3 === 0)],
  ["SCRAMBLE", "Scramble", "🔀", 22722, "All digits form a run when sorted.", (c) => c.len >= 2 && c.distinct === c.len && Math.max(...c.d) - Math.min(...c.d) === c.len - 1],
  ["DUALITY", "Duality", "☯️", 21654, "Exactly two different digits.", (c) => c.distinct === 2],
  ["STEPS", "Steps", "🪜", 20202, "Digits never decrease.", (c) => isNonDecreasing(c.d)],
  ["ARITHMETIC", "Metronome", "🎼", 17784, "Splits into 3+ numbers with a constant difference.", (c) => hasArithmeticSplit(c.s)],
  ["FRAMED_DOUBLE", "Framed Double", "🖼️🖼️🖼️", 15242, "Two pairs in the middle, framed by different digits.", (c) => c.len === 6 && c.d[1] === c.d[2] && c.d[3] === c.d[4] && c.d[1] !== c.d[3] && c.d[0] !== c.d[1] && c.d[5] !== c.d[4]],
  ["SLOPES", "Slopes", "🛝", 12582, "Digits never increase.", (c) => isNonIncreasing(c.d)],
  ["PAIRED_BOOKENDS", "Paired Bookends", "👐", 11122, "Starts with a pair, ends with a different pair.", (c) => c.len >= 4 && c.d[0] === c.d[1] && c.d[c.len - 1] === c.d[c.len - 2] && c.d[0] !== c.d[c.len - 1] && [0, 1, c.len - 2, c.len - 1]],
  ["FOUR_DIGITS", "Four Digits", "🍀", 11111, "Exactly four digits.", (c) => c.len === 4],
  ["THREE_PAIR", "Three Pair", "👯‍♀️👯", 10288, "Three digits that each appear exactly twice.", (c) => c.countExact(2) >= 3 && idxWhereCount(c.s, c.counts, (n) => n === 2)],
  ["BOOKENDS", "Bookends", "📚", 10010, "First two digits match the last two.", (c) => c.len >= 4 && c.s.slice(0, 2) === c.s.slice(-2) && [0, 1, c.len - 2, c.len - 1]],
  ["MIRROR_BOOKENDS", "Mirror Bookends", "📖", 10010, "First two digits, reversed, are the last two.", (c) => c.len >= 4 && c.d[0] === c.d[c.len - 1] && c.d[1] === c.d[c.len - 2] && [0, 1, c.len - 2, c.len - 1]],
  ["CENTURY", "Century", "💯", 10000, "Ends in double zeros.", (c) => c.s.endsWith("00") && idxOfSuffix(c.s, 2)],
  ["DOUBLE_NINE", "Double Nine", "🎈", 10000, "Ends in 99.", (c) => c.s.endsWith("99") && idxOfSuffix(c.s, 2)],
  ["QUARTER_CENTURY", "Quarter-Century", "🪙", 10000, 'Ends in "25".', (c) => c.s.endsWith("25") && idxOfSuffix(c.s, 2)],
  ["SEMI_CENTURY", "Semi-Century", "🗓️", 10000, 'Ends in "50".', (c) => c.s.endsWith("50") && idxOfSuffix(c.s, 2)],
  ["THREE_QUARTER_CENTURY", "Three-Quarter Century", "🕰️", 10000, 'Ends in "75".', (c) => c.s.endsWith("75") && idxOfSuffix(c.s, 2)],

  // --- Uncommon ---
  ["QUADS", "Four of a Kind", "🍀", 8436, "Four identical digits.", (c) => idxWhereCount(c.s, c.counts, (n) => n >= 4)],
  ["EQUATION", "Equation", "🟰", 7720, "Splits into a true equation with +, -, ×, or ÷.", (c) => hasEquation(c.s)],
  ["LOW_BALL", "Low Ball", "📉", 6400, "Only digits 0-4.", (c) => /^[0-4]+$/.test(c.s)],
  ["MOUNTAIN", "Mountain", "🏔️", 5885, "Digits rise to a peak, then fall.", (c) => mountainPivot(c.d)],
  ["DOUBLE_HOP", "Double Hop", "🦘🦘", 5321, "A digit appears at every other position, 3 times.", (c) => hasDoubleHop(c.s, c.len, c.distinct)],
  ["HIGH_ROLLER", "High Roller", "🤑", 5120, "Only digits 5-9.", (c) => /^[5-9]+$/.test(c.s)],
  ["VALLEY", "Valley", "🏜️", 4199, "Digits fall to a trough, then rise.", (c) => valleyPivot(c.d)],
  ["CONTIGUOUS_TWO_PAIR", "Contiguous Two Pair", "👨‍👩‍👧‍👦", 3957, "Two adjacent contiguous pairs.", (c) => hasContiguousNPair(c.s, 2)],
  ["MINI_ECHO", "Mini Echo", "🔂", 3704, "An adjacent 2-digit repeat.", (c) => { const m = /(\d\d)\1/.exec(c.s); return m && [m.index, m.index + 1, m.index + 2, m.index + 3]; }],
  ["ALTERNATOR", "Alternator", "⚡", 2845, "Digits strictly alternate even/odd.", (c) => isAlternatingParity(c.d)],
  ["FLUSH", "Flush", "🎨", 2845, "All digits are even, or all are odd.", (c) => isSameParity(c.d)],
  ["CONTIGUOUS_TRIPS", "Contiguous Trips", "➖", 2784, "Three identical digits in a row.", (c) => runRangeOfAtLeast(c.s, 3)],
  ["DEEP_VOID", "Deep Void", "🕳️", 2784, 'Contains "00".', (c) => idxOfSub(c.s, "00")],
  ["FEATHER", "Feather", "🪶", 2667, "Digit sum under 15.", (c) => c.sum < 15],
  ["BLACKJACK", "Blackjack", "♠️", 2521, "Digits sum to exactly 21.", (c) => c.sum === 21],
  ["BOAT", "Full House", "🏠", 2397, "A triple and a pair.", (c) => isFullHouse(c.counts) && idxWhereCount(c.s, c.counts, (n) => n >= 2)],
  ["POCKET_MIRROR", "Pocket Mirror", "🪞", 2124, "Contains a palindrome of 4+ digits.", (c) => substringPalindromeRange(c.s, 4)],
  ["SNAKE_EYES", "Snake Eyes", "🎲", 2121, "A single pair of 1s, no other pairs.", (c) => (c.counts[1] || 0) === 2 && Object.entries(c.counts).every(([k, v]) => k === "1" || v < 2) && idxOfAllDigit(c.s, "1")],
  ["NICE", "Nice", "😏", 2024, 'Contains "69".', (c) => idxOfSub(c.s, "69")],
  ["MEANING", "Meaning of Life", "🌌", 2024, 'Contains "42".', (c) => idxOfSub(c.s, "42")],
  ["SIXTY_SEVEN", "Six-Seven", "🫠", 2024, 'Contains "67".', (c) => idxOfSub(c.s, "67")],
  ["EIGHTY_SIX", "Eighty-Six", "🍽️", 2024, 'Contains "86".', (c) => idxOfSub(c.s, "86")],
  ["BALANCED", "Balanced", "⚖️", 1959, "First half's digit sum equals the second half's.", (c) => {
    if (c.len < 2 || c.len % 2 !== 0) return false;
    const h = c.len / 2;
    let a = 0, b = 0;
    for (let i = 0; i < h; i++) { a += c.d[i]; b += c.d[h + i]; }
    return a === b;
  }],
  ["RHYME", "Rhyme", "🎶", 1872, "The same substring appears twice, non-overlapping.", (c) => rhymeRange(c.s)],
  ["SEQUENCE_3", "Sequence (3)", "🔢", 1716, "3 consecutive digits in a row.", (c) => hasDigitRunSequence(c.d, 3)],
  ["CONSEC_PAIR_ADJACENT", "2 Consecutive Numbers (Contains)", "🔗", 1659, "Two adjacent substrings that are consecutive integers.", (c) => adjacentConsecutivePairRange(c.s)],
  ["CONSEC_PAIR_NEARBY", "2 Consecutive Numbers (Nearby)", "🔗", 1575, "Two substrings elsewhere that are consecutive integers.", (c) => nearbyConsecutivePairRange(c.s)],
  ["MESA", "Mesa", "🗻", 1568, "Rises to a peak, then falls (flats allowed).", (c) => isMesa(c.d)],
  ["PRIME", "Prime Number", "💎", 1274, "Divisible only by 1 and itself.", (c) => isPrime(c.n)],
  ["TRINITY", "Trinity", "⚜️", 1265, "Exactly three different digits.", (c) => c.distinct === 3],
  ["DOZEN", "Dozen", "🍩", 1200, "Divisible by 12.", (c) => c.n > 0 && c.n % 12 === 0],
  ["CANYON", "Canyon", "🌄", 1184, "Falls to a floor, then rises (flats allowed).", (c) => isCanyon(c.d)],
  ["FIVE_DIGITS", "Five Digits", "🖐️", 1111, "Exactly five digits.", (c) => c.len === 5],
  ["ELEVEN", "Eleven", "🕚", 1100, "Divisible by 11.", (c) => c.n > 0 && c.n % 11 === 0],
  ["HARSHAD", "Harshad Number", "🤝", 1048, "Divisible by its own digit sum.", (c) => c.sum > 0 && c.n % c.sum === 0],
  ["CLEAN", "Clean", "🧼", 1000, "Ends in a zero.", (c) => c.s.endsWith("0") && idxOfSuffix(c.s, 1)],

  // --- Common ---
  ["SEMI_CLEAN", "Semi-Clean", "🧹", 999, "Ends in a 5.", (c) => c.s.endsWith("5") && idxOfSuffix(c.s, 1)],
  ["EQUILIBRIUM", "Equilibrium", "🧘", 999, "First and last digits match.", (c) => c.len >= 2 && c.d[0] === c.d[c.len - 1] && [0, c.len - 1]],
  ["SANDWICH", "Sandwich", "🥪", 999, "First/last digits match, with a different one between.", (c) => c.len >= 3 && c.d[0] === c.d[c.len - 1] && c.d.slice(1, -1).some((x) => x !== c.d[0]) && [0, c.len - 1]],
  ["HILLS", "Hills", "🏞️", 733, "Digits strictly zigzag up and down.", (c) => c.len >= 4 && isHills(c.d)],
  ["DUNES", "Dunes", "🐫", 700, "Rises and falls keep alternating (flats allowed).", (c) => isDunes(c.d)],
  ["TRIPS", "Three of a Kind", "🎰", 724, "A digit that appears exactly three times.", (c) => idxWhereCount(c.s, c.counts, (n) => n === 3)],
  ["LUCKY_SEVEN_DIV", "Lucky Seven (Divisible)", "🎰", 700, "Divisible by 7.", (c) => c.n > 0 && c.n % 7 === 0],
  ["HETEROGENEOUS", "Heterogeneous", "🥗", 593, "No repeated digits.", (c) => c.distinct === c.len],
  ["MINI_SCRAMBLE", "Mini Scramble", "🧩", 579, "3+ adjacent digits form a run when sorted.", (c) => hasMiniScramble(c.d)],
  ["GAP_ONE", "Gap One", "↕️", 529, "First and last digits differ by exactly 1.", (c) => c.len >= 2 && Math.abs(c.d[0] - c.d[c.len - 1]) === 1 && [0, c.len - 1]],
  ["TWO_PAIR", "Two Pair", "👯‍♀️", 377, "Two digits that each appear twice or more.", (c) => c.withCount(2) >= 2 && idxWhereCount(c.s, c.counts, (n) => n >= 2)],
  ["HOPSCOTCH", "Hopscotch", "🦘", 312, "A digit appears at every other position, twice.", (c) => hasHopscotch(c.s, c.len, c.distinct)],
  ["GHOST", "Ghost", "👻", 309, 'Contains exactly one "0".', (c) => (c.counts[0] || 0) === 1 && idxOfDigit(c.s, "0")],
  ["QUARTET", "Quartet", "🎻", 290, "Exactly four different digits.", (c) => c.distinct === 4],
  ["HYDROGEN", "Hydrogen (1)", "💧", 282, 'Contains exactly one "1".', (c) => (c.counts[1] || 0) === 1 && idxOfDigit(c.s, "1")],
  ["HELIUM", "Helium (2)", "🎈", 282, 'Contains exactly one "2".', (c) => (c.counts[2] || 0) === 1 && idxOfDigit(c.s, "2")],
  ["CARBON", "Carbon (6)", "✏️", 282, 'Contains exactly one "6".', (c) => (c.counts[6] || 0) === 1 && idxOfDigit(c.s, "6")],
  ["OXYGEN", "Oxygen (8)", "💨", 282, 'Contains exactly one "8".', (c) => (c.counts[8] || 0) === 1 && idxOfDigit(c.s, "8")],
  ["LITHIUM", "Lithium (3)", "🔋", 282, 'Contains exactly one "3".', (c) => (c.counts[3] || 0) === 1 && idxOfDigit(c.s, "3")],
  ["BERYLLIUM", "Beryllium (4)", "💎", 282, 'Contains exactly one "4".', (c) => (c.counts[4] || 0) === 1 && idxOfDigit(c.s, "4")],
  ["BORON", "Boron (5)", "🧼", 282, 'Contains exactly one "5".', (c) => (c.counts[5] || 0) === 1 && idxOfDigit(c.s, "5")],
  ["NITROGEN", "Nitrogen (7)", "❄️", 282, 'Contains exactly one "7".', (c) => (c.counts[7] || 0) === 1 && idxOfDigit(c.s, "7")],
  ["FLUORINE", "Fluorine (9)", "🦷", 282, 'Contains exactly one "9".', (c) => (c.counts[9] || 0) === 1 && idxOfDigit(c.s, "9")],
  ["GROUNDED", "Grounded", "⚓", 250, "First digit is smaller than the last.", (c) => c.len >= 2 && c.d[0] < c.d[c.len - 1] && [0, c.len - 1]],
  ["CONTIGUOUS_PAIR", "Contiguous Pair", "🫂", 249, "A contiguous pair of matching digits.", (c) => { const m = /(\d)\1/.exec(c.s); return m && [m.index, m.index + 1]; }],
  ["LUCKY_7", "Lucky Seven", "7️⃣", 213, 'Contains the digit "7".', (c) => idxOfSub(c.s, "7")],
  ["EVEN", "Even", "⚖️", 200, "Divisible by 2.", (c) => c.n % 2 === 0],
  ["ODD", "Odd", "🦄", 200, "Not divisible by 2.", (c) => c.n % 2 === 1],
  ["LIFTOFF", "Liftoff", "🚀", 200, "First digit is larger than the last.", (c) => c.len >= 2 && c.d[0] > c.d[c.len - 1] && [0, c.len - 1]],
  ["VOID", "Void", "🕳️", 167, "Contains no zeros.", (c) => !c.has("0")],
  ["NEIGHBORS", "Neighbors", "🏘️", 161, "Two adjacent digits differ by exactly 1.", (c) => { for (let i = 0; i + 1 < c.len; i++) if (Math.abs(c.d[i] - c.d[i + 1]) === 1) return [i, i + 1]; return false; }],
  ["PAIR", "Pair", "👯", 120, "Contains a pair of matching digits.", (c) => idxWhereCount(c.s, c.counts, (n) => n >= 2)],
  ["SIX_DIGITS", "Six Digits", "🐝", 111, "Exactly six digits.", (c) => c.len === 6],
];

// ---------------------------------------------------------------------------
// Supersession families: within each family only the highest-EP earned badge
// scores; the rest still display as earned but contribute 0 EP, since the
// stronger badge already implies them.
// ---------------------------------------------------------------------------

const FAMILIES = [
  ["THIRTEENTH_POWER", "SEVENTEENTH_POWER", "NINETEENTH_POWER", "TENTH_POWER", "ELEVENTH_POWER", "NINTH_POWER", "EIGHTH_POWER", "SEVENTH_POWER", "SIXTH_POWER", "FIFTH_POWER", "FOURTH_POWER", "CUBE", "SQUARE", "OUROBOROS"],
  ["DIGIT_ZERO", "DIGIT_ONE", "DIGIT_TWO", "DIGIT_THREE", "DIGIT_FOUR", "DIGIT_FIVE", "DIGIT_SIX", "DIGIT_SEVEN", "DIGIT_EIGHT", "DIGIT_NINE", "ONE_DIGIT"],
  ["CONSEC_QUAD_EXACT", "CONSEC_QUAD_CONTAINS", "CONSEC_QUAD_SCRAMBLED", "CONSEC_TRIPLE_EXACT", "CONSEC_TRIPLE_SCRAMBLED", "CONSEC_TRIPLE_CONTAINS", "CONSEC_PAIR_EXACT", "CONSEC_PAIR_ADJACENT", "CONSEC_PAIR_NEARBY"],
  ["SEQUENCE_6", "CASCADE", "WATERFALL", "EVEN_SPACING", "EVEN_SPACING_ABS", "TURTLE", "SEQUENCE_4", "SCRAMBLE", "SEQUENCE_3", "GEOMETRIC", "ARITHMETIC", "MINI_SCRAMBLE"],
  ["CONTIGUOUS_THREE_PAIR", "FRAMED_PAIR", "FRAMED_DOUBLE", "THREE_PAIR", "CONTIGUOUS_TWO_PAIR", "TWO_PAIR", "CONTIGUOUS_PAIR", "PAIR"],
  ["EXACT_BOOB_80085", "EXACT_BOOB", "BOOB_58008", "BOOB_80085", "BOOB_8008"],
  ["BOTANIST_EXACT", "MEANING_EXACT", "HOTBOX", "BOTANIST", "MEANING"],
  ["JACKPOT_EXACT", "JACKPOT_SIX", "JACKPOT_FIVE", "JACKPOT_FOUR", "JACKPOT"],
  ["CONTIGUOUS_SIXES", "CONTIGUOUS_FIVES", "CONTIGUOUS_QUADS", "CONTIGUOUS_TRIPS"],
  ["E", "E_CONTAINS_5", "E_CONTAINS_4", "E_CONTAINS_3"],
  ["NICE_EXACT", "VERY_VERY_NICE", "VERY_NICE", "NICE"],
  ["QUINT_NINE", "QUAD_NINE", "TRIPLE_NINE", "DOUBLE_NINE"],
  ["PI", "PI_CONTAINS_5", "PI_CONTAINS_4", "PI_CONTAINS_3"],
  ["SIXTY_SEVEN_EXACT", "BRAINROT", "SIXTY_SEVEN_DOUBLE", "SIXTY_SEVEN"],
  ["DEEP_VOID_FIVE", "DEEP_VOID_FOUR", "DEEP_VOID_THREE", "DEEP_VOID"],
  ["PAIRED_BOOKENDS", "BOOKENDS", "MIRROR_BOOKENDS"],
  ["CALENDAR_EXACT", "GROUNDHOG_DAY", "CALENDAR", "ALWAYS"],
  ["EMERGENCY_EXACT", "MAYDAY", "EMERGENCY"],
  ["FRAMED_TRIPLE", "FRAMED_QUAD", "QUADS", "FIVE_OF_A_KIND", "TRIPS"],
  ["ROYAL_FLUSH", "STRAIGHT_FLUSH", "STRAIGHT"],
  ["BIG_BROTHER_EXACT", "BIG_BROTHER"],
  ["CONTIGUOUS_BOAT", "BOAT"],
  ["DEVIL_EXACT", "INFERNAL", "DEVIL"],
  ["FIREFLY", "DUALITY"],
  ["EIGHTY_SIX_EXACT", "EIGHTY_SIX"],
  ["EQUILIBRIUM", "SANDWICH"],
  ["EXACT_HELL", "HELL"],
  ["DOUBLE_HOP", "HOPSCOTCH"],
  ["LEET_EXACT", "LEET"],
  ["UNIVERSAL_ANSWER", "DEEPER_MEANING"],
  ["ASCENSION", "DECAY", "STEPS", "SLOPES"],
  ["ORIENTATION_EXACT", "ORIENTATION"],
  ["MOUNTAIN", "VALLEY", "MESA", "CANYON"],
  ["MINI_ECHO", "RHYME"],
  ["ERROR_EXACT", "ERROR"],
  ["HILLS", "DUNES"],
  ["PALINDROME", "POCKET_MIRROR"],
  ["TAU", "TAU_SLICE_5", "TAU_SLICE_4"],
  ["ULTIMEME_EXACT", "ULTIMEME"],
];

const RARITY_THRESHOLDS = { common: 1e3, uncommon: 1e4, rare: 1e5, epic: 1e6, anomaly: 1e7 };

function rarityFromEp(ep) {
  const t = RARITY_THRESHOLDS;
  return ep < t.common ? "common"
    : ep < t.uncommon ? "uncommon"
    : ep < t.rare ? "rare"
    : ep < t.epic ? "epic"
    : ep < t.anomaly ? "anomaly"
    : "mythic";
}

// Overall roll tier — how a whole roll's total EP compares to every other
// possible roll, via percentiles.js's exact full-range percentile table.
// Different from a single badge's own rarity (rarityFromEp above): a roll's
// tier is driven by its rank against all 1,000,001 possible outcomes, not a
// fixed EP cutoff.
const ROLL_TIER_THRESHOLDS = { trash: 1, common: 50, uncommon: 75, rare: 90, epic: 95, anomaly: 99 };
const ROLL_TIER_INFO = {
  trash: { emoji: "🗑️", label: "Trash Roll" },
  common: { emoji: "⬜", label: "Common Roll" },
  uncommon: { emoji: "🟩", label: "Uncommon Roll" },
  rare: { emoji: "🟦", label: "Rare Roll" },
  epic: { emoji: "🟪", label: "Epic Roll" },
  anomaly: { emoji: "🟧", label: "Anomaly Roll" },
  mythic: { emoji: "🟥", label: "Mythic Roll" },
};

function tierFromPercentile(pct) {
  const t = ROLL_TIER_THRESHOLDS;
  return pct < t.trash ? "trash"
    : pct < t.common ? "common"
    : pct < t.uncommon ? "uncommon"
    : pct < t.rare ? "rare"
    : pct < t.epic ? "epic"
    : pct < t.anomaly ? "anomaly"
    : "mythic";
}

const BADGE_INDEX = Object.fromEntries(BADGES.map((b) => [b[0], b]));

// Returns { n, digits, len, ep, count, badges }.
// `badges` is the top-level list (sorted by EP desc); each entry carries
// `positions` (which digit indices earned it) and `children` — badges from the
// same supersession family that also matched but scored 0 EP, nested beneath
// the family's winner the way the real game shows them as "(earned)".
function evaluateRoll(n) {
  const ctx = buildContext(n);
  const all = [];
  for (const [id, name, emoji, ep, description, test] of BADGES) {
    let result;
    try { result = test(ctx); } catch { result = false; }
    if (!result) continue;
    const positions = Array.isArray(result)
      ? [...new Set(result)].sort((a, b) => a - b)
      : Array.from({ length: ctx.len }, (_, i) => i);
    all.push({ id, name, emoji, ep, rarity: rarityFromEp(ep), description, positions });
  }

  const superseded = new Set();
  const childrenOf = new Map();
  for (const fam of FAMILIES) {
    const members = all.filter((b) => fam.includes(b.id));
    if (members.length < 2) continue;
    let top = members[0];
    for (const b of members) if (b.ep > top.ep) top = b;
    const losers = members.filter((b) => b !== top);
    losers.forEach((b) => { b.ep = 0; superseded.add(b.id); });
    childrenOf.set(top.id, [...(childrenOf.get(top.id) || []), ...losers]);
  }

  const badges = all
    .filter((b) => !superseded.has(b.id))
    .map((b) => ({ ...b, children: childrenOf.get(b.id) || [] }))
    .sort((a, b) => b.ep - a.ep);

  const ep = all.reduce((sum, b) => sum + b.ep, 0);
  return { n, digits: ctx.s, len: ctx.len, ep, count: all.length, badges };
}
