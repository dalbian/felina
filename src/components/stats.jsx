// Vista de estadísticas: KPIs + gráficos para colonias, gastos veterinarios y
// demografía de gatos. Lazy-cargada desde App.jsx (recharts pesa ~80KB gzip,
// va en su propio vendor chunk). Los cálculos se hacen en cliente con los
// datos derivados que ya da el store (orgCats, orgEvents, orgColonies,
// orgReminders). Si en años crece mucho el volumen, mover a SQL view.

import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { PawPrint, Activity, Wallet, Bell } from 'lucide-react';

import { CER_STATUS, EVENT_TYPES, SEX_VALUES } from '../constants.js';
import { useTranslation } from '../lib/i18n.jsx';
import { inputStyle } from '../styles.jsx';

// Sexo: colores ya canónicos en ui.jsx (SEX_BADGE). Los duplicamos aquí para
// no exportar cosas que solo usa este módulo desde ui.jsx.
const SEX_COLOR = { H: '#B5548A', M: '#4E7DA8', D: '#8A7A5C' };

const STERILIZED_STATUSES = ['esterilizado', 'en_colonia', 'en_acogida', 'adoptado'];
const INACTIVE_STATUSES = ['fallecido', 'adoptado'];

// ───── Helpers temporales ─────────────────────────────────────────────────
// Devuelve {from, to} (Date) según el rango pedido. `to` es exclusivo.
const rangeFor = (key) => {
  const now = new Date();
  const to = new Date(now); to.setHours(23, 59, 59, 999);
  if (key === '30d') {
    const from = new Date(now); from.setDate(from.getDate() - 29); from.setHours(0, 0, 0, 0);
    return { from, to };
  }
  if (key === '12m') {
    const from = new Date(now.getFullYear(), now.getMonth() - 11, 1); from.setHours(0, 0, 0, 0);
    return { from, to };
  }
  if (key === 'ytd') {
    const from = new Date(now.getFullYear(), 0, 1);
    return { from, to };
  }
  if (key === 'ly') {
    const from = new Date(now.getFullYear() - 1, 0, 1);
    const end = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    return { from, to: end };
  }
  return null; // 'all'
};

const fmtCurrency = (n) => `${(n || 0).toFixed(2).replace('.', ',')} €`;

// Formato YYYY-MM legible: 'mar 25', 'abr 25'…
const MONTH_LABELS_BY_LANG = {
  es: ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'],
  ca: ['gen','feb','mar','abr','mai','jun','jul','ago','set','oct','nov','des'],
};
const monthLabel = (yyyymm, lang) => {
  const [y, m] = yyyymm.split('-').map(Number);
  const months = MONTH_LABELS_BY_LANG[lang] || MONTH_LABELS_BY_LANG.es;
  return `${months[m - 1]} ${String(y).slice(2)}`;
};

// ───── Componentes UI internos ────────────────────────────────────────────

