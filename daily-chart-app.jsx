import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';
import {
  Home, BarChart3, Calendar, History as HistoryIcon, Lightbulb, Bell,
  Sparkles, Check, ChevronLeft, ChevronRight, ChevronDown, Trash2,
  Award, TrendingDown, TrendingUp, Flame, AlertCircle, CheckCircle2
} from 'lucide-react';

// ============================================================
// CONSTANTS
// ============================================================
const SECTION_META = {
  amritvela:     { title: 'Amritvela',           sanskrit: 'अमृतवेला',       subtitle: 'The nectar hour of dawn' },
  avyaktMurli:   { title: 'Avyakt Murli',        sanskrit: 'अव्यक्त मुरली',    subtitle: 'The subtle elevated versions' },
  sakarMurli:    { title: 'Sakar Murli',         sanskrit: 'साकार मुरली',     subtitle: 'The corporeal teachings' },
  karmYogi:      { title: 'Karm Yogi Awareness', sanskrit: 'कर्मयोगी',         subtitle: 'Remembrance through the day' },
  companionship: { title: 'Companionship of Baba', sanskrit: 'बाबा का साथ',   subtitle: 'Father, Teacher, Preceptor' },
  swarajya:      { title: 'Swarajya Adhikari',   sanskrit: 'स्वराज्य अधिकारी', subtitle: 'Sovereign over self' },
  sewa:          { title: 'Sewa',                sanskrit: 'सेवा',             subtitle: 'Service through thought, word, deed' }
};
const SECTION_ORDER = ['amritvela','avyaktMurli','sakarMurli','karmYogi','companionship','swarajya','sewa'];

// ============================================================
// STORAGE (window.storage with localStorage fallback)
// ============================================================
const ENTRIES_KEY = 'entries:all';
const SETTINGS_KEY = 'settings:user';

const hasWindowStorage = typeof window !== 'undefined' && window.storage;

async function loadEntries() {
  try {
    if (hasWindowStorage) {
      const r = await window.storage.get(ENTRIES_KEY).catch(() => null);
      return r ? JSON.parse(r.value) : {};
    }
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
async function saveEntries(all) {
  try {
    if (hasWindowStorage) await window.storage.set(ENTRIES_KEY, JSON.stringify(all));
    else localStorage.setItem(ENTRIES_KEY, JSON.stringify(all));
  } catch {}
}
async function loadSettings() {
  try {
    if (hasWindowStorage) {
      const r = await window.storage.get(SETTINGS_KEY).catch(() => null);
      if (r) return JSON.parse(r.value);
    } else {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    }
  } catch {}
  return { reminderTime: '21:45', remindersEnabled: true, userName: '' };
}
async function saveSettings(s) {
  try {
    if (hasWindowStorage) await window.storage.set(SETTINGS_KEY, JSON.stringify(s));
    else localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {}
}

// ============================================================
// HELPERS
// ============================================================
const todayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const emptyEntry = (date) => ({
  date,
  amritvela: { wakeTime: '', goodMorningBaba: false, swaman: false, meditated: false, rating: 0, note: '' },
  avyaktMurli: { attended: false, pointTaken: '', rating: 0, note: '' },
  sakarMurli: { session: 'Not attended', stithi: '', rating: 0, note: '' },
  karmYogi: { brahminCount: 0, angelCount: 0, kingCount: 0, rating: 0, note: '' },
  companionship: { asFather: false, asTeacher: false, asPreceptor: false, rating: 0, note: '' },
  swarajya: { mansa: 0, vacha: 0, karmana: 0, rating: 0, note: '' },
  sewa: { mansa: '', vacha: '', karmana: '', rating: 0, note: '' },
  updatedAt: Date.now()
});

const sectionScores = (e) => ({
  amritvela: e.amritvela.rating, avyaktMurli: e.avyaktMurli.rating, sakarMurli: e.sakarMurli.rating,
  karmYogi: e.karmYogi.rating, companionship: e.companionship.rating, swarajya: e.swarajya.rating, sewa: e.sewa.rating
});
const totalScore = (e) => SECTION_ORDER.reduce((s,k) => s + (sectionScores(e)[k] || 0), 0);
const dailyPercentage = (e) => Math.round((totalScore(e) / 35) * 100);
const isWeekend = (d) => { const x = new Date(d + 'T00:00:00').getDay(); return x === 0 || x === 6; };

function autoSuggestRatings(entry) {
  const e = JSON.parse(JSON.stringify(entry));
  if (e.amritvela.rating === 0) {
    let r = 0;
    if (e.amritvela.wakeTime && e.amritvela.wakeTime <= '04:30') r += 2;
    else if (e.amritvela.wakeTime && e.amritvela.wakeTime <= '05:30') r += 1;
    if (e.amritvela.goodMorningBaba) r += 1;
    if (e.amritvela.swaman) r += 1;
    if (e.amritvela.meditated) r += 1;
    e.amritvela.rating = Math.min(5, r);
  }
  if (e.avyaktMurli.rating === 0) {
    let r = 0;
    if (e.avyaktMurli.attended) r += 3;
    if (e.avyaktMurli.pointTaken.trim()) r += 2;
    e.avyaktMurli.rating = Math.min(5, r);
  }
  if (e.sakarMurli.rating === 0) {
    let r = 0;
    if (e.sakarMurli.session !== 'Not attended') r += 3;
    if (e.sakarMurli.stithi.trim()) r += 2;
    e.sakarMurli.rating = Math.min(5, r);
  }
  if (e.karmYogi.rating === 0) {
    const sum = e.karmYogi.brahminCount + e.karmYogi.angelCount + e.karmYogi.kingCount;
    e.karmYogi.rating = sum >= 30 ? 5 : sum >= 20 ? 4 : sum >= 10 ? 3 : sum >= 5 ? 2 : sum >= 1 ? 1 : 0;
  }
  if (e.companionship.rating === 0) {
    let r = 0;
    if (e.companionship.asFather) r += 2;
    if (e.companionship.asTeacher) r += 2;
    if (e.companionship.asPreceptor) r += 1;
    e.companionship.rating = Math.min(5, r);
  }
  if (e.swarajya.rating === 0) {
    const avg = (e.swarajya.mansa + e.swarajya.vacha + e.swarajya.karmana) / 3;
    e.swarajya.rating = Math.round(avg * 10) / 10;
  }
  if (e.sewa.rating === 0) {
    let r = 0;
    if (e.sewa.mansa.trim()) r += 2;
    if (e.sewa.vacha.trim()) r += 2;
    if (e.sewa.karmana.trim()) r += 1;
    e.sewa.rating = Math.min(5, r);
  }
  return e;
}

function getDateRange(days, endDate = new Date()) {
  const arr = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(endDate);
    d.setDate(d.getDate() - i);
    arr.push(todayKey(d));
  }
  return arr;
}

function computeInsights(entries) {
  if (entries.length === 0) return null;
  const totals = {};
  SECTION_ORDER.forEach(k => totals[k] = { sum: 0, n: 0 });
  let totalSum = 0, wkdSum = 0, wkdN = 0, wknSum = 0, wknN = 0;
  entries.forEach(e => {
    const sc = sectionScores(e);
    SECTION_ORDER.forEach(k => { totals[k].sum += sc[k]; totals[k].n += 1; });
    const t = totalScore(e);
    totalSum += t;
    if (isWeekend(e.date)) { wknSum += t; wknN += 1; } else { wkdSum += t; wkdN += 1; }
  });
  const avgs = SECTION_ORDER.map(k => ({ key: k, avg: totals[k].n ? totals[k].sum / totals[k].n : 0 }));
  const sorted = [...avgs].sort((a, b) => b.avg - a.avg);
  const best = sorted[0], weakest = sorted[sorted.length - 1];
  const avgScore = totalSum / entries.length;
  const avgPercent = Math.round((avgScore / 35) * 100);
  const weekdayAvg = wkdN ? wkdSum / wkdN : 0;
  const weekendAvg = wknN ? wknSum / wknN : 0;

  const sortedDates = [...entries].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const k = todayKey(d);
    if (sortedDates.find(e => e.date === k)) streak++; else break;
  }

  const bTitle = SECTION_META[best.key].title;
  const wTitle = SECTION_META[weakest.key].title;
  let insightLine;
  if (avgPercent >= 80) insightLine = `Your ${bTitle} radiates strength. Continue this elevated stage — and bring the same depth to ${wTitle}.`;
  else if (avgPercent >= 60) insightLine = `${bTitle} is your foundation. ${wTitle} needs more frequent remembrance tomorrow.`;
  else if (weekendAvg > 0 && weekdayAvg > 0 && Math.abs(weekendAvg - weekdayAvg) > 5)
    insightLine = weekendAvg > weekdayAvg
      ? `Your weekend stage is stronger — bring that same stability into weekdays.`
      : `Weekdays carry better consistency. Hold the discipline through weekends too.`;
  else if (avgPercent >= 40) insightLine = `${bTitle} shines through. Strengthen ${wTitle} with one small intentional act tomorrow.`;
  else insightLine = `Each day is a fresh dawn. Begin tomorrow with Amritvela and let the chart unfold gently.`;

  return { avgScore, avgPercent, bestSection: best, weakestSection: weakest, weekdayAvg, weekendAvg, streak, insightLine };
}

// ============================================================
// REMINDER
// ============================================================
let reminderTimeoutId = null;
function showReminder() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try { new Notification('Daily Chart', { body: 'Time to review your divine chart. How was your day?', tag: 'daily-chart-reminder' }); } catch {}
}
function scheduleReminder(timeHHMM, enabled) {
  if (reminderTimeoutId !== null) { clearTimeout(reminderTimeoutId); reminderTimeoutId = null; }
  if (!enabled) return;
  const [h, m] = timeHHMM.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return;
  const now = new Date();
  const next = new Date(now);
  next.setHours(h, m, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  const delay = next.getTime() - now.getTime();
  reminderTimeoutId = window.setTimeout(() => {
    showReminder();
    scheduleReminder(timeHHMM, enabled);
  }, delay);
}

// ============================================================
// SHARED STYLE TOKENS (inline so this works without Tailwind config)
// ============================================================
const styles = {
  ivory: '#fdfaf3', ivoryDeep: '#fefdfb',
  gold50: '#fdfaf3', gold100: '#faf3e0', gold200: '#f3e4b6', gold300: '#e9cf86',
  gold400: '#dfb95c', gold500: '#c9a04a', gold600: '#a87f37', gold700: '#85622d', gold800: '#5f4621',
  ink900: '#1a1612', ink800: '#2d2620', ink700: '#4a3f33', ink600: '#6b5d4d', ink500: '#8b7d6b',
};

// ============================================================
// UI PRIMITIVES
// ============================================================
const Card = ({ children, className = '', style = {} }) => (
  <div
    className={`rounded-2xl p-5 md:p-6 ${className}`}
    style={{
      background: 'linear-gradient(180deg, #ffffff 0%, #fefdfb 100%)',
      border: '1px solid rgba(201, 160, 74, 0.12)',
      boxShadow: '0 1px 2px rgba(26, 22, 18, 0.04), 0 4px 16px -4px rgba(168, 127, 55, 0.08)',
      animation: 'slideUp 0.5s ease-out',
      ...style
    }}
  >
    {children}
  </div>
);

const SectionHeader = ({ title, sanskrit, subtitle, index }) => (
  <div className="mb-4">
    <div className="flex items-baseline gap-3 flex-wrap">
      {index !== undefined && (
        <span style={{ fontFamily: 'Cormorant Garamond, serif', color: styles.gold500, opacity: 0.7, fontSize: 14 }}>
          {String(index).padStart(2, '0')}
        </span>
      )}
      <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, color: styles.ink900, letterSpacing: '-0.01em' }}>
        {title}
      </h2>
      {sanskrit && (
        <span className="hidden sm:inline" style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: styles.gold600, fontSize: 18 }}>
          {sanskrit}
        </span>
      )}
    </div>
    {subtitle && (
      <p className="mt-1" style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: styles.ink500 }}>
        {subtitle}
      </p>
    )}
  </div>
);

