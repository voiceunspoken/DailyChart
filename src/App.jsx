import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';


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

const S = {
  ivory: '#fdfaf3', ivoryDeep: '#fefdfb',
  gold50: '#fdfaf3', gold100: '#faf3e0', gold200: '#f3e4b6', gold300: '#e9cf86',
  gold400: '#dfb95c', gold500: '#c9a04a', gold600: '#a87f37', gold700: '#85622d', gold800: '#5f4621',
  ink900: '#1a1612', ink800: '#2d2620', ink700: '#4a3f33', ink600: '#6b5d4d', ink500: '#8b7d6b',
};

// ============================================================
// STORAGE (localStorage)
// ============================================================
const ENTRIES_KEY = 'dailychart.entries.v1';
const SETTINGS_KEY = 'dailychart.settings.v1';

function loadEntries() {
  try { const raw = localStorage.getItem(ENTRIES_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
}
function saveEntries(all) { try { localStorage.setItem(ENTRIES_KEY, JSON.stringify(all)); } catch {} }
function loadSettings() {
  try { const raw = localStorage.getItem(SETTINGS_KEY); if (raw) return JSON.parse(raw); } catch {}
  return { reminderTime: '21:45', remindersEnabled: true, userName: '' };
}
function saveSettings(s) { try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch {} }

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
    insightLine = weekendAvg > weekdayAvg ? `Your weekend stage is stronger — bring that same stability into weekdays.` : `Weekdays carry better consistency. Hold the discipline through weekends too.`;
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
  reminderTimeoutId = window.setTimeout(() => { showReminder(); scheduleReminder(timeHHMM, enabled); }, delay);
}

// ============================================================
// ICONS (inline SVG, no external lib)
// ============================================================
const Icon = ({ d, size = 18, stroke = 2, fill = 'none', viewBox = '0 0 24 24', children, style = {} }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox={viewBox} fill={fill} stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {d && <path d={d} />}
    {children}
  </svg>
);
const IconHome = (p) => <Icon {...p} d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1h-5v-7h-6v7H4a1 1 0 0 1-1-1V9.5z" />;
const IconBars = (p) => <Icon {...p}><line x1="3" y1="20" x2="3" y2="10" /><line x1="9" y1="20" x2="9" y2="4" /><line x1="15" y1="20" x2="15" y2="14" /><line x1="21" y1="20" x2="21" y2="8" /></Icon>;
const IconCal = (p) => <Icon {...p}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></Icon>;
const IconHistory = (p) => <Icon {...p}><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><polyline points="3 3 3 8 8 8" /><polyline points="12 7 12 12 15 14" /></Icon>;
const IconBulb = (p) => <Icon {...p}><path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V18h6v-1.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z" /></Icon>;
const IconBell = (p) => <Icon {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></Icon>;
const IconSparkle = (p) => <Icon {...p}><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" /></Icon>;
const IconCheck = (p) => <Icon {...p}><polyline points="20 6 9 17 4 12" /></Icon>;
const IconCheckCircle = (p) => <Icon {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></Icon>;
const IconAlert = (p) => <Icon {...p}><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></Icon>;
const IconChevL = (p) => <Icon {...p}><polyline points="15 18 9 12 15 6" /></Icon>;
const IconChevR = (p) => <Icon {...p}><polyline points="9 18 15 12 9 6" /></Icon>;
const IconChevD = (p) => <Icon {...p}><polyline points="6 9 12 15 18 9" /></Icon>;
const IconTrash = (p) => <Icon {...p}><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" /></Icon>;
const IconAward = (p) => <Icon {...p}><circle cx="12" cy="8" r="6" /><polyline points="8.21 13.89 7 22 12 19 17 22 15.79 13.88" /></Icon>;
const IconTrendUp = (p) => <Icon {...p}><polyline points="22 6 13.5 14.5 8.5 9.5 2 16" /><polyline points="16 6 22 6 22 12" /></Icon>;
const IconTrendDown = (p) => <Icon {...p}><polyline points="22 17 13.5 8.5 8.5 13.5 2 7" /><polyline points="16 17 22 17 22 11" /></Icon>;
const IconFlame = (p) => <Icon {...p}><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></Icon>;

// ============================================================
// UI PRIMITIVES
// ============================================================
const Card = ({ children, style = {} }) => (
  <div className="card-anim" style={{
    background: 'linear-gradient(180deg, #ffffff 0%, #fefdfb 100%)',
    border: '1px solid rgba(201, 160, 74, 0.12)',
    boxShadow: '0 1px 2px rgba(26, 22, 18, 0.04), 0 4px 16px -4px rgba(168, 127, 55, 0.08)',
    borderRadius: 16, padding: 20, ...style
  }}>{children}</div>
);

const SectionHeader = ({ title, sanskrit, subtitle, index }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
      {index !== undefined && <span style={{ fontFamily: 'Cormorant Garamond, serif', color: S.gold500, opacity: 0.7, fontSize: 14 }}>{String(index).padStart(2, '0')}</span>}
      <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 26, color: S.ink900, margin: 0 }}>{title}</h2>
      {sanskrit && <span style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: S.gold600, fontSize: 18 }}>{sanskrit}</span>}
    </div>
    {subtitle && <p style={{ fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: S.ink500, margin: '4px 0 0 0' }}>{subtitle}</p>}
  </div>
);