const KpiCard = ({ icon: Icon, label, value, sub, color = '#2D4A3E', bg = '#DDE6CC' }) => (
  <div className="p-5 rounded-2xl"
       style={{ backgroundColor: '#FDFAF3', boxShadow: '0 1px 3px rgba(42,37,32,0.04), 0 0 0 1px #EADFC9' }}>
    <div className="flex items-start justify-between mb-3">
      <div className="text-[10px] uppercase tracking-widest font-medium" style={{ color: '#8A7A5C', letterSpacing: '0.12em' }}>{label}</div>
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
           style={{ backgroundColor: bg }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
    </div>
    <div className="font-serif text-3xl md:text-4xl leading-none mb-1" style={{ color, fontFeatureSettings: '"lnum"' }}>{value}</div>
    {sub && <div className="text-xs mt-2" style={{ color: '#78706A' }}>{sub}</div>}
  </div>
);

const ChartCard = ({ title, hint, children, height = 240 }) => (
  <div className="rounded-2xl p-5"
       style={{ backgroundColor: '#FDFAF3', boxShadow: '0 1px 3px rgba(42,37,32,0.04), 0 0 0 1px #EADFC9' }}>
    <div className="mb-4">
      <h3 className="font-serif text-xl" style={{ color: '#1A1712' }}>{title}</h3>
      {hint && <p className="text-xs mt-0.5" style={{ color: '#78706A' }}>{hint}</p>}
    </div>
    <div style={{ width: '100%', height, overflow: 'hidden' }}>
      {children}
    </div>
  </div>
);

const TOOLTIP_STYLE = {
  backgroundColor: '#FDFAF3',
  border: '1px solid #EADFC9',
  borderRadius: 12,
  fontSize: 12,
  padding: '8px 12px',
  color: '#1A1712',
};

// Donut con leyenda lateral. Pinta etiquetas + recuento al lado.
const DonutWithLegend = ({ data, totalLabel }) => {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="grid grid-cols-2 gap-4 items-center h-full">
      <div className="h-full min-h-[180px]">
        <ResponsiveContainer width="100%" height="100%" debounce={50}>
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="92%" paddingAngle={2}>
              {data.map((d, i) => <Cell key={i} fill={d.color} stroke="#FDFAF3" strokeWidth={2} />)}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(v, _n, item) => [`${v}`, item?.payload?.name]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="space-y-1.5">
        {totalLabel && (
          <div className="mb-2 pb-2 border-b" style={{ borderColor: '#F0E8D6' }}>
            <div className="text-[10px] uppercase tracking-widest" style={{ color: '#8A7A5C' }}>{totalLabel}</div>
            <div className="font-serif text-2xl" style={{ color: '#1A1712' }}>{total}</div>
          </div>
        )}
        {data.map(d => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
            <span className="flex-1 truncate" style={{ color: '#4A433C' }}>{d.name}</span>
            <span className="font-mono" style={{ color: '#78706A' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ───── Cálculos puros ─────────────────────────────────────────────────────
// Devuelven los datos preparados para los gráficos. Memo-izados arriba.

const computeKpis = (cats, events, reminders, range) => {
  const activeCats = cats.filter(c => !INACTIVE_STATUSES.includes(c.cerStatus));
  const sterilized = cats.filter(c => STERILIZED_STATUSES.includes(c.cerStatus)).length;
  const cerPct = cats.length > 0 ? Math.round((sterilized / cats.length) * 100) : 0;

  const eventsInRange = range
    ? events.filter(e => e.date >= range.from.getTime() && e.date <= range.to.getTime())
    : events;
  const costTotal = eventsInRange.reduce((s, e) => s + (e.cost || 0), 0);
  const interventionCount = eventsInRange.length;

  const todayMs = Date.now();
  const horizon = new Date(); horizon.setDate(horizon.getDate() + 30);
  const horizonYmd = `${horizon.getFullYear()}-${String(horizon.getMonth() + 1).padStart(2, '0')}-${String(horizon.getDate()).padStart(2, '0')}`;
  const todayYmd = new Date(todayMs).toISOString().slice(0, 10);
  const pendingReminders = (reminders || []).filter(r => !r.completedAt && r.dueDate <= horizonYmd);
  const overdueReminders = pendingReminders.filter(r => r.dueDate < todayYmd);

  return {
    activeCount: activeCats.length,
    catsTotal: cats.length,
    cerPct, sterilized,
    costTotal, interventionCount,
    pendingReminders: pendingReminders.length,
    overdueReminders: overdueReminders.length,
  };
};

const computeCerDistribution = (cats, t) => {
  const counts = {};
  cats.forEach(c => { counts[c.cerStatus] = (counts[c.cerStatus] || 0) + 1; });
  return Object.keys(CER_STATUS)
    .map(k => ({
      key: k,
      name: t(`cer.${k}.label`),
      value: counts[k] || 0,
      color: CER_STATUS[k].dot,
    }))
    .filter(d => d.value > 0);
};

const computeTopColonies = (colonies, cats, limit = 10) => {
  const byCol = {};
  cats.forEach(c => {
    if (c.colonyId) byCol[c.colonyId] = (byCol[c.colonyId] || 0) + 1;
  });
  return colonies
    .map(col => ({ name: col.name, value: byCol[col.id] || 0 }))
    .filter(d => d.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, limit);
};

const computeMonthlyCost = (events, range, lang) => {
  // Si no hay rango (all), usamos 12m por defecto.
  const r = range || rangeFor('12m');
  const fromY = r.from.getFullYear();
  const fromM = r.from.getMonth();
  const toY = r.to.getFullYear();
  const toM = r.to.getMonth();
  const totalMonths = (toY - fromY) * 12 + (toM - fromM) + 1;
  const buckets = [];
  for (let i = 0; i < totalMonths; i++) {
    const d = new Date(fromY, fromM + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({ key, label: monthLabel(key, lang), value: 0 });
  }
  const bucketByKey = Object.fromEntries(buckets.map(b => [b.key, b]));
  events.forEach(e => {
    if (e.date < r.from.getTime() || e.date > r.to.getTime()) return;
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const b = bucketByKey[key];
    if (b) b.value += (e.cost || 0);
  });
  return buckets;
};

const computeEventTypes = (events, range, t) => {
  const inRange = range
    ? events.filter(e => e.date >= range.from.getTime() && e.date <= range.to.getTime())
    : events;
  const counts = {};
  inRange.forEach(e => { counts[e.type] = (counts[e.type] || 0) + 1; });
  return Object.keys(EVENT_TYPES)
    .map(k => ({
      key: k,
      name: t(`event.${k}.label`),
      value: counts[k] || 0,
      color: EVENT_TYPES[k].color,
    }))
    .filter(d => d.value > 0);
};

const computeSexDistribution = (cats, t) => {
  const counts = {};
  cats.forEach(c => { counts[c.sex] = (counts[c.sex] || 0) + 1; });
  return SEX_VALUES
    .map(s => ({
      key: s,
      name: t(`sex.${s}`),
      value: counts[s] || 0,
      color: SEX_COLOR[s],
    }))
    .filter(d => d.value > 0);
};

// ───── Bloque reutilizable con todos los gráficos ─────────────────────────
// Lo usa StatsView (scope toda la org) y ColonyStats (scope una colonia).
// Recibe los datos ya filtrados y el rango (puede ser null = sin restricción).

const StatsCharts = ({ cats, events, colonies, reminders, range, showColonyBreakdown }) => {
  const { t, lang } = useTranslation();

  const kpis = useMemo(() => computeKpis(cats, events, reminders, range), [cats, events, reminders, range]);
  const cerData = useMemo(() => computeCerDistribution(cats, t), [cats, t]);
  const topColonies = useMemo(() => showColonyBreakdown ? computeTopColonies(colonies, cats) : [], [colonies, cats, showColonyBreakdown]);
  const monthlyCost = useMemo(() => computeMonthlyCost(events, range, lang), [events, range, lang]);
  const eventTypes = useMemo(() => computeEventTypes(events, range, t), [events, range, t]);
  const sexDist = useMemo(() => computeSexDistribution(cats, t), [cats, t]);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <KpiCard icon={PawPrint}
                 label={t('stats.kpi.activeCats')}
                 value={kpis.activeCount}
                 sub={t('stats.kpi.activeCatsSub', { total: kpis.catsTotal })}
                 color="#2D4A3E" bg="#DDE6CC" />
        <KpiCard icon={Activity}
                 label={t('stats.kpi.cerPct')}
                 value={`${kpis.cerPct}%`}
                 sub={t('stats.kpi.cerPctSub', { n: kpis.sterilized, total: kpis.catsTotal })}
                 color="#6B8E4E" bg="#E5EDDB" />
        <KpiCard icon={Wallet}
                 label={t('stats.kpi.cost')}
                 value={fmtCurrency(kpis.costTotal)}
                 sub={t('stats.kpi.costSub', { n: kpis.interventionCount })}
                 color="#8A6B1F" bg="#FDF4DE" />
        <KpiCard icon={Bell}
                 label={t('stats.kpi.reminders')}
                 value={kpis.pendingReminders}
                 sub={kpis.overdueReminders > 0
                   ? t('stats.kpi.remindersOverdue', { n: kpis.overdueReminders })
                   : t('stats.kpi.remindersOk')}
                 color={kpis.overdueReminders > 0 ? '#B15A3A' : '#4A6332'}
                 bg={kpis.overdueReminders > 0 ? '#F5DDCE' : '#DDE6CC'} />
      </div>

      {/* Sección colonias */}
      <div>
        <h2 className="font-serif text-2xl mb-4" style={{ color: '#1A1712' }}>{t('stats.sec.colonies')}</h2>
        <div className={`grid gap-4 ${showColonyBreakdown ? 'md:grid-cols-2' : ''}`}>
          {showColonyBreakdown && (
            <ChartCard title={t('stats.col.topTitle')} hint={t('stats.col.topHint')} height={Math.max(220, topColonies.length * 28)}>
              {topColonies.length === 0 ? (
                <EmptyMini label={t('stats.empty.noColonies')} />
              ) : (
                <ResponsiveContainer width="100%" height="100%" debounce={50}>
                  <BarChart data={topColonies} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
                    <CartesianGrid horizontal={false} stroke="#F0E8D6" />
                    <XAxis type="number" allowDecimals={false} stroke="#8A7A5C" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" width={120} stroke="#8A7A5C" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: '#F8F3E8' }} />
                    <Bar dataKey="value" fill="#2D4A3E" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>
          )}
          <ChartCard title={t('stats.col.cerTitle')} hint={t('stats.col.cerHint')}>
            {cerData.length === 0 ? (
              <EmptyMini label={t('stats.empty.noCats')} />
            ) : (
              <DonutWithLegend data={cerData} totalLabel={t('stats.col.cerTotal')} />
            )}
          </ChartCard>
        </div>
      </div>

      {/* Sección veterinario */}
      <div>
        <h2 className="font-serif text-2xl mb-4" style={{ color: '#1A1712' }}>{t('stats.sec.vet')}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <ChartCard title={t('stats.vet.monthlyTitle')} hint={t('stats.vet.monthlyHint')}>
            {monthlyCost.every(b => b.value === 0) ? (
              <EmptyMini label={t('stats.empty.noCost')} />
            ) : (
              <ResponsiveContainer width="100%" height="100%" debounce={50}>
                <BarChart data={monthlyCost} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid vertical={false} stroke="#F0E8D6" />
                  <XAxis dataKey="label" stroke="#8A7A5C" tick={{ fontSize: 11 }} interval={monthlyCost.length > 8 ? 1 : 0} />
                  <YAxis stroke="#8A7A5C" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={TOOLTIP_STYLE}
                    cursor={{ fill: '#F8F3E8' }}
                    formatter={(v) => [fmtCurrency(v), t('stats.vet.monthlyTooltip')]} />
                  <Bar dataKey="value" fill="#8A6B1F" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
          <ChartCard title={t('stats.vet.typesTitle')} hint={t('stats.vet.typesHint')}>
            {eventTypes.length === 0 ? (
              <EmptyMini label={t('stats.empty.noEvents')} />
            ) : (
              <DonutWithLegend data={eventTypes} totalLabel={t('stats.vet.typesTotal')} />
            )}
          </ChartCard>
        </div>
      </div>

      {/* Sección demografía */}
      <div>
        <h2 className="font-serif text-2xl mb-4" style={{ color: '#1A1712' }}>{t('stats.sec.demo')}</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <ChartCard title={t('stats.demo.sexTitle')} hint={t('stats.demo.sexHint')}>
            {sexDist.length === 0 ? (
              <EmptyMini label={t('stats.empty.noCats')} />
            ) : (
              <DonutWithLegend data={sexDist} totalLabel={t('stats.demo.sexTotal')} />
            )}
          </ChartCard>
          <div className="rounded-2xl p-5 flex flex-col justify-center"
               style={{ backgroundColor: '#F2EADB', boxShadow: '0 0 0 1px #EADFC9', minHeight: 240 }}>
            <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: '#8A7A5C' }}>{t('stats.demo.ageTitle')}</div>
            <p className="text-sm leading-relaxed" style={{ color: '#4A433C' }}>{t('stats.demo.ageMsg')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const EmptyMini = ({ label }) => (
  <div className="flex items-center justify-center h-full text-xs italic" style={{ color: '#8A7A5C' }}>
    {label}
  </div>
);

// ───── Vista principal: estadísticas de toda la org ───────────────────────

export const StatsView = ({ cats, colonies, events, reminders }) => {
  const { t } = useTranslation();
  const [colonyFilter, setColonyFilter] = useState('all'); // 'all' | colonyId
  const [rangeKey, setRangeKey] = useState('12m');         // '30d' | '12m' | 'ytd' | 'ly' | 'all'

  const range = useMemo(() => rangeFor(rangeKey), [rangeKey]);

  const scopedCats = useMemo(
    () => colonyFilter === 'all' ? cats : cats.filter(c => c.colonyId === colonyFilter),
    [cats, colonyFilter]
  );
  // Eventos: filtramos por colonia vía cat→colonyId.
  const scopedEvents = useMemo(() => {
    if (colonyFilter === 'all') return events;
    const ids = new Set(scopedCats.map(c => c.id));
    return events.filter(e => ids.has(e.catId));
  }, [events, scopedCats, colonyFilter]);
  const scopedReminders = useMemo(() => {
    if (colonyFilter === 'all') return reminders;
    const ids = new Set(scopedCats.map(c => c.id));
    return (reminders || []).filter(r => ids.has(r.catId));
  }, [reminders, scopedCats, colonyFilter]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: '#8A7A5C' }}>{t('stats.kicker')}</div>
        <h1 className="font-serif text-4xl md:text-5xl leading-tight" style={{ color: '#1A1712' }}>
          {t('stats.title')} <span className="italic" style={{ color: '#C67B5C' }}>{t('stats.titleEm')}</span>
        </h1>
        <p className="mt-3 text-[15px] max-w-xl" style={{ color: '#6B635A' }}>
          {t('stats.subtitle')}
        </p>
      </div>

      {/* Filtros */}
      <div className="rounded-2xl p-4 flex flex-col md:flex-row gap-3 md:items-end"
           style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: '#8A7A5C' }}>
            {t('stats.filter.colony')}
          </label>
          <select value={colonyFilter} onChange={e => setColonyFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
            <option value="all">{t('stats.filter.allColonies')}</option>
            {colonies.map(col => <option key={col.id} value={col.id}>{col.name}</option>)}
          </select>
        </div>
        <div className="flex-1 min-w-0">
          <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: '#8A7A5C' }}>
            {t('stats.filter.range')}
          </label>
          <select value={rangeKey} onChange={e => setRangeKey(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
            <option value="30d">{t('stats.range.30d')}</option>
            <option value="12m">{t('stats.range.12m')}</option>
            <option value="ytd">{t('stats.range.ytd')}</option>
            <option value="ly">{t('stats.range.ly')}</option>
            <option value="all">{t('stats.range.all')}</option>
          </select>
        </div>
      </div>

      <StatsCharts
        cats={scopedCats}
        events={scopedEvents}
        colonies={colonies}
        reminders={scopedReminders}
        range={range}
        showColonyBreakdown={colonyFilter === 'all'} />
    </div>
  );
};

// ───── Sub-vista para usar dentro de ColonyDetail ─────────────────────────
// Misma estructura pero sin selector de colonia (ya está fijada) y con su
// propio control de rango temporal.

export const ColonyStats = ({ colony, cats, events, reminders }) => {
  const { t } = useTranslation();
  const [rangeKey, setRangeKey] = useState('12m');
  const range = useMemo(() => rangeFor(rangeKey), [rangeKey]);

  const colCats = useMemo(() => cats.filter(c => c.colonyId === colony.id), [cats, colony.id]);
  const colEvents = useMemo(() => {
    const ids = new Set(colCats.map(c => c.id));
    return events.filter(e => ids.has(e.catId));
  }, [events, colCats]);
  const colReminders = useMemo(() => {
    const ids = new Set(colCats.map(c => c.id));
    return (reminders || []).filter(r => ids.has(r.catId));
  }, [reminders, colCats]);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl p-4"
           style={{ backgroundColor: '#FDFAF3', boxShadow: '0 0 0 1px #EADFC9' }}>
        <label className="block text-[10px] uppercase tracking-widest mb-1" style={{ color: '#8A7A5C' }}>
          {t('stats.filter.range')}
        </label>
        <select value={rangeKey} onChange={e => setRangeKey(e.target.value)}
                className="w-full md:max-w-xs px-3 py-2 rounded-lg text-sm outline-none" style={inputStyle}>
          <option value="30d">{t('stats.range.30d')}</option>
          <option value="12m">{t('stats.range.12m')}</option>
          <option value="ytd">{t('stats.range.ytd')}</option>
          <option value="ly">{t('stats.range.ly')}</option>
          <option value="all">{t('stats.range.all')}</option>
        </select>
      </div>

      <StatsCharts
        cats={colCats}
        events={colEvents}
        colonies={[]}
        reminders={colReminders}
        range={range}
        showColonyBreakdown={false} />
    </div>
  );
};