const Slider = ({ value, onChange, label }) => {
  const pct = (value / 5) * 100;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: styles.ink500 }}>
          {label || 'Rating'}
        </span>
        <div className="flex items-baseline gap-1">
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 30, color: styles.gold600, lineHeight: 1 }}>
            {value.toFixed(value % 1 === 0 ? 0 : 1)}
          </span>
          <span style={{ fontSize: 12, color: styles.ink500 }}>/ 5</span>
        </div>
      </div>
      <input
        type="range" min={0} max={5} step={1} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="sacred-slider w-full"
        style={{
          background: `linear-gradient(to right, ${styles.gold500} 0%, ${styles.gold500} ${pct}%, ${styles.gold200} ${pct}%, ${styles.gold200} 100%)`
        }}
      />
      <div className="flex justify-between px-1" style={{ fontSize: 10, color: styles.ink500 }}>
        {[0, 1, 2, 3, 4, 5].map(n => <span key={n}>{n}</span>)}
      </div>
    </div>
  );
};

const Toggle = ({ checked, onChange, label }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className="flex items-center justify-between w-full text-left p-3 rounded-xl"
    style={{
      background: checked ? styles.gold50 : 'white',
      border: `1px solid ${checked ? styles.gold300 : 'rgba(26, 22, 18, 0.05)'}`,
      transition: 'all 0.15s',
      boxShadow: checked ? '0 4px 24px -8px rgba(168, 127, 55, 0.12)' : 'none',
      cursor: 'pointer'
    }}
  >
    <span style={{ fontSize: 14, color: checked ? styles.ink900 : styles.ink700, fontWeight: checked ? 500 : 400 }}>
      {label}
    </span>
    <span
      style={{
        position: 'relative', width: 40, height: 24, borderRadius: 999,
        background: checked ? styles.gold500 : 'rgba(26, 22, 18, 0.1)', transition: 'background 0.15s'
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 18 : 2, width: 20, height: 20,
        background: 'white', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'left 0.15s'
      }} />
    </span>
  </button>
);

const TextLine = ({ value, onChange, placeholder, label }) => (
  <div>
    {label && (
      <label className="block mb-1.5" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: styles.ink500 }}>
        {label}
      </label>
    )}
    <input
      type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl"
      style={{
        background: 'white', border: '1px solid rgba(26, 22, 18, 0.05)',
        color: styles.ink900, fontSize: 15, outline: 'none', transition: 'border 0.15s'
      }}
      onFocus={e => e.target.style.border = `1px solid ${styles.gold400}`}
      onBlur={e => e.target.style.border = '1px solid rgba(26, 22, 18, 0.05)'}
    />
  </div>
);