const Slider = ({ value, onChange, label }) => {
  const pct = (value / 5) * 100;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', color: S.ink500 }}>{label || 'Rating'}</span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 30, color: S.gold600, lineHeight: 1 }}>{value.toFixed(value % 1 === 0 ? 0 : 1)}</span>
          <span style={{ fontSize: 12, color: S.ink500 }}>/ 5</span>
        </div>
      </div>
      <input type="range" min={0} max={5} step={1} value={value} onChange={(e) => onChange(Number(e.target.value))} className="sacred-slider"
        style={{ width: '100%', background: `linear-gradient(to right, ${S.gold500} 0%, ${S.gold500} ${pct}%, ${S.gold200} ${pct}%, ${S.gold200} 100%)` }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', marginTop: 4, fontSize: 10, color: S.ink500 }}>
        {[0,1,2,3,4,5].map(n => <span key={n}>{n}</span>)}
      </div>
    </div>
  );
};

const Toggle = ({ checked, onChange, label }) => (
  <button type="button" onClick={() => onChange(!checked)}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left',
      padding: 12, borderRadius: 12, background: checked ? S.gold50 : 'white',
      border: `1px solid ${checked ? S.gold300 : 'rgba(26, 22, 18, 0.05)'}`,
      transition: 'all 0.15s', cursor: 'pointer', fontFamily: 'inherit'
    }}>
    <span style={{ fontSize: 14, color: checked ? S.ink900 : S.ink700, fontWeight: checked ? 500 : 400 }}>{label}</span>
    <span style={{ position: 'relative', width: 40, height: 24, borderRadius: 999, background: checked ? S.gold500 : 'rgba(26, 22, 18, 0.1)', transition: 'background 0.15s', flexShrink: 0 }}>
      <span style={{ position: 'absolute', top: 2, left: checked ? 18 : 2, width: 20, height: 20, background: 'white', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', transition: 'left 0.15s' }} />
    </span>
  </button>
);

const TextLine = ({ value, onChange, placeholder, label }) => (
  <div>
    {label && <label style={{ display: 'block', marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: S.ink500 }}>{label}</label>}
    <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ width: '100%', padding: '12px 16px', borderRadius: 12, background: 'white', border: '1px solid rgba(26, 22, 18, 0.05)', color: S.ink900, fontSize: 15, outline: 'none', fontFamily: 'inherit' }}
      onFocus={e => e.target.style.border = `1px solid ${S.gold400}`}
      onBlur={e => e.target.style.border = '1px solid rgba(26, 22, 18, 0.05)'} />
  </div>
);

const Counter = ({ value, onChange, label }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, background: 'white', border: '1px solid rgba(26, 22, 18, 0.05)' }}>
    <span style={{ fontSize: 14, color: S.ink700 }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))} style={{ width: 32, height: 32, borderRadius: 999, background: S.gold50, color: S.gold700, fontSize: 18, lineHeight: 1, cursor: 'pointer', border: 'none' }}>−</button>
      <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: S.ink900, minWidth: 24, textAlign: 'center' }}>{value}</span>
      <button type="button" onClick={() => onChange(value + 1)} style={{ width: 32, height: 32, borderRadius: 999, background: S.gold50, color: S.gold700, fontSize: 18, lineHeight: 1, cursor: 'pointer', border: 'none' }}>+</button>
    </div>
  </div>
);

const SegmentedControl = ({ value, options, onChange }) => (
  <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 12, background: 'rgba(250, 243, 224, 0.5)' }}>
    {options.map(opt => (
      <button key={opt} type="button" onClick={() => onChange(opt)}
        style={{
          flex: 1, padding: '8px 12px', borderRadius: 8, fontSize: 12,
          background: value === opt ? 'white' : 'transparent',
          color: value === opt ? S.ink900 : S.ink600,
          fontWeight: value === opt ? 500 : 400,
          boxShadow: value === opt ? '0 1px 2px rgba(0,0,0,0.04)' : 'none',
          cursor: 'pointer', border: 'none', fontFamily: 'inherit'
        }}>{opt}</button>
    ))}
  </div>
);

const DivineDivider = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0', color: S.gold500 }}>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${S.gold300}, transparent)` }} />
    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 14 }}>{children || '✦'}</span>
    <div style={{ flex: 1, height: 1, background: `linear-gradient(to right, transparent, ${S.gold300}, transparent)` }} />
  </div>
);

// ============================================================
// SECTIONS
// ============================================================
const AmritvelaSection = ({ value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: S.ink500 }}>Time I woke up</label>
      <input type="time" value={value.wakeTime} onChange={e => onChange({ ...value, wakeTime: e.target.value })}
        style={{ padding: '12px 16px', borderRadius: 12, background: 'white', border: '1px solid rgba(26,22,18,0.05)', color: S.ink900, fontFamily: 'Cormorant Garamond, serif', fontSize: 18, outline: 'none' }} />
    </div>
    <Toggle checked={value.goodMorningBaba} onChange={v => onChange({ ...value, goodMorningBaba: v })} label="Said Good Morning to Baba" />
    <Toggle checked={value.swaman} onChange={v => onChange({ ...value, swaman: v })} label="Gave myself Swaman" />
    <Toggle checked={value.meditated} onChange={v => onChange({ ...value, meditated: v })} label="Meditated and received God's power" />
    <Slider value={value.rating} onChange={r => onChange({ ...value, rating: r })} />
  </div>
);

const AvyaktMurliSection = ({ value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <Toggle checked={value.attended} onChange={v => onChange({ ...value, attended: v })} label="Attended Avyakt Murli class" />
    <TextLine label="One point I took for myself" value={value.pointTaken} onChange={v => onChange({ ...value, pointTaken: v })} placeholder="A single line..." />
    <Slider value={value.rating} onChange={r => onChange({ ...value, rating: r })} />
  </div>
);

const SakarMurliSection = ({ value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div>
      <label style={{ display: 'block', marginBottom: 6, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: S.ink500 }}>Attended</label>
      <SegmentedControl value={value.session} options={['Morning', 'Afternoon', 'Evening', 'Not attended']} onChange={v => onChange({ ...value, session: v })} />
    </div>
    <TextLine label="Stithi of Godly Student" value={value.stithi} onChange={v => onChange({ ...value, stithi: v })} placeholder="My stage / state today..." />
    <Slider value={value.rating} onChange={r => onChange({ ...value, rating: r })} />
  </div>
);

const KarmYogiSection = ({ value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: S.ink500, margin: '0 0 4px 0' }}>How many times did I remember…</p>
    <Counter label="I am a Brahmin" value={value.brahminCount} onChange={v => onChange({ ...value, brahminCount: v })} />
    <Counter label="I am an Angel" value={value.angelCount} onChange={v => onChange({ ...value, angelCount: v })} />
    <Counter label="I will become a king in the Golden Age" value={value.kingCount} onChange={v => onChange({ ...value, kingCount: v })} />
    <Slider value={value.rating} onChange={r => onChange({ ...value, rating: r })} />
  </div>
);

const CompanionshipSection = ({ value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <Toggle checked={value.asFather} onChange={v => onChange({ ...value, asFather: v })} label="Experienced Baba as Father" />
    <Toggle checked={value.asTeacher} onChange={v => onChange({ ...value, asTeacher: v })} label="Experienced Baba as Teacher" />
    <Toggle checked={value.asPreceptor} onChange={v => onChange({ ...value, asPreceptor: v })} label="Experienced Baba as Supreme Preceptor" />
    <Slider value={value.rating} onChange={r => onChange({ ...value, rating: r })} />
  </div>
);

const SwarajyaSection = ({ value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
    <Slider label="Mansa · Control over thoughts" value={value.mansa} onChange={v => onChange({ ...value, mansa: v })} />
    <Slider label="Vacha · Control over speech" value={value.vacha} onChange={v => onChange({ ...value, vacha: v })} />
    <Slider label="Karmana · Control over actions" value={value.karmana} onChange={v => onChange({ ...value, karmana: v })} />
    <div style={{ paddingTop: 8, borderTop: `1px solid ${S.gold100}` }}>
      <Slider label="Overall" value={value.rating} onChange={r => onChange({ ...value, rating: r })} />
    </div>
  </div>
);

const SewaSection = ({ value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
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

  const updateEntry = (next) => {
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center', padding: '8px 0 24px' }}>
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.25em', color: S.gold600, margin: '0 0 12px 0' }}>{dateLong}</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 38, color: S.ink900, lineHeight: 1.1, margin: 0 }}>{greeting}.</h1>
        <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: S.ink600, fontSize: 18, margin: '8px 0 0' }}>Time to review your divine chart.</p>
        <DivineDivider>✦</DivineDivider>

        <div style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
          <svg width="140" height="140" viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="70" cy="70" r="60" fill="none" stroke={S.gold200} strokeWidth="8" />
            <circle cx="70" cy="70" r="60" fill="none" stroke="url(#scoreGrad)" strokeWidth="8" strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 60} strokeDashoffset={2 * Math.PI * 60 * (1 - pct / 100)} style={{ transition: 'stroke-dashoffset 0.7s' }} />
            <defs>
              <linearGradient id="scoreGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={S.gold400} />
                <stop offset="100%" stopColor={S.gold600} />
              </linearGradient>
            </defs>
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 38, color: S.ink900, lineHeight: 1 }}>{score.toFixed(score % 1 === 0 ? 0 : 1)}</div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: S.ink500, marginTop: 4 }}>of 35</div>
            <div style={{ fontSize: 12, color: S.gold700, fontWeight: 500, marginTop: 4 }}>{pct}%</div>
          </div>
        </div>

        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <button onClick={() => updateEntry(autoSuggestRatings(entry))}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 999, background: S.gold50, border: `1px solid ${S.gold200}`, color: S.gold800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.background = S.gold100}
            onMouseLeave={e => e.currentTarget.style.background = S.gold50}>
            <IconSparkle size={14} /> Auto-suggest ratings from my answers
          </button>
        </div>

        {savedFlash && (
          <div style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: S.gold700 }}>
            <IconCheck size={12} /> Saved
          </div>
        )}
      </div>

      {SECTION_ORDER.map((k, idx) => {
        const meta = SECTION_META[k];
        return (
          <Card key={k}>
            <SectionHeader title={meta.title} sanskrit={meta.sanskrit} subtitle={meta.subtitle} index={idx + 1} />
            {k === 'amritvela' && <AmritvelaSection value={entry.amritvela} onChange={v => updateEntry({ ...entry, amritvela: v })} />}
            {k === 'avyaktMurli' && <AvyaktMurliSection value={entry.avyaktMurli} onChange={v => updateEntry({ ...entry, avyaktMurli: v })} />}
            {k === 'sakarMurli' && <SakarMurliSection value={entry.sakarMurli} onChange={v => updateEntry({ ...entry, sakarMurli: v })} />}
            {k === 'karmYogi' && <KarmYogiSection value={entry.karmYogi} onChange={v => updateEntry({ ...entry, karmYogi: v })} />}
            {k === 'companionship' && <CompanionshipSection value={entry.companionship} onChange={v => updateEntry({ ...entry, companionship: v })} />}
            {k === 'swarajya' && <SwarajyaSection value={entry.swarajya} onChange={v => updateEntry({ ...entry, swarajya: v })} />}
            {k === 'sewa' && <SewaSection value={entry.sewa} onChange={v => updateEntry({ ...entry, sewa: v })} />}
          </Card>
        );
      })}

      <div style={{ textAlign: 'center', padding: 32, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: S.gold700, fontSize: 14 }}>
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
    return { date: d, label: new Date(d + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' }), score: e ? totalScore(e) : 0, hasEntry: !!e };
  }), [dateList, entries]);

  const filled = useMemo(() => dateList.map(d => entries[d]).filter(Boolean), [dateList, entries]);
  const insights = useMemo(() => computeInsights(filled), [filled]);

  const sectionAvgs = useMemo(() => SECTION_ORDER.map(k => {
    let sum = 0, n = 0;
    filled.forEach(e => { sum += sectionScores(e)[k]; n++; });
    return { key: k, title: SECTION_META[k].title.split(' ')[0], avg: n ? sum / n : 0 };
  }), [filled]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.25em', color: S.gold600, margin: 0 }}>Performance</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, color: S.ink900, margin: 0 }}>Dashboard</h1>
        <DivineDivider>✦</DivineDivider>
      </div>

      <Card>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[['7d','Last 7 days'],['15d','Fortnight'],['30d','Last 30 days'],['month','This month'],['custom','Custom']].map(([k, label]) => (
            <button key={k} onClick={() => setRange(k)}
              style={{
                padding: '6px 12px', borderRadius: 999, fontSize: 13,
                background: range === k ? S.gold500 : S.gold50,
                color: range === k ? 'white' : S.ink700,
                cursor: 'pointer', border: 'none', fontFamily: 'inherit'
              }}>{label}</button>
          ))}
        </div>
        {range === 'custom' && (
          <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${S.gold200}`, background: 'white', color: S.ink900 }} />
            <span style={{ fontSize: 13, color: S.ink500 }}>to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 8, border: `1px solid ${S.gold200}`, background: 'white', color: S.ink900 }} />
          </div>
        )}
      </Card>

      <div className="responsive-4-grid">
        <StatCard label="Average" value={insights ? `${insights.avgPercent}%` : '—'} subtle={insights ? `${insights.avgScore.toFixed(1)} / 35` : 'No entries'} />
        <StatCard label="Streak" value={insights ? `${insights.streak}` : '0'} subtle="consecutive days" icon={<IconFlame size={14} style={{ color: S.gold600 }} />} />
        <StatCard label="Weekday" value={insights && insights.weekdayAvg > 0 ? insights.weekdayAvg.toFixed(1) : '—'} subtle="avg score" />
        <StatCard label="Weekend" value={insights && insights.weekendAvg > 0 ? insights.weekendAvg.toFixed(1) : '—'} subtle="avg score" />
      </div>

      <Card>
        <SectionHeader title="Daily Score" subtitle="Trend over the selected range" />
        <div style={{ height: 256 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 6" stroke={S.gold200} vertical={false} />
              <XAxis dataKey="label" stroke={S.ink500} fontSize={10} interval="preserveStartEnd" />
              <YAxis stroke={S.ink500} fontSize={10} domain={[0, 35]} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="score" stroke={S.gold600} strokeWidth={2.5}
                dot={{ r: 3, fill: S.gold400, stroke: S.gold600, strokeWidth: 1.5 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <SectionHeader title="By Section" subtitle="Average rating per area" />
        <div style={{ height: 288 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sectionAvgs} margin={{ top: 10, right: 10, left: -16, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 6" stroke={S.gold200} vertical={false} />
              <XAxis dataKey="title" stroke={S.ink500} fontSize={10} angle={-25} textAnchor="end" height={50} />
              <YAxis stroke={S.ink500} fontSize={10} domain={[0, 5]} />
              <Tooltip cursor={{ fill: 'rgba(201, 160, 74, 0.05)' }}
                contentStyle={{ borderRadius: 12, border: `1px solid ${S.gold300}`, background: S.ivoryDeep, fontSize: 12 }} />
              <Bar dataKey="avg" radius={[8, 8, 0, 0]}>
                {sectionAvgs.map((d, i) => {
                  const r = d.avg / 5;
                  const color = r > 0.7 ? S.gold600 : r > 0.4 ? S.gold400 : S.gold200;
                  return <Cell key={i} fill={color} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {insights && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          <Card>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 999, background: S.gold100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.gold700 }}>
                <IconAward size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: S.ink500, margin: 0 }}>Best performing</p>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: S.ink900, margin: '2px 0 0' }}>{SECTION_META[insights.bestSection.key].title}</p>
                <p style={{ fontSize: 12, color: S.ink600, margin: '4px 0 0' }}>Average {insights.bestSection.avg.toFixed(1)} / 5</p>
              </div>
              <div style={{ color: S.gold600 }}><IconTrendUp size={16} /></div>
            </div>
          </Card>
          <Card>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 999, background: 'rgba(26,22,18,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.ink700 }}>
                <IconTrendDown size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: S.ink500, margin: 0 }}>Needs attention</p>
                <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 22, color: S.ink900, margin: '2px 0 0' }}>{SECTION_META[insights.weakestSection.key].title}</p>
                <p style={{ fontSize: 12, color: S.ink600, margin: '4px 0 0' }}>Average {insights.weakestSection.avg.toFixed(1)} / 5</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {insights && (
        <Card style={{ background: `linear-gradient(135deg, ${S.gold50}, ${S.ivoryDeep})` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 38, color: S.gold500, lineHeight: 1 }}>"</div>
            <div>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: S.gold700, margin: '0 0 4px' }}>Insight of the period</p>
              <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 19, color: S.ink900, lineHeight: 1.3, margin: 0 }}>{insights.insightLine}</p>
            </div>
          </div>
        </Card>
      )}

      {insights && (insights.weekdayAvg > 0 || insights.weekendAvg > 0) && (
        <Card>
          <SectionHeader title="Weekday vs Weekend" subtitle="Consistency across the week" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[{ label: 'Weekdays', val: insights.weekdayAvg }, { label: 'Weekends', val: insights.weekendAvg }].map(r => (
              <div key={r.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: S.ink700 }}>{r.label}</span>
                  <span style={{ color: S.ink900, fontWeight: 500 }}>{r.val.toFixed(1)} / 35</span>
                </div>
                <div style={{ height: 12, borderRadius: 999, background: S.gold100, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${Math.min(100, (r.val / 35) * 100)}%`, background: `linear-gradient(to right, ${S.gold300}, ${S.gold500})`, borderRadius: 999, transition: 'width 0.7s' }} />
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: S.ink500, margin: 0 }}>{label}</p>
        {icon}
      </div>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 30, color: S.ink900, margin: '6px 0 0', lineHeight: 1 }}>{value}</p>
      {subtle && <p style={{ fontSize: 11, color: S.ink500, margin: '4px 0 0' }}>{subtle}</p>}
    </Card>
  );
}

function CustomTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{ background: 'white', padding: '8px 12px', borderRadius: 12, border: `1px solid ${S.gold300}`, fontSize: 12, boxShadow: '0 4px 24px -8px rgba(168, 127, 55, 0.12)' }}>
      <div style={{ color: S.ink700, fontWeight: 500 }}>{d.label}</div>
      <div style={{ color: S.gold700, marginTop: 2 }}>Score: <span style={{ fontWeight: 600 }}>{d.score}</span> / 35</div>
      {!d.hasEntry && <div style={{ color: S.ink500, fontSize: 10, marginTop: 2, fontStyle: 'italic' }}>No entry</div>}
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
    return { days: arr, monthLabel: refDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), monthAvg: n > 0 ? sum / n : 0, daysWithEntry: n };
  }, [refDate, entries]);

  const colorFor = (score, hasEntry) => {
    if (!hasEntry) return { bg: '#fdfaf3', color: 'rgba(139, 125, 107, 0.5)', border: 'rgba(26,22,18,0.05)' };
    const p = score / 35;
    if (p >= 0.8) return { bg: S.gold500, color: 'white', border: S.gold600 };
    if (p >= 0.6) return { bg: S.gold400, color: 'white', border: S.gold500 };
    if (p >= 0.4) return { bg: S.gold300, color: S.ink900, border: S.gold400 };
    if (p >= 0.2) return { bg: S.gold200, color: S.ink800, border: S.gold300 };
    return { bg: S.gold100, color: S.ink700, border: S.gold200 };
  };

  const shiftMonth = (delta) => { const n = new Date(refDate); n.setDate(1); n.setMonth(n.getMonth() + delta); setRefDate(n); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.25em', color: S.gold600, margin: 0 }}>Reflection</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, color: S.ink900, margin: 0 }}>Monthly Chart</h1>
        <DivineDivider>✦</DivineDivider>
      </div>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <button onClick={() => shiftMonth(-1)} style={{ width: 36, height: 36, borderRadius: 999, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.ink700 }}>
            <IconChevL size={18} />
          </button>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, color: S.ink900, margin: 0 }}>{monthLabel}</h2>
            <p style={{ fontSize: 11, color: S.ink500, margin: '2px 0 0' }}>{daysWithEntry} {daysWithEntry === 1 ? 'day' : 'days'} recorded · avg {monthAvg.toFixed(1)} / 35</p>
          </div>
          <button onClick={() => shiftMonth(1)} style={{ width: 36, height: 36, borderRadius: 999, background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: S.ink700 }}>
            <IconChevR size={18} />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginBottom: 8 }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} style={{ textAlign: 'center', padding: 4, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: S.ink500 }}>{d}</div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
          {days.map((d, i) => d === null ? (
            <div key={`e-${i}`} style={{ aspectRatio: '1/1' }} />
          ) : (
            <div key={d.date}
              style={{ aspectRatio: '1/1', borderRadius: 8, background: colorFor(d.score, d.hasEntry).bg, color: colorFor(d.score, d.hasEntry).color, border: `1px solid ${colorFor(d.score, d.hasEntry).border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
              title={d.hasEntry ? `${d.date}: ${d.score}/35` : `${d.date}: no entry`}>
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 16, lineHeight: 1 }}>{d.day}</span>
              {d.hasEntry && <span style={{ fontSize: 9, marginTop: 2, opacity: 0.8 }}>{d.score}</span>}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 10, color: S.ink500 }}>
          <span>Low</span>
          <div style={{ display: 'flex', gap: 2 }}>
            {[S.gold100, S.gold200, S.gold300, S.gold400, S.gold500].map(c => <div key={c} style={{ width: 16, height: 16, borderRadius: 4, background: c }} />)}
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
    setEntries(prev => { const next = { ...prev }; delete next[date]; return next; });
  };

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(entries, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `daily-chart-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.25em', color: S.gold600, margin: 0 }}>Reflection</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, color: S.ink900, margin: 0 }}>History</h1>
        <DivineDivider>✦</DivineDivider>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 14, color: S.ink600, margin: 0 }}>{sorted.length} {sorted.length === 1 ? 'entry' : 'entries'} recorded</p>
        {sorted.length > 0 && (
          <button onClick={exportJson} style={{ padding: '6px 12px', borderRadius: 999, fontSize: 12, background: S.gold50, color: S.gold800, border: `1px solid ${S.gold200}`, cursor: 'pointer', fontFamily: 'inherit' }}>Export JSON</button>
        )}
      </div>

      {sorted.length === 0 ? (
        <Card>
          <p style={{ textAlign: 'center', padding: 32, color: S.ink500, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', margin: 0 }}>
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
                style={{ width: '100%', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <div>
                  <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, color: S.ink900, margin: 0 }}>
                    {d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p style={{ fontSize: 11, color: S.ink500, margin: '2px 0 0' }}>Score {score} / 35 · {Math.round((score / 35) * 100)}%</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 999, background: `linear-gradient(135deg, ${S.gold50}, ${S.gold100})`, border: `1px solid ${S.gold200}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 18, color: S.gold800 }}>{score}</span>
                  </div>
                  <div style={{ color: S.ink500, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><IconChevD size={18} /></div>
                </div>
              </button>

              {isOpen && (
                <div style={{ padding: '16px 20px 20px', borderTop: `1px solid ${S.gold100}` }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {SECTION_ORDER.map(k => (
                      <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 13, color: S.ink700, flex: 1 }}>{SECTION_META[k].title}</span>
                        <div style={{ flex: 1, height: 8, borderRadius: 999, background: S.gold100, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(scores[k] / 5) * 100}%`, background: `linear-gradient(to right, ${S.gold300}, ${S.gold500})`, borderRadius: 999 }} />
                        </div>
                        <span style={{ fontSize: 13, color: S.ink900, fontWeight: 500, width: 32, textAlign: 'right' }}>{scores[k].toFixed(scores[k] % 1 === 0 ? 0 : 1)}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8 }}>
                    {e.amritvela.wakeTime && <Highlight label="Woke up at" value={e.amritvela.wakeTime} />}
                    <Highlight label="Murli" value={e.sakarMurli.session} />
                    {e.avyaktMurli.pointTaken && <Highlight label="Point taken" value={e.avyaktMurli.pointTaken} />}
                    {e.sakarMurli.stithi && <Highlight label="Stithi" value={e.sakarMurli.stithi} />}
                  </div>
                  <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => remove(e.date)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, fontSize: 12, color: 'rgba(220, 38, 38, 0.8)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      <IconTrash size={12} /> Delete
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
      <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: S.ink500, margin: 0 }}>{label}</p>
      <p style={{ fontSize: 13, color: S.ink800, margin: '2px 0 0', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{value}</p>
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.25em', color: S.gold600, margin: 0 }}>Wisdom</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, color: S.ink900, margin: 0 }}>Insights</h1>
        <DivineDivider>✦</DivineDivider>
      </div>

      <Card style={{ background: `linear-gradient(135deg, ${S.gold50}, ${S.ivoryDeep})` }}>
        <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: S.gold700, margin: '0 0 12px' }}>Reflection across periods</p>
        <div className="responsive-4-grid">
          <PeriodCell title="Week" pct={week?.avgPercent} n={last7.length} />
          <PeriodCell title="Fortnight" pct={fortnight?.avgPercent} n={last15.length} />
          <PeriodCell title="Month" pct={month?.avgPercent} n={last30.length} />
          <PeriodCell title="All time" pct={lifetime?.avgPercent} n={all.length} />
        </div>
      </Card>

      {fortnight && (
        <Card>
          <SectionHeader title="Insight of the Fortnight" subtitle="A reflection on the past 15 days" />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 42, color: S.gold500, lineHeight: 1 }}>"</div>
            <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', fontSize: 19, color: S.ink900, lineHeight: 1.3, margin: 0 }}>{fortnight.insightLine}</p>
          </div>
        </Card>
      )}

      {fortnight && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
          <Card>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: S.gold700, margin: 0 }}>Strongest area</p>
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, color: S.ink900, margin: '4px 0 0' }}>{SECTION_META[fortnight.bestSection.key].title}</h3>
            <p style={{ fontSize: 13, color: S.ink600, fontStyle: 'italic', margin: '4px 0 0' }}>{SECTION_META[fortnight.bestSection.key].subtitle}</p>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 38, color: S.gold700 }}>{fortnight.bestSection.avg.toFixed(1)}</span>
              <span style={{ color: S.ink500, fontSize: 13 }}>/ 5 average</span>
            </div>
          </Card>
          <Card>
            <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: S.ink500, margin: 0 }}>Needs attention</p>
            <h3 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 24, color: S.ink900, margin: '4px 0 0' }}>{SECTION_META[fortnight.weakestSection.key].title}</h3>
            <p style={{ fontSize: 13, color: S.ink600, fontStyle: 'italic', margin: '4px 0 0' }}>{SECTION_META[fortnight.weakestSection.key].subtitle}</p>
            <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 38, color: S.ink700 }}>{fortnight.weakestSection.avg.toFixed(1)}</span>
              <span style={{ color: S.ink500, fontSize: 13 }}>/ 5 average</span>
            </div>
          </Card>
        </div>
      )}

      <Card>
        <SectionHeader title="Week-over-week" subtitle="Last 7 days vs the 7 days before" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {progress.map(p => {
            const up = p.delta > 0.15, down = p.delta < -0.15;
            return (
              <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: S.ink700, flex: 1 }}>{SECTION_META[p.key].title}</span>
                <span style={{ fontSize: 11, color: S.ink500, width: 36, textAlign: 'right' }}>{p.old.toFixed(1)}</span>
                <span style={{ color: 'rgba(139, 125, 107, 0.6)' }}>→</span>
                <span style={{ fontSize: 11, color: S.ink900, fontWeight: 500, width: 36, textAlign: 'right' }}>{p.recent.toFixed(1)}</span>
                <span style={{ fontSize: 11, fontWeight: 500, width: 44, textAlign: 'right', color: up ? '#15803d' : down ? 'rgba(220, 38, 38, 0.85)' : S.ink500 }}>
                  {p.delta > 0 ? '+' : ''}{p.delta.toFixed(1)}
                </span>
              </div>
            );
          })}
        </div>
      </Card>

      {all.length === 0 && (
        <Card>
          <p style={{ textAlign: 'center', padding: 32, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: S.ink500, margin: 0 }}>
            Insights will unfold as you record your daily chart.
          </p>
        </Card>
      )}
    </div>
  );
}