const Counter = ({ value, onChange, label }) => (
  <div className="flex items-center justify-between p-3 rounded-xl"
    style={{ background: 'white', border: '1px solid rgba(26, 22, 18, 0.05)' }}>
    <span style={{ fontSize: 14, color: styles.ink700 }}>{label}</span>
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))}
        className="rounded-full flex items-center justify-center"
        style={{ width: 32, height: 32, background: styles.gold50, color: styles.gold700, fontSize: 18, lineHeight: 1, cursor: 'pointer', border: 'none' }}
      >−</button>
      <span className="text-center" style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: styles.ink900, minWidth: 24 }}>
        {value}
      </span>
      <button type="button" onClick={() => onChange(value + 1)}
        className="rounded-full flex items-center justify-center"
        style={{ width: 32, height: 32, background: styles.gold50, color: styles.gold700, fontSize: 18, lineHeight: 1, cursor: 'pointer', border: 'none' }}
      >+</button>
    </div>
  </div>
);

const SegmentedControl = ({ value, options, onChange }) => (
  <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(250, 243, 224, 0.5)' }}>
    {options.map(opt => (
      <button key={opt} type="button" onClick={() => onChange(opt)}
        className="flex-1 px-3 py-2 rounded-lg"
        style={{
          fontSize: 12,
          background: value === opt ? 'white' : 'transparent',
          color: value === opt ? styles.ink900 : styles.ink600,
          fontWeight: value === opt ? 500 : 400,
          boxShadow: value === opt ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
          cursor: 'pointer', border: 'none', transition: 'all 0.15s'
        }}
      >{opt}</button>
    ))}
  </div>
);

const DivineDivider = ({ children }) => (
  <div className="flex items-center gap-3 my-6" style={{ color: styles.gold500 }}>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${styles.gold300}, transparent)` }} />
    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 14 }}>{children || '✦'}</span>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${styles.gold300}, transparent)` }} />
  </div>
);

// ============================================================
// SECTION EDITORS
// ============================================================
const AmritvelaSection = ({ value, onChange }) => (
  <div className="space-y-4">
    <div>
      <label className="block mb-1.5" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: styles.ink500 }}>
        Time I woke up
      </label>
      <input type="time" value={value.wakeTime} onChange={e => onChange({ ...value, wakeTime: e.target.value })}
        className="px-4 py-3 rounded-xl"
        style={{ background: 'white', border: '1px solid rgba(26,22,18,0.05)', color: styles.ink900, fontFamily: 'Cormorant Garamond, serif', fontSize: 18, outline: 'none' }} />
    </div>
    <Toggle checked={value.goodMorningBaba} onChange={v => onChange({ ...value, goodMorningBaba: v })} label="Said Good Morning to Baba" />
    <Toggle checked={value.swaman} onChange={v => onChange({ ...value, swaman: v })} label="Gave myself Swaman" />
    <Toggle checked={value.meditated} onChange={v => onChange({ ...value, meditated: v })} label="Meditated and received God's power" />
    <Slider value={value.rating} onChange={r => onChange({ ...value, rating: r })} />
  </div>
);

const AvyaktMurliSection = ({ value, onChange }) => (
  <div className="space-y-4">
    <Toggle checked={value.attended} onChange={v => onChange({ ...value, attended: v })} label="Attended Avyakt Murli class" />
    <TextLine label="One point I took for myself" value={value.pointTaken} onChange={v => onChange({ ...value, pointTaken: v })} placeholder="A single line..." />
    <Slider value={value.rating} onChange={r => onChange({ ...value, rating: r })} />
  </div>
);

const SakarMurliSection = ({ value, onChange }) => (
  <div className="space-y-4">
    <div>
      <label className="block mb-1.5" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: styles.ink500 }}>Attended</label>
      <SegmentedControl value={value.session} options={['Morning', 'Afternoon', 'Evening', 'Not attended']} onChange={v => onChange({ ...value, session: v })} />
    </div>
    <TextLine label="Stithi of Godly Student" value={value.stithi} onChange={v => onChange({ ...value, stithi: v })} placeholder="My stage / state today..." />
    <Slider value={value.rating} onChange={r => onChange({ ...value, rating: r })} />
  </div>
);

const KarmYogiSection = ({ value, onChange }) => (
  <div className="space-y-3">
    <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: styles.ink500, marginBottom: 8 }}>
      How many times did I remember…
    </p>
    <Counter label="I am a Brahmin" value={value.brahminCount} onChange={v => onChange({ ...value, brahminCount: v })} />
    <Counter label="I am an Angel" value={value.angelCount} onChange={v => onChange({ ...value, angelCount: v })} />
    <Counter label="I will become a king in the Golden Age" value={value.kingCount} onChange={v => onChange({ ...value, kingCount: v })} />
    <Slider value={value.rating} onChange={r => onChange({ ...value, rating: r })} />
  </div>
);

const CompanionshipSection = ({ value, onChange }) => (
  <div className="space-y-3">
    <Toggle checked={value.asFather} onChange={v => onChange({ ...value, asFather: v })} label="Experienced Baba as Father" />
    <Toggle checked={value.asTeacher} onChange={v => onChange({ ...value, asTeacher: v })} label="Experienced Baba as Teacher" />
    <Toggle checked={value.asPreceptor} onChange={v => onChange({ ...value, asPreceptor: v })} label="Experienced Baba as Supreme Preceptor" />
    <Slider value={value.rating} onChange={r => onChange({ ...value, rating: r })} />
  </div>
);

const SwarajyaSection = ({ value, onChange }) => (
  <div className="space-y-5">
    <Slider label="Mansa · Control over thoughts" value={value.mansa} onChange={v => onChange({ ...value, mansa: v })} />
    <Slider label="Vacha · Control over speech" value={value.vacha} onChange={v => onChange({ ...value, vacha: v })} />
    <Slider label="Karmana · Control over actions" value={value.karmana} onChange={v => onChange({ ...value, karmana: v })} />
    <div className="pt-2" style={{ borderTop: `1px solid ${styles.gold100}` }}>
      <Slider label="Overall" value={value.rating} onChange={r => onChange({ ...value, rating: r })} />
    </div>
  </div>
);

const SewaSection = ({ value, onChange }) => (
  <div className="space-y-3">
    <TextLine label="Mansa Sewa · service through thought" value={value.mansa} onChange={v => onChange({ ...value, mansa: v })} placeholder="Pure thoughts sent..." />
    <TextLine label="Vacha Sewa · service through word" value={value.vacha} onChange={v => onChange({ ...value, vacha: v })} placeholder="Words of light..." />
    <TextLine label="Karmana Sewa · service through action" value={value.karmana} onChange={v => onChange({ ...value, karmana: v })} placeholder="An act of service..." />
    <Slider value={value.rating} onChange={r => onChange({ ...value, rating: r })} />
  </div>
);