function PeriodCell({ title, pct, n }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.15em', color: S.ink500, margin: 0 }}>{title}</p>
      <p style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 30, color: S.ink900, margin: '4px 0 0', lineHeight: 1 }}>{pct !== undefined ? `${pct}%` : '—'}</p>
      <p style={{ fontSize: 10, color: S.ink500, margin: '4px 0 0' }}>{n} {n === 1 ? 'day' : 'days'}</p>
    </div>
  );
}

function SettingsPage({ settings, setSettings }) {
  const [perm, setPerm] = useState(() => 'Notification' in window ? Notification.permission : 'unsupported');
  const PRESETS = ['09:00', '21:00', '21:45', '22:00', '22:30'];

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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ textAlign: 'center', padding: '8px 0' }}>
        <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.25em', color: S.gold600, margin: 0 }}>Configuration</p>
        <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 36, color: S.ink900, margin: 0 }}>Reminder Settings</h1>
        <DivineDivider>✦</DivineDivider>
      </div>

      <Card>
        <SectionHeader title="Daily reminder" subtitle="A gentle nudge to review your chart" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {perm === 'granted' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 12, background: 'rgba(240, 253, 244, 0.7)', border: '1px solid rgba(187, 247, 208, 0.6)', color: '#14532d' }}>
              <IconCheckCircle size={16} /><span style={{ fontSize: 13 }}>Notifications enabled</span>
            </div>
          ) : perm === 'denied' ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, background: 'rgba(254, 242, 242, 0.7)', border: '1px solid rgba(254, 202, 202, 0.6)', color: '#7f1d1d' }}>
              <IconAlert size={16} style={{ marginTop: 2 }} /><span style={{ fontSize: 13 }}>Notifications blocked. Enable them in your browser settings.</span>
            </div>
          ) : perm === 'unsupported' ? (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 12, background: 'rgba(254, 252, 232, 0.7)', border: '1px solid rgba(254, 240, 138, 0.6)', color: '#713f12' }}>
              <IconAlert size={16} style={{ marginTop: 2 }} /><span style={{ fontSize: 13 }}>Notifications not supported in this environment.</span>
            </div>
          ) : (
            <button onClick={enableNotifications}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, background: S.gold500, color: 'white', fontWeight: 500, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
              <IconBell size={16} /> Enable browser notifications
            </button>
          )}

          <Toggle checked={settings.remindersEnabled} onChange={v => setSettings({ ...settings, remindersEnabled: v })} label={settings.remindersEnabled ? 'Reminders are on' : 'Reminders are off'} />

          <div>
            <label style={{ display: 'block', marginBottom: 8, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: S.ink500 }}>Reminder time</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
              <input type="time" value={settings.reminderTime} onChange={e => setSettings({ ...settings, reminderTime: e.target.value })}
                style={{ padding: '12px 16px', borderRadius: 12, background: 'white', border: '1px solid rgba(26,22,18,0.05)', color: S.ink900, fontFamily: 'Cormorant Garamond, serif', fontSize: 22, outline: 'none' }} />
              <span style={{ fontSize: 13, color: S.ink500 }}>≈ {formatTime(settings.reminderTime)}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PRESETS.map(t => (
                <button key={t} onClick={() => setSettings({ ...settings, reminderTime: t })}
                  style={{ padding: '4px 12px', borderRadius: 999, fontSize: 11, background: settings.reminderTime === t ? S.gold500 : S.gold50, color: settings.reminderTime === t ? 'white' : S.ink700, cursor: 'pointer', border: 'none', fontFamily: 'inherit' }}>
                  {formatTime(t)}
                </button>
              ))}
            </div>
          </div>

          <button onClick={() => { if (perm === 'granted') showReminder(); else alert('Enable notifications first.'); }}
            style={{ width: '100%', padding: 12, borderRadius: 12, background: 'white', border: `1px solid ${S.gold200}`, color: S.gold800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            Send a test reminder now
          </button>
        </div>
      </Card>

      <Card>
        <SectionHeader title="About" subtitle="Daily Chart" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: S.ink700, lineHeight: 1.6 }}>
          <p style={{ margin: 0 }}>A simple, calm space to review your divine chart each evening. Built around the seven sections of a Brahmin's day.</p>
          <p style={{ fontStyle: 'italic', color: S.ink600, margin: 0 }}>Data is stored privately in your browser. Export from History at any time.</p>
          <p style={{ fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic', color: S.gold700, paddingTop: 8, margin: 0 }}>Om Shanti · ॐ शान्ति</p>
        </div>
      </Card>
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
const NAV = [
  { key: 'home', icon: IconHome, label: 'Today' },
  { key: 'dashboard', icon: IconBars, label: 'Dashboard' },
  { key: 'monthly', icon: IconCal, label: 'Monthly' },
  { key: 'history', icon: IconHistory, label: 'History' },
  { key: 'insights', icon: IconBulb, label: 'Insights' },
  { key: 'settings', icon: IconBell, label: 'Settings' },
];

export default function App() {
  const [page, setPage] = useState('home');
  const [entries, setEntriesState] = useState({});
  const [settings, setSettingsState] = useState({ reminderTime: '21:45', remindersEnabled: true, userName: '' });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setEntriesState(loadEntries());
    const s = loadSettings();
    setSettingsState(s);
    setLoaded(true);
    scheduleReminder(s.reminderTime, s.remindersEnabled);
  }, []);

  useEffect(() => { if (loaded) saveEntries(entries); }, [entries, loaded]);
  useEffect(() => {
    if (loaded) { saveSettings(settings); scheduleReminder(settings.reminderTime, settings.remindersEnabled); }
  }, [settings, loaded]);

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 80 }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 30, backdropFilter: 'blur(12px)', background: 'rgba(253, 250, 243, 0.85)', borderBottom: '1px solid rgba(243, 228, 182, 0.4)' }}>
        <div style={{ maxWidth: 768, margin: '0 auto', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button onClick={() => setPage('home')} style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>
            <div style={{ position: 'relative', width: 36, height: 36, borderRadius: '50%', background: `linear-gradient(135deg, ${S.gold100}, ${S.gold200})`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 32px -8px rgba(223, 185, 92, 0.35)' }}>
              <div style={{ width: 14, height: 14, borderRadius: '50%', background: S.gold400 }} />
              <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: '1px solid rgba(233, 207, 134, 0.6)' }} />
            </div>
            <div style={{ textAlign: 'left' }}>
              <h1 style={{ fontFamily: 'Cormorant Garamond, serif', fontSize: 20, color: S.ink900, margin: 0, letterSpacing: '0.02em' }}>Daily Chart</h1>
              <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.2em', color: S.gold600, margin: '2px 0 0' }}>A Sacred Self-Review</p>
            </div>
          </button>
          <nav className="show-md-up" style={{ alignItems: 'center', gap: 4 }}>
            {NAV.map(n => (
              <button key={n.key} onClick={() => setPage(n.key)}
                style={{ padding: '6px 12px', borderRadius: 999, fontSize: 13, cursor: 'pointer', border: 'none', background: page === n.key ? S.gold100 : 'transparent', color: page === n.key ? S.gold800 : S.ink600, fontWeight: page === n.key ? 500 : 400, fontFamily: 'inherit' }}>
                {n.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 768, margin: '0 auto', padding: '24px 20px', animation: 'fadeIn 0.6s ease-out' }}>
        {!loaded ? (
          <div style={{ textAlign: 'center', padding: 80, color: S.ink500, fontFamily: 'Cormorant Garamond, serif', fontStyle: 'italic' }}>Preparing your chart…</div>
        ) : (
          <>
            {page === 'home' && <HomePage entries={entries} setEntries={setEntriesState} />}
            {page === 'dashboard' && <DashboardPage entries={entries} />}
            {page === 'monthly' && <MonthlyPage entries={entries} />}
            {page === 'history' && <HistoryPage entries={entries} setEntries={setEntriesState} />}
            {page === 'insights' && <InsightsPage entries={entries} />}
            {page === 'settings' && <SettingsPage settings={settings} setSettings={setSettingsState} />}
          </>
        )}
      </main>

      <nav className="hide-md-up" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 30, background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(243, 228, 182, 0.4)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
        <div style={{ maxWidth: 768, margin: '0 auto', padding: 8, display: 'flex', justifyContent: 'space-around' }}>
          {NAV.map(n => {
            const IconCmp = n.icon;
            const active = page === n.key;
            return (
              <button key={n.key} onClick={() => setPage(n.key)}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '6px 8px', borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: active ? S.gold700 : S.ink500, fontFamily: 'inherit' }}>
                <IconCmp size={20} stroke={active ? 2.2 : 1.6} />
                <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{n.label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