// ============================================================
// PAGES
// ============================================================
function HomePage({ entries, setEntries }) {
  const key = todayKey();
  const entry = entries[key] || emptyEntry(key);
  const [savedFlash, setSavedFlash] = useState(false);

  const updateEntry = (updater) => {
    const next = typeof updater === 'function' ? updater(entry) : updater;
    const updated = { ...next, updatedAt: Date.now() };
    setEntries(prev => ({ ...prev, [key]: updated }));
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1200);
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return 'In the depth of night';
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    if (h < 21) return 'Good evening';
    return 'Time to review';
  }, []);

  const dateLong = useMemo(() => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }), []);
  const score = totalScore(entry);
  const pct = dailyPercentage(entry);

  return (
    <div className="space-y-5">
      <div className="text-center pt-2 pb-6">
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.25em', color: styles.gold600, marginBottom: 12 }}>{dateLong}</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 38, color: styles.ink900, lineHeight: 1.1 }}>
          {greeting}.
        </h1>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: styles.ink600, fontSize: 18, marginTop: 8 }}>
          Time to review your divine chart.
        </p>
        <DivineDivider>✦</DivineDivider>

        <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
          <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="70" cy="70" r="60" fill="none" stroke={styles.gold200} strokeWidth="8" />
            <circle cx="70" cy="70" r="60" fill="none" stroke="url(#scoreGrad)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 60} strokeDashoffset={2 * Math.PI * 60 * (1 - pct / 100)}
              style={{ transition: 'stroke-dashoffset 0.7s' }} />
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={styles.gold400} />
                <stop offset="100%" stopColor={styles.gold600} />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 38, color: styles.ink900, lineHeight: 1 }}>
              {score.toFixed(score % 1 === 0 ? 0 : 1)}
            </div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: styles.ink500, marginTop: 4 }}>of 35</div>
            <div style={{ fontSize: 12, color: styles.gold700, fontWeight: 500, marginTop: 4 }}>{pct}%</div>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          <button onClick={() => updateEntry(autoSuggestRatings(entry))}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: styles.gold50, border: `1px solid ${styles.gold200}`, color: styles.gold800, fontSize: 13, cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = styles.gold100}
            onMouseLeave={e => e.currentTarget.style.background = styles.gold50}
          >
            <Sparkles size={14} />
            Auto-suggest ratings from my answers
          </button>
        </div>

        {savedFlash && (
          <div className="mt-3 inline-flex items-center gap-1.5" style={{ fontSize: 11, color: styles.gold700 }}>
            <Check size={12} /> Saved
          </div>
        )}
      </div>

      {SECTION_ORDER.map((key, idx) => {
        const meta = SECTION_META[key];
        return (
          <Card key={key}>
            <SectionHeader title={meta.title} sanskrit={meta.sanskrit} subtitle={meta.subtitle} index={idx + 1} />
            {key === 'amritvela' && <AmritvelaSection value={entry.amritvela} onChange={v => updateEntry({ ...entry, amritvela: v })} />}
            {key === 'avyaktMurli' && <AvyaktMurliSection value={entry.avyaktMurli} onChange={v => updateEntry({ ...entry, avyaktMurli: v })} />}
            {key === 'sakarMurli' && <SakarMurliSection value={entry.sakarMurli} onChange={v => updateEntry({ ...entry, sakarMurli: v })} />}
            {key === 'karmYogi' && <KarmYogiSection value={entry.karmYogi} onChange={v => updateEntry({ ...entry, karmYogi: v })} />}
            {key === 'companionship' && <CompanionshipSection value={entry.companionship} onChange={v => updateEntry({ ...entry, companionship: v })} />}
            {key === 'swarajya' && <SwarajyaSection value={entry.swarajya} onChange={v => updateEntry({ ...entry, swarajya: v })} />}
            {key === 'sewa' && <SewaSection value={entry.sewa} onChange={v => updateEntry({ ...entry, sewa: v })} />}
          </Card>
        );
      })}

      <div className="text-center py-8" style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: styles.gold700, fontSize: 14 }}>
        Om Shanti · ॐ शान्ति
      </div>
    </div>
  );
}

function DashboardPage({ entries }) {
  const [range, setRange] = useState('15d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const dateList = useMemo(() => {
    if (range === '7d') return getDateRange(7);
    if (range === '15d') return getDateRange(15);
    if (range === '30d') return getDateRange(30);
    if (range === 'month') {
      const n = new Date();
      const last = new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate();
      const arr = [];
      for (let d = 1; d <= last; d++) arr.push(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
      return arr;
    }
    if (range === 'custom' && customStart && customEnd) {
      const s = new Date(customStart), e = new Date(customEnd);
      if (s > e) return [];
      const arr = [];
      const cur = new Date(s);
      while (cur <= e) { arr.push(todayKey(cur)); cur.setDate(cur.getDate() + 1); }
      return arr;
    }
    return [];
  }, [range, customStart, customEnd]);

  const chartData = useMemo(() => dateList.map(d => {
    const e = entries[d];
    return {
      date: d,
      label: new Date(d + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
      score: e ? totalScore(e) : 0, hasEntry: !!e
    };
  }), [dateList, entries]);

  const filled = useMemo(() => dateList.map(d => entries[d]).filter(Boolean), [dateList, entries]);
  const insights = useMemo(() => computeInsights(filled), [filled]);

  const sectionAvgs = useMemo(() => SECTION_ORDER.map(k => {
    let sum = 0, n = 0;
    filled.forEach(e => { sum += sectionScores(e)[k]; n++; });
    return { key: k, title: SECTION_META[k].title.split(' ')[0], avg: n ? sum / n : 0 };
  }), [filled]);

  return (
    <div className="space-y-5">
      <div className="text-center py-2">
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.25em', color: styles.gold600 }}>Performance</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, color: styles.ink900 }}>Dashboard</h1>
        <DivineDivider>✦</DivineDivider>
      </div>

      <Card>
        <div className="flex flex-wrap gap-2">
          {[['7d','Last 7 days'],['15d','Fortnight'],['30d','Last 30 days'],['month','This month'],['custom','Custom']].map(([k, label]) => (
            <button key={k} onClick={() => setRange(k)}
              className="px-3 py-1.5 rounded-full"
              style={{
                fontSize: 13,
                background: range === k ? styles.gold500 : styles.gold50,
                color: range === k ? 'white' : styles.ink700,
                boxShadow: range === k ? '0 4px 24px -8px rgba(168, 127, 55, 0.12)' : 'none',
                cursor: 'pointer', border: 'none', transition: 'all 0.15s'
              }}
            >{label}</button>
          ))}
        </div>
        {range === 'custom' && (
          <div className="mt-4 flex flex-wrap gap-3 items-center">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="px-3 py-2 rounded-lg"
              style={{ border: `1px solid ${styles.gold200}`, background: 'white', color: styles.ink900 }} />
            <span style={{ fontSize: 13, color: styles.ink500 }}>to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="px-3 py-2 rounded-lg"
              style={{ border: `1px solid ${styles.gold200}`, background: 'white', color: styles.ink900 }} />
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Average" value={insights ? `${insights.avgPercent}%` : '—'} subtle={insights ? `${insights.avgScore.toFixed(1)} / 35` : 'No entries'} />
        <StatCard label="Streak" value={insights ? `${insights.streak}` : '0'} subtle="consecutive days" icon={<Flame size={14} style={{ color: styles.gold600 }} />} />
        <StatCard label="Weekday" value={insights && insights.weekdayAvg > 0 ? insights.weekdayAvg.toFixed(1) : '—'} subtle="avg score" />
        <StatCard label="Weekend" value={insights && insights.weekendAvg > 0 ? insights.weekendAvg.toFixed(1) : '—'} subtle="avg score" />
      </div>

      <Card>
        <SectionHeader title="Daily Score" subtitle="Trend over the selected range" />
        <div style={{ height: 256 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke={styles.gold200} vertical={false} />
              <XAxis dataKey="label" stroke={styles.ink500} fontSize={10} interval="preserveStartEnd" />
              <YAxis stroke={styles.ink500} fontSize={10} domain={[0, 35]} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="score" stroke={styles.gold600} strokeWidth={2.5}
                dot={{ r: 3, fill: styles.gold400, stroke: styles.gold600, strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <SectionHeader title="By Section" subtitle="Average rating per area" />
        <div style={{ height: 288 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectionAvgs} margin={{ top: 10, right: 10, left: -16, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 6" stroke={styles.gold200} vertical={false} />
              <XAxis dataKey="title" stroke={styles.ink500} fontSize={10} angle={-25} textAnchor="end" height={50} />
              <YAxis stroke={styles.ink500} fontSize={10} domain={[0, 5]} />
              <Tooltip cursor={{ fill: 'rgba(201, 160, 74, 0.05)' }}
                contentStyle={{ borderRadius: 12, border: `1px solid ${styles.gold300}`, background: styles.ivoryDeep, fontSize: 12 }} />
              <Bar dataKey="avg" radius={[8, 8, 0, 0]}>
                {sectionAvgs.map((d, i) => {
                  const r = d.avg / 5;
                  const color = r > 0.7 ? styles.gold600 : r > 0.4 ? styles.gold400 : styles.gold200;
                  return <Cell key={i} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {insights && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <div className="flex items-start gap-3">
              <div className="rounded-full flex items-center justify-center" style={{ width: 40, height: 40, background: styles.gold100 }}>
                <Award size={18} style={{ color: styles.gold700 }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: styles.ink500 }}>Best performing</p>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: styles.ink900, marginTop: 2 }}>
                  {SECTION_META[insights.bestSection.key].title}
                </p>
                <p style={{ fontSize: 12, color: styles.ink600, marginTop: 4 }}>
                  Average {insights.bestSection.avg.toFixed(1)} / 5
                </p>
              </div>
              <TrendingUp size={16} style={{ color: styles.gold600 }} />
            </div>
          </Card>
          <Card>
            <div className="flex items-start gap-3">
              <div className="rounded-full flex items-center justify-center" style={{ width: 40, height: 40, background: 'rgba(26,22,18,0.05)' }}>
                <TrendingDown size={18} style={{ color: styles.ink700 }} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: styles.ink500 }}>Needs attention</p>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: styles.ink900, marginTop: 2 }}>
                  {SECTION_META[insights.weakestSection.key].title}
                </p>
                <p style={{ fontSize: 12, color: styles.ink600, marginTop: 4 }}>
                  Average {insights.weakestSection.avg.toFixed(1)} / 5
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {insights && (
        <Card style={{ background: `linear-gradient(135deg, ${styles.gold50}, ${styles.ivoryDeep})` }}>
          <div className="flex items-start gap-3">
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 38, color: styles.gold500, lineHeight: 1 }}>"</div>
            <div>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: styles.gold700, marginBottom: 4 }}>Insight of the period</p>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 19, color: styles.ink900, lineHeight: 1.3 }}>
                {insights.insightLine}
              </p>
            </div>
          </div>
        </Card>
      )}

      {insights && (insights.weekdayAvg > 0 || insights.weekendAvg > 0) && (
        <Card>
          <SectionHeader title="Weekday vs Weekend" subtitle="Consistency across the week" />
          <div className="space-y-4">
            {[{ label: 'Weekdays', val: insights.weekdayAvg }, { label: 'Weekends', val: insights.weekendAvg }].map(r => (
              <div key={r.label}>
                <div className="flex justify-between mb-1.5" style={{ fontSize: 13 }}>
                  <span style={{ color: styles.ink700 }}>{r.label}</span>
                  <span style={{ color: styles.ink900, fontWeight: 500 }}>{r.val.toFixed(1)} / 35</span>
                </div>
                <div style={{ height: 12, borderRadius: 999, background: styles.gold100, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', width: `${Math.min(100, (r.val / 35) * 100)}%`,
                    background: `linear-gradient(to right, ${styles.gold300}, ${styles.gold500})`,
                    borderRadius: 999, transition: 'width 0.7s'
                  }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, subtle, icon }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: styles.ink500 }}>{label}</p>
        {icon}
      </div>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 30, color: styles.ink900, marginTop: 6, lineHeight: 1 }}>{value}</p>
      {subtle && <p style={{ fontSize: 11, color: styles.ink500, marginTop: 4 }}>{subtle}</p>}
    </Card>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'white', padding: '8px 12px', borderRadius: 12, border: `1px solid ${styles.gold300}`, fontSize: 12, boxShadow: '0 4px 24px -8px rgba(168, 127, 55, 0.12)' }}>
      <div style={{ color: styles.ink700, fontWeight: 500 }}>{d.label}</div>
      <div style={{ color: styles.gold700, marginTop: 2 }}>Score: <span style={{ fontWeight: 600 }}>{d.score}</span> / 35</div>
      {!d.hasEntry && <div style={{ color: styles.ink500, fontSize: 10, marginTop: 2, fontStyle: 'italic' }}>No entry</div>}
    </div>
  );
}

function MonthlyPage({ entries }) {
  const [refDate, setRefDate] = useState(() => new Date());
  const { days, monthLabel, monthAvg, daysWithEntry } = useMemo(() => {
    const y = refDate.getFullYear(), m = refDate.getMonth();
    const last = new Date(y, m + 1, 0).getDate();
    const firstDay = new Date(y, m, 1).getDay();
    const arr = [];
    for (let i = 0; i < firstDay; i++) arr.push(null);
    let sum = 0, n = 0;
    for (let d = 1; d <= last; d++) {
      const k = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const e = entries[k];
      const sc = e ? totalScore(e) : 0;
      if (e) { sum += sc; n++; }
      arr.push({ date: k, day: d, score: sc, hasEntry: !!e });
    }
    return {
      days: arr,
      monthLabel: refDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }),
      monthAvg: n > 0 ? sum / n : 0, daysWithEntry: n
    };
  }, [refDate, entries]);

  const colorFor = (score, hasEntry) => {
    if (!hasEntry) return { bg: '#fdfaf3', color: 'rgba(139, 125, 107, 0.5)', border: 'rgba(26,22,18,0.05)' };
    const p = score / 35;
    if (p >= 0.8) return { bg: styles.gold500, color: 'white', border: styles.gold600 };
    if (p >= 0.6) return { bg: styles.gold400, color: 'white', border: styles.gold500 };
    if (p >= 0.4) return { bg: styles.gold300, color: styles.ink900, border: styles.gold400 };
    if (p >= 0.2) return { bg: styles.gold200, color: styles.ink800, border: styles.gold300 };
    return { bg: styles.gold100, color: styles.ink700, border: styles.gold200 };
  };

  const shiftMonth = (delta) => {
    const n = new Date(refDate); n.setDate(1); n.setMonth(n.getMonth() + delta);
    setRefDate(n);
  };

  return (
    <div className="space-y-5">
      <div className="text-center py-2">
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.25em', color: styles.gold600 }}>Reflection</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, color: styles.ink900 }}>Monthly Chart</h1>
        <DivineDivider>✦</DivineDivider>
      </div>

      <Card>
        <div className="flex items-center justify-between mb-5">
          <button onClick={() => shiftMonth(-1)} className="rounded-full flex items-center justify-center"
            style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = styles.gold50}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <ChevronLeft size={18} style={{ color: styles.ink700 }} />
          </button>
          <div className="text-center">
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, color: styles.ink900 }}>{monthLabel}</h2>
            <p style={{ fontSize: 11, color: styles.ink500, marginTop: 2 }}>
              {daysWithEntry} {daysWithEntry === 1 ? 'day' : 'days'} recorded · avg {monthAvg.toFixed(1)} / 35
            </p>
          </div>
          <button onClick={() => shiftMonth(1)} className="rounded-full flex items-center justify-center"
            style={{ width: 36, height: 36, background: 'transparent', border: 'none', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.background = styles.gold50}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <ChevronRight size={18} style={{ color: styles.ink700 }} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1.5 mb-2">
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} className="text-center py-1" style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: styles.ink500 }}>
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d, i) => d === null ? (
            <div key={`e-${i}`} style={{ aspectRatio: '1/1' }} />
          ) : (
            <div key={d.date} className="rounded-lg flex flex-col items-center justify-center"
              style={{
                aspectRatio: '1/1',
                background: colorFor(d.score, d.hasEntry).bg,
                color: colorFor(d.score, d.hasEntry).color,
                border: `1px solid ${colorFor(d.score, d.hasEntry).border}`,
                transition: 'transform 0.15s', cursor: 'default'
              }}
              title={d.hasEntry ? `${d.date}: ${d.score}/35` : `${d.date}: no entry`}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, lineHeight: 1 }}>{d.day}</span>
              {d.hasEntry && (
                <span style={{ fontSize: 9, marginTop: 2, opacity: 0.8 }}>{d.score}</span>
              )}
            </div>
          ))}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2" style={{ fontSize: 10, color: styles.ink500 }}>
          <span>Low</span>
          <div className="flex gap-0.5">
            {[styles.gold100, styles.gold200, styles.gold300, styles.gold400, styles.gold500].map(c => (
              <div key={c} style={{ width: 16, height: 16, borderRadius: 4, background: c }} />
            ))}
          </div>
          <span>High</span>
        </div>
      </Card>
    </div>
  );
}

function HistoryPage({ entries, setEntries }) {
  const [openDate, setOpenDate] = useState(null);
  const sorted = useMemo(() => Object.values(entries).sort((a, b) => b.date.localeCompare(a.date)), [entries]);

  const remove = (date) => {
    if (!confirm(`Delete entry for ${date}? This cannot be undone.`)) return;
    setEntries(prev => {
      const next = { ...prev };
      delete next[date];
      return next;
    });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `daily-chart-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="text-center py-2">
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.25em', color: styles.gold600 }}>Reflection</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, color: styles.ink900 }}>History</h1>
        <DivineDivider>✦</DivineDivider>
      </div>

      <div className="flex justify-between items-center">
        <p style={{ fontSize: 14, color: styles.ink600 }}>{sorted.length} {sorted.length === 1 ? 'entry' : 'entries'} recorded</p>
        {sorted.length > 0 && (
          <button onClick={exportJson} className="px-3 py-1.5 rounded-full"
            style={{ fontSize: 12, background: styles.gold50, color: styles.gold800, border: `1px solid ${styles.gold200}`, cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = styles.gold100}
            onMouseLeave={e => e.currentTarget.style.background = styles.gold50}
          >Export JSON</button>
        )}
      </div>

      {sorted.length === 0 ? (
        <Card>
          <p className="text-center py-8" style={{ color: styles.ink500, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>
            No entries yet. Begin today's review on the Home page.
          </p>
        </Card>
      ) : (
        sorted.map(e => {
          const isOpen = openDate === e.date;
          const score = totalScore(e);
          const scores = sectionScores(e);
          const d = new Date(e.date + 'T00:00:00');
          return (
            <Card key={e.date} style={{ padding: 0, overflow: 'hidden' }}>
              <button onClick={() => setOpenDate(isOpen ? null : e.date)}
                className="w-full p-5 flex items-center justify-between text-left"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(250, 243, 224, 0.3)'}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
              >
                <div>
                  <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, color: styles.ink900 }}>
                    {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p style={{ fontSize: 11, color: styles.ink500, marginTop: 2 }}>
                    Score {score} / 35 · {Math.round((score / 35) * 100)}%
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-full flex items-center justify-center"
                    style={{ width: 56, height: 56, background: `linear-gradient(135deg, ${styles.gold50}, ${styles.gold100})`, border: `1px solid ${styles.gold200}` }}>
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, color: styles.gold800 }}>{score}</span>
                  </div>
                  <ChevronDown size={18} style={{ color: styles.ink500, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 pt-4" style={{ borderTop: `1px solid ${styles.gold100}` }}>
                  <div className="space-y-2">
                    {SECTION_ORDER.map(k => (
                      <div key={k} className="flex items-center gap-3">
                        <span style={{ fontSize: 13, color: styles.ink700, flex: 1 }}>{SECTION_META[k].title}</span>
                        <div style={{ flex: 1, height: 8, borderRadius: 999, background: styles.gold100, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', width: `${(scores[k] / 5) * 100}%`,
                            background: `linear-gradient(to right, ${styles.gold300}, ${styles.gold500})`, borderRadius: 999
                          }} />
                        </div>
                        <span style={{ fontSize: 13, color: styles.ink900, fontWeight: 500, width: 32, textAlign: 'right' }}>
                          {scores[k].toFixed(scores[k] % 1 === 0 ? 0 : 1)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {e.amritvela.wakeTime && <Highlight label="Woke up at" value={e.amritvela.wakeTime} />}
                    <Highlight label="Murli" value={e.sakarMurli.session} />
                    {e.avyaktMurli.pointTaken && <Highlight label="Point taken" value={e.avyaktMurli.pointTaken} />}
                    {e.sakarMurli.stithi && <Highlight label="Stithi" value={e.sakarMurli.stithi} />}
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button onClick={() => remove(e.date)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                      style={{ fontSize: 12, color: 'rgba(220, 38, 38, 0.8)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(254, 226, 226, 0.5)'}
                      onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}

function Highlight({ label, value }) {
  return (
    <div style={{ background: 'rgba(250, 243, 224, 0.5)', borderRadius: 8, padding: '8px 12px' }}>
      <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: styles.ink500 }}>{label}</p>
      <p style={{ fontSize: 13, color: styles.ink800, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</p>
    </div>
  );
}

function InsightsPage({ entries }) {
  const all = useMemo(() => Object.values(entries), [entries]);
  const last7 = useMemo(() => getDateRange(7).map(d => entries[d]).filter(Boolean), [entries]);
  const last15 = useMemo(() => getDateRange(15).map(d => entries[d]).filter(Boolean), [entries]);
  const last30 = useMemo(() => getDateRange(30).map(d => entries[d]).filter(Boolean), [entries]);
  const week = computeInsights(last7), fortnight = computeInsights(last15), month = computeInsights(last30), lifetime = computeInsights(all);

  const progress = useMemo(() => {
    const recent7 = getDateRange(7).map(d => entries[d]).filter(Boolean);
    const prev7End = new Date(); prev7End.setDate(prev7End.getDate() - 7);
    const prev7 = getDateRange(7, prev7End).map(d => entries[d]).filter(Boolean);
    return SECTION_ORDER.map(k => {
      const avg = arr => arr.length === 0 ? 0 : arr.reduce((s, e) => s + sectionScores(e)[k], 0) / arr.length;
      const rec = avg(recent7), old = avg(prev7);
      return { key: k, recent: rec, old, delta: rec - old };
    });
  }, [entries]);

  return (
    <div className="space-y-5">
      <div className="text-center py-2">
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.25em', color: styles.gold600 }}>Wisdom</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, color: styles.ink900 }}>Insights</h1>
        <DivineDivider>✦</DivineDivider>
      </div>

      <Card style={{ background: `linear-gradient(135deg, ${styles.gold50}, ${styles.ivoryDeep})` }}>
        <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: styles.gold700, marginBottom: 12 }}>
          Reflection across periods
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PeriodCell title="Week" pct={week?.avgPercent} n={last7.length} />
          <PeriodCell title="Fortnight" pct={fortnight?.avgPercent} n={last15.length} />
          <PeriodCell title="Month" pct={month?.avgPercent} n={last30.length} />
          <PeriodCell title="All time" pct={lifetime?.avgPercent} n={all.length} />
        </div>
      </Card>

      {fortnight && (
        <Card>
          <SectionHeader title="Insight of the Fortnight" subtitle="A reflection on the past 15 days" />
          <div className="flex items-start gap-3">
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 42, color: styles.gold500, lineHeight: 1 }}>"</div>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 19, color: styles.ink900, lineHeight: 1.3 }}>
              {fortnight.insightLine}
            </p>
          </div>
        </Card>
      )}

      {fortnight && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: styles.gold700 }}>Strongest area</p>
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, color: styles.ink900, marginTop: 4 }}>
              {SECTION_META[fortnight.bestSection.key].title}
            </h3>
            <p style={{ fontSize: 13, color: styles.ink600, fontStyle: 'italic', marginTop: 4 }}>
              {SECTION_META[fortnight.bestSection.key].subtitle}
            </p>
            <div className="mt-4 flex items-baseline gap-2">
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 38, color: styles.gold700 }}>
                {fortnight.bestSection.avg.toFixed(1)}
              </span>
              <span style={{ color: styles.ink500, fontSize: 13 }}>/ 5 average</span>
            </div>
          </Card>
          <Card>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: styles.ink500 }}>Needs attention</p>
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, color: styles.ink900, marginTop: 4 }}>
              {SECTION_META[fortnight.weakestSection.key].title}
            </h3>
            <p style={{ fontSize: 13, color: styles.ink600, fontStyle: 'italic', marginTop: 4 }}>
              {SECTION_META[fortnight.weakestSection.key].subtitle}
            </p>
            <div className="mt-4 flex items-baseline gap-2">
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 38, color: styles.ink700 }}>
                {fortnight.weakestSection.avg.toFixed(1)}
              </span>
              <span style={{ color: styles.ink500, fontSize: 13 }}>/ 5 average</span>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <SectionHeader title="Week-over-week" subtitle="Last 7 days vs the 7 days before" />
        <div className="space-y-3">
          {progress.map(p => {
            const up = p.delta > 0.15, down = p.delta < -0.15;
            return (
              <div key={p.key} className="flex items-center gap-3">
                <span style={{ fontSize: 13, color: styles.ink700, flex: 1 }}>{SECTION_META[p.key].title}</span>
                <span style={{ fontSize: 11, color: styles.ink500, width: 36, textAlign: 'right' }}>{p.old.toFixed(1)}</span>
                <span style={{ color: 'rgba(139, 125, 107, 0.6)' }}>→</span>
                <span style={{ fontSize: 11, color: styles.ink900, fontWeight: 500, width: 36, textAlign: 'right' }}>{p.recent.toFixed(1)}</span>
                <span style={{ fontSize: 11, fontWeight: 500, width: 44, textAlign: 'right',
                  color: up ? '#15803d' : down ? 'rgba(220, 38, 38, 0.85)' : styles.ink500 }}>
                  {p.delta > 0 ? '+' : ''}{p.delta.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {all.length === 0 && (
        <Card>
          <p className="text-center py-8" style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: styles.ink500 }}>
            Insights will unfold as you record your daily chart.
          </p>
        </Card>
      )}
    </div>
  );
}

function PeriodCell({ title, pct, n }) {
  return (
    <div className="text-center">
      <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: styles.ink500 }}>{title}</p>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 30, color: styles.ink900, marginTop: 4, lineHeight: 1 }}>
        {pct !== undefined ? `${pct}%` : '—'}
      </p>
      <p style={{ fontSize: 10, color: styles.ink500, marginTop: 4 }}>{n} {n === 1 ? 'day' : 'days'}</p>
    </div>
  );
}

function SettingsPage({ settings, setSettings }) {
  const [perm, setPerm] = useState(() => 'Notification' in window ? Notification.permission : 'unsupported');
  const [savedFlash, setSavedFlash] = useState(false);
  const PRESETS = ['09:00', '21:00', '21:45', '22:00', '22:30'];

  useEffect(() => {
    setSavedFlash(true);
    const t = setTimeout(() => setSavedFlash(false), 1200);
    return () => clearTimeout(t);
  }, [settings]);

  const enableNotifications = async () => {
    if (!('Notification' in window)) return;
    const r = await Notification.requestPermission();
    setPerm(r);
    if (r === 'granted') setSettings({ ...settings, remindersEnabled: true });
  };

  const formatTime = (t) => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${period}`;
  };

  return (
    <div className="space-y-5">
      <div className="text-center py-2">
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.25em', color: styles.gold600 }}>Configuration</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, color: styles.ink900 }}>Reminder Settings</h1>
        <DivineDivider>✦</DivineDivider>
      </div>

      <Card>
        <SectionHeader title="Daily reminder" subtitle="A gentle nudge to review your chart" />
        <div className="space-y-4">
          {perm === 'granted' ? (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'rgba(240, 253, 244, 0.7)', border: '1px solid rgba(187, 247, 208, 0.6)' }}>
              <CheckCircle2 size={16} style={{ color: '#15803d' }} />
              <span style={{ fontSize: 13, color: '#14532d' }}>Notifications enabled</span>
            </div>
          ) : perm === 'denied' ? (
            <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(254, 242, 242, 0.7)', border: '1px solid rgba(254, 202, 202, 0.6)' }}>
              <AlertCircle size={16} style={{ color: '#b91c1c', marginTop: 2 }} />
              <span style={{ fontSize: 13, color: '#7f1d1d' }}>Notifications blocked. Enable them in your browser settings.</span>
            </div>
          ) : perm === 'unsupported' ? (
            <div className="flex items-start gap-2 p-3 rounded-xl" style={{ background: 'rgba(254, 252, 232, 0.7)', border: '1px solid rgba(254, 240, 138, 0.6)' }}>
              <AlertCircle size={16} style={{ color: '#a16207', marginTop: 2 }} />
              <span style={{ fontSize: 13, color: '#713f12' }}>Notifications not supported in this environment.</span>
            </div>
          ) : (
            <button onClick={enableNotifications}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl"
              style={{ background: styles.gold500, color: 'white', fontWeight: 500, border: 'none', cursor: 'pointer', fontSize: 14, transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = styles.gold600}
              onMouseLeave={e => e.currentTarget.style.background = styles.gold500}
            >
              <Bell size={16} /> Enable browser notifications
            </button>
          )}

          <Toggle checked={settings.remindersEnabled} onChange={v => setSettings({ ...settings, remindersEnabled: v })}
            label={settings.remindersEnabled ? 'Reminders are on' : 'Reminders are off'} />

          <div>
            <label className="block mb-2" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: styles.ink500 }}>
              Reminder time
            </label>
            <div className="flex items-center gap-3 mb-3 flex-wrap">
              <input type="time" value={settings.reminderTime} onChange={e => setSettings({ ...settings, reminderTime: e.target.value })}
                className="px-4 py-3 rounded-xl"
                style={{ background: 'white', border: '1px solid rgba(26,22,18,0.05)', color: styles.ink900, fontFamily: 'Cormorant Garamond, serif', fontSize: 22, outline: 'none' }} />
              <span style={{ fontSize: 13, color: styles.ink500 }}>≈ {formatTime(settings.reminderTime)}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map(t => (
                <button key={t} onClick={() => setSettings({ ...settings, reminderTime: t })}
                  className="px-3 py-1 rounded-full"
                  style={{
                    fontSize: 11,
                    background: settings.reminderTime === t ? styles.gold500 : styles.gold50,
                    color: settings.reminderTime === t ? 'white' : styles.ink700,
                    cursor: 'pointer', border: 'none', transition: 'all 0.15s'
                  }}
                >{formatTime(t)}</button>
              ))}
            </div>
          </div>

          <button onClick={() => { if (perm === 'granted') showReminder(); else alert('Enable notifications first.'); }}
            className="w-full p-3 rounded-xl"
            style={{ background: 'white', border: `1px solid ${styles.gold200}`, color: styles.gold800, fontSize: 13, cursor: 'pointer', transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = styles.gold50}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}
          >
            Send a test reminder now
          </button>
        </div>
      </Card>

      <Card>
        <SectionHeader title="About" subtitle="Daily Chart" />
        <div className="space-y-2" style={{ fontSize: 14, color: styles.ink700, lineHeight: 1.6 }}>
          <p>A simple, calm space to review your divine chart each evening. Built around the seven sections of a Brahmin's day.</p>
          <p style={{ fontStyle: 'italic', color: styles.ink600 }}>
            Data is stored privately. Export from History at any time.
          </p>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: styles.gold700, paddingTop: 8 }}>
            Om Shanti · ॐ शान्ति
          </p>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
const NAV = [
  { key: 'home', icon: Home, label: 'Today' },
  { key: 'dashboard', icon: BarChart3, label: 'Dashboard' },
  { key: 'monthly', icon: Calendar, label: 'Monthly' },
  { key: 'history', icon: HistoryIcon, label: 'History' },
  { key: 'insights', icon: Lightbulb, label: 'Insights' },
  { key: 'settings', icon: Bell, label: 'Settings' },
];

export default function App() {
  const [page, setPage] = useState('home');
  const [entries, setEntriesState] = useState({});
  const [settings, setSettingsState] = useState({ reminderTime: '21:45', remindersEnabled: true, userName: '' });
  const [loaded, setLoaded] = useState(false);

  // Load on mount
  useEffect(() => {
    (async () => {
      const [e, s] = await Promise.all([loadEntries(), loadSettings()]);
      setEntriesState(e);
      setSettingsState(s);
      setLoaded(true);
      scheduleReminder(s.reminderTime, s.remindersEnabled);
    })();
  }, []);

  // Persist entries
  useEffect(() => {
    if (loaded) saveEntries(entries);
  }, [entries, loaded]);

  // Persist settings & reschedule
  useEffect(() => {
    if (loaded) {
      saveSettings(settings);
      scheduleReminder(settings.reminderTime, settings.remindersEnabled);
    }
  }, [settings, loaded]);

  const setEntries = (updater) => setEntriesState(updater);
  const setSettings = (s) => setSettingsState(s);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Inter:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        body, html { margin: 0; padding: 0; font-family: 'Inter', system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
        @keyframes slideUp { 0% { opacity: 0; transform: translateY(12px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        input[type='range'].sacred-slider {
          -webkit-appearance: none; appearance: none; height: 4px; border-radius: 999px; outline: none; cursor: pointer;
        }
        input[type='range'].sacred-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none; width: 22px; height: 22px; border-radius: 50%;
          background: #fdfaf3; border: 2px solid #c9a04a; box-shadow: 0 2px 8px rgba(168, 127, 55, 0.3); cursor: pointer; transition: transform 0.15s;
        }
        input[type='range'].sacred-slider::-webkit-slider-thumb:hover { transform: scale(1.15); }
        input[type='range'].sacred-slider::-moz-range-thumb {
          width: 22px; height: 22px; border-radius: 50%; background: #fdfaf3; border: 2px solid #c9a04a;
          box-shadow: 0 2px 8px rgba(168, 127, 55, 0.3); cursor: pointer;
        }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-thumb { background: rgba(201, 160, 74, 0.2); border-radius: 4px; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        background: styles.ivory,
        backgroundImage: `radial-gradient(ellipse 80% 50% at 50% -20%, rgba(223, 185, 92, 0.12), transparent 70%), radial-gradient(ellipse 60% 40% at 50% 110%, rgba(223, 185, 92, 0.08), transparent 70%)`,
        backgroundAttachment: 'fixed',
        color: styles.ink900,
        paddingBottom: 80
      }}>
        {/* Header */}
        <header style={{ position: 'sticky', top: 0, zIndex: 30, backdropFilter: 'blur(12px)', background: 'rgba(253, 250, 243, 0.8)', borderBottom: `1px solid rgba(243, 228, 182, 0.4)` }}>
          <div style={{ maxWidth: 768, margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => setPage('home')} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <div style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${styles.gold100}, ${styles.gold200})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 32px -8px rgba(223, 185, 92, 0.35)' }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: styles.gold400 }} />
                <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid rgba(233, 207, 134, 0.6)` }} />
              </div>
              <div style={{ textAlign: 'left' }}>
                <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: styles.ink900, margin: 0, letterSpacing: '0.02em' }}>Daily Chart</h1>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: styles.gold600, marginTop: 2, margin: 0 }}>A Sacred Self-Review</p>
              </div>
            </button>
            <nav className="hidden md:flex" style={{ alignItems: 'center', gap: 4 }}>
              {NAV.map(n => (
                <button key={n.key} onClick={() => setPage(n.key)}
                  style={{
                    padding: '6px 12px', borderRadius: 999, fontSize: 13, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                    background: page === n.key ? styles.gold100 : 'transparent',
                    color: page === n.key ? styles.gold800 : styles.ink600,
                    fontWeight: page === n.key ? 500 : 400
                  }}
                >{n.label}</button>
              ))}
            </nav>
          </div>
        </header>

        {/* Main */}
        <main style={{ maxWidth: 768, margin: '0 auto', padding: '24px 20px', animation: 'fadeIn 0.6s ease-out' }}>
          {!loaded ? (
            <div style={{ textAlign: 'center', padding: 80, color: styles.ink500, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>
              Preparing your chart…
            </div>
          ) : (
            <>
              {page === 'home' && <HomePage entries={entries} setEntries={setEntries} />}
              {page === 'dashboard' && <DashboardPage entries={entries} />}
              {page === 'monthly' && <MonthlyPage entries={entries} />}
              {page === 'history' && <HistoryPage entries={entries} setEntries={setEntries} />}
              {page === 'insights' && <InsightsPage entries={entries} />}
              {page === 'settings' && <SettingsPage settings={settings} setSettings={setSettings} />}
            </>
          )}
        </main>

        {/* Bottom nav (mobile) */}
        <nav className="md:hidden" style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30,
          background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)',
          borderTop: `1px solid rgba(243, 228, 182, 0.4)`,
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}>
          <div style={{ maxWidth: 768, margin: '0 auto', padding: '8px', display: 'flex', justifyContent: 'space-around' }}>
            {NAV.map(n => {
              const Icon = n.icon;
              const active = page === n.key;
              return (
                <button key={n.key} onClick={() => setPage(n.key)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    padding: '6px 8px', borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer',
                    color: active ? styles.gold700 : styles.ink500
                  }}
                >
                  <Icon size={20} strokeWidth={active ? 2.2 : 1.6} />
                  <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{n.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
}
