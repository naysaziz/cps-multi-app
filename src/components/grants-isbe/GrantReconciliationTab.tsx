'use client';

import { useState, useCallback, useRef } from 'react';
import { ContractDetail } from '@/types';

// ─── Types ───────────────────────────────────────────────────

type FsgLine = {
  accountCode: string;
  objectCode: string;
  description: string;
  currentPeriod: number;
  inceptionToDate: number;
};

type BudgetLine = {
  accountCode: string;
  objectCode: string;
  description: string;
  amount: number;
};

type FsgData = { reportDate?: string; lines: FsgLine[] };
type BudgetData = { lines: BudgetLine[]; totalAmount: number };

// keyed by "acct|obj"
type AdjMap = Record<
  string,
  { overrun: number | null; adjustment: number | null }
>;

// ─── Helpers ─────────────────────────────────────────────────

function usd(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(n);
}

function parseFsgLines(raw: unknown): FsgLine[] {
  if (!raw || typeof raw !== 'object') return [];
  const data = raw as FsgData;
  if (!Array.isArray(data.lines)) return [];
  return data.lines.filter(
    (l) => typeof l.accountCode === 'string' && typeof l.objectCode === 'string'
  );
}

function parseBudgetLines(raw: unknown): BudgetLine[] {
  if (Array.isArray(raw)) {
    return raw.filter(
      (line): line is BudgetLine =>
        !!line &&
        typeof line === 'object' &&
        typeof (line as BudgetLine).accountCode === 'string' &&
        typeof (line as BudgetLine).objectCode === 'string' &&
        typeof (line as BudgetLine).amount === 'number'
    );
  }
  if (!raw || typeof raw !== 'object') return [];
  const data = raw as BudgetData;
  if (!Array.isArray(data.lines)) return [];
  return data.lines.filter(
    (line): line is BudgetLine =>
      typeof line.accountCode === 'string' &&
      typeof line.objectCode === 'string' &&
      typeof line.amount === 'number'
  );
}

function getFsgReportDate(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  return (raw as FsgData).reportDate ?? null;
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  const iso = value;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      }
    );
  }
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

// Get function label from any data source
function getFuncLabel(
  acct: string,
  allSources: { accountCode: string; description?: string }[]
): string {
  const match = allSources.find((l) => l.accountCode === acct);
  return match?.description ?? '';
}

function parseAdjMap(raw: unknown): AdjMap {
  if (!raw || typeof raw !== 'object') return {};
  return raw as AdjMap;
}

// ─── Comma-formatted number input ────────────────────────────

function NumberInput({
  value,
  onChange,
  disabled
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  disabled?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  const [raw, setRaw] = useState('');

  const displayValue = focused
    ? raw
    : value !== null
      ? new Intl.NumberFormat('en-US').format(value)
      : '';

  function handleFocus() {
    setRaw(value !== null ? String(value) : '');
    setFocused(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    // Allow digits, minus sign, decimal point
    const cleaned = e.target.value.replace(/[^0-9.\-]/g, '');
    setRaw(cleaned);
  }

  function handleBlur() {
    setFocused(false);
    const parsed = parseFloat(raw);
    if (raw === '' || raw === '-') {
      onChange(null);
    } else if (!isNaN(parsed)) {
      onChange(parsed);
    }
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={displayValue}
      disabled={disabled}
      onFocus={handleFocus}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder="—"
      className={`w-22 text-right tabular-nums text-xs rounded border px-1.5 py-0.5
        focus:outline-none focus:ring-2 focus:ring-cobalt/30 focus:border-cobalt
        transition-colors
        ${
          disabled
            ? 'bg-gray-50 text-charcoal-muted border-border cursor-not-allowed'
            : 'bg-white border-border hover:border-cobalt/40 text-charcoal'
        }`}
    />
  );
}

// ─── Stat Card ───────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  accent
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  accent?: 'cobalt' | 'green' | 'amber' | 'red' | 'muted';
}) {
  const colors = {
    cobalt: 'text-cobalt',
    green: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
    muted: 'text-charcoal-muted'
  };
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm px-5 py-4">
      <p className="text-xs font-medium text-charcoal-muted uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className={`text-2xl font-bold ${colors[accent ?? 'cobalt']}`}>
        {value}
      </p>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function GrantReconciliationTab({
  contract
}: {
  contract: ContractDetail;
}) {
  const currentFsg = contract.fsgReports.find((r) => r.period === 'current');
  const nextFsg = contract.fsgReports.find((r) => r.period === 'next');
  const budget = contract.budgetUploads[0];

  const budgetLines = parseBudgetLines(budget?.parsedData);
  const currentLines = parseFsgLines(currentFsg?.parsedData);
  const nextLines = parseFsgLines(nextFsg?.parsedData);

  const rawBudgetLines = Array.isArray(
    (budget?.parsedData as { lines?: unknown[] } | null)?.lines
  )
    ? ((budget?.parsedData as { lines?: unknown[] }).lines ?? [])
    : Array.isArray(budget?.parsedData)
      ? (budget?.parsedData as unknown[])
      : [];
  const rawCurrentLines = Array.isArray(
    (currentFsg?.parsedData as { lines?: unknown[] } | null)?.lines
  )
    ? ((currentFsg?.parsedData as { lines?: unknown[] }).lines ?? [])
    : [];
  const rawNextLines = Array.isArray(
    (nextFsg?.parsedData as { lines?: unknown[] } | null)?.lines
  )
    ? ((nextFsg?.parsedData as { lines?: unknown[] }).lines ?? [])
    : [];
  const hasLegacyBudgetData =
    rawBudgetLines.length > 0 && budgetLines.length === 0;
  const hasLegacyFsgData =
    (rawCurrentLines.length > 0 && currentLines.length === 0) ||
    (rawNextLines.length > 0 && nextLines.length === 0);

  const currentDate = formatDate(getFsgReportDate(currentFsg?.parsedData));
  const nextDate = formatDate(getFsgReportDate(nextFsg?.parsedData));
  const budgetDate = budget ? formatDate(budget.uploadedAt) : null;

  // ─── Manual adjustments state ────────────────────────────

  const [adjMap, setAdjMap] = useState<AdjMap>(() =>
    parseAdjMap(contract.reconciliationAdjustments)
  );
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateAdj = useCallback(
    (key: string, field: 'overrun' | 'adjustment', val: number | null) => {
      setAdjMap((prev) => ({
        ...prev,
        [key]: {
          ...(prev[key] ?? { overrun: null, adjustment: null }),
          [field]: val
        }
      }));
      setDirty(true);
      // Debounced auto-save
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        setSaving(true);
        try {
          await fetch(`/api/grants-isbe/${contract.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              reconciliationAdjustments: {
                ...adjMap,
                [key]: {
                  ...(adjMap[key] ?? { overrun: null, adjustment: null }),
                  [field]: val
                }
              }
            })
          });
          setDirty(false);
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [adjMap, contract.id]
  );

  // ─── Collapse state ───────────────────────────────────────

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  function toggleCollapse(acct: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(acct)) next.delete(acct);
      else next.add(acct);
      return next;
    });
  }

  // ─── Build lookup maps ────────────────────────────────────

  const budgetMap = new Map<string, BudgetLine>();
  for (const l of budgetLines)
    budgetMap.set(`${l.accountCode}|${l.objectCode}`, l);

  const currentMap = new Map<string, FsgLine>();
  for (const l of currentLines)
    currentMap.set(`${l.accountCode}|${l.objectCode}`, l);

  const nextMap = new Map<string, FsgLine>();
  for (const l of nextLines) nextMap.set(`${l.accountCode}|${l.objectCode}`, l);

  // For function label lookup — use description from budget (strips obj suffix) or FSG
  const allFsgLines = [...currentLines, ...nextLines];

  const allKeys = new Set<string>([
    ...budgetMap.keys(),
    ...currentMap.keys(),
    ...nextMap.keys()
  ]);

  const accountCodes = [
    ...new Set([...allKeys].map((k) => k.split('|')[0]))
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  function getDesc(acct: string, obj: string): string {
    const key = `${acct}|${obj}`;
    return (
      budgetMap.get(key)?.description ??
      currentMap.get(key)?.description ??
      nextMap.get(key)?.description ??
      ''
    );
  }

  function getFuncDescription(acct: string): string {
    // Try FSG function description first
    const fsgMatch = allFsgLines.find((l) => l.accountCode === acct);
    if (
      fsgMatch &&
      (fsgMatch as FsgLine & { functionDescription?: string })
        .functionDescription
    ) {
      return (fsgMatch as FsgLine & { functionDescription?: string })
        .functionDescription!;
    }
    // Fall back to budget description stripped of object suffix
    const budgetMatch = budgetLines.find((l) => l.accountCode === acct);
    if (budgetMatch) {
      // Budget description is like "Salaries" — not the function. Look for unique description
      return getFuncLabel(
        acct,
        allFsgLines.map((l) => ({
          accountCode: l.accountCode,
          description: l.description
        }))
      );
    }
    return '';
  }

  // ─── Totals ───────────────────────────────────────────────

  let totalBudget = 0;
  let totalCurrentITD = 0;
  let totalNextITD = 0;
  let totalProgram = 0;
  let totalNoBudget = 0;
  let totalOverrun = 0;
  let totalAdjustment = 0;
  let totalCumulative = 0;
  let totalUnexpended = 0;

  for (const key of allKeys) {
    const budgetAmt = budgetMap.get(key)?.amount ?? null;
    const currentITD = currentMap.get(key)?.inceptionToDate ?? 0;
    const nextITD = nextMap.get(key)?.inceptionToDate ?? 0;
    const total = Math.max(currentITD, nextITD);
    const noBudget = total !== 0 && budgetAmt === null ? -total : 0;
    const adj = adjMap[key] ?? { overrun: null, adjustment: null };
    const overrun = adj.overrun ?? 0;
    const adjustment = adj.adjustment ?? 0;
    const cumulative = total + noBudget + overrun + adjustment;
    const unexpended = (budgetAmt ?? 0) - cumulative;

    if (budgetAmt !== null) totalBudget += budgetAmt;
    totalCurrentITD += currentITD;
    totalNextITD += nextITD;
    totalProgram += total;
    totalNoBudget += noBudget;
    totalOverrun += overrun;
    totalAdjustment += adjustment;
    totalCumulative += cumulative;
    totalUnexpended += unexpended;
  }

  const rawPctUsed = totalBudget > 0 ? (totalProgram / totalBudget) * 100 : 0;
  const pctUsed = Math.min(rawPctUsed, 100);

  const budgetData = budget?.parsedData as BudgetData | null;
  const budgetTotalField = budgetData?.totalAmount ?? null;
  const mismatch =
    budgetTotalField !== null &&
    Math.abs(budgetTotalField - totalBudget) > 0.01;

  const hasAnyData =
    budgetLines.length > 0 || currentLines.length > 0 || nextLines.length > 0;
  const canEdit = contract.canEdit;

  const allCollapsed = collapsed.size === accountCodes.length;
  function toggleAll() {
    if (allCollapsed) setCollapsed(new Set());
    else setCollapsed(new Set(accountCodes));
  }

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Budget"
          value={usd(totalBudget)}
          accent="muted"
        />
        <StatCard
          label="Total Program Cost"
          value={usd(totalProgram)}
          accent="cobalt"
        />
        <StatCard
          label="Unexpended Balance"
          value={usd(Math.abs(totalUnexpended))}
          accent={totalUnexpended >= 0 ? 'green' : 'red'}
          sub={
            <span
              className={`text-xs font-medium ${totalUnexpended >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
            >
              {totalUnexpended >= 0 ? 'Under budget' : 'Over budget'}
            </span>
          }
        />
        <StatCard
          label="% Utilized"
          value={`${pctUsed.toFixed(1)}%`}
          accent={
            rawPctUsed > 100 ? 'red' : rawPctUsed > 90 ? 'amber' : 'cobalt'
          }
          sub={
            <div className="mt-1 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  rawPctUsed > 100
                    ? 'bg-red-500'
                    : rawPctUsed > 90
                      ? 'bg-amber-400'
                      : 'bg-cobalt'
                }`}
                style={{ width: `${Math.min(pctUsed, 100)}%` }}
              />
            </div>
          }
        />
      </div>

      {/* Sanity banner */}
      {mismatch && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <span className="text-amber-500 mt-0.5 font-bold">!</span>
          <p className="text-sm text-amber-800">
            Budget and reconciliation totals do not match. The uploaded budget
            file total ({usd(budgetTotalField!)}) differs from the sum of all
            budget lines ({usd(totalBudget)}). Consider re-uploading the budget
            file.
          </p>
        </div>
      )}

      {/* Reconciliation table */}
      <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
        {/* Table header bar */}
        <div className="px-5 py-4 border-b border-border flex items-center gap-4 flex-wrap">
          <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wide flex-1">
            Budget vs. Actuals by Function Code
          </p>
          <div className="flex items-center gap-4 text-xs text-charcoal-muted">
            {budgetDate && <span>Budget: {budgetDate}</span>}
            {currentDate && <span>FSG Current: {currentDate}</span>}
            {nextDate && <span>FSG Next: {nextDate}</span>}
          </div>
          {saving && (
            <span className="text-xs text-charcoal-muted italic">Saving…</span>
          )}
          {dirty && !saving && (
            <span className="text-xs text-amber-600">Unsaved changes</span>
          )}
          {hasAnyData && (
            <button
              onClick={toggleAll}
              className="text-xs font-medium text-cobalt hover:text-cobalt/70 border border-cobalt/30 rounded-md px-3 py-1 transition-colors"
            >
              {allCollapsed ? 'Expand All' : 'Collapse All'}
            </button>
          )}
        </div>

        {!hasAnyData ? (
          <div className="py-16 text-center">
            <p className="text-charcoal-muted text-sm">No data available.</p>
            <p className="text-xs text-gray-400 mt-1">
              {hasLegacyBudgetData || hasLegacyFsgData
                ? 'At least one uploaded file uses the older parsed-data format. Re-upload the budget/FSG files to populate reconciliation.'
                : 'Upload a budget and at least one FSG report to see reconciliation.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-gray-50 border-b border-border text-[11px] font-medium text-charcoal-muted uppercase tracking-wide">
                  <th className="px-3 py-2 text-left min-w-[160px]">
                    Object / Description
                  </th>
                  <th className="px-3 py-2 text-right min-w-[90px]">Budget</th>
                  <th className="px-3 py-2 text-right min-w-[90px]">
                    FSG Current
                  </th>
                  <th className="px-3 py-2 text-right min-w-[90px]">
                    FSG Next
                  </th>
                  <th className="px-3 py-2 text-right min-w-[100px]">
                    Total Program Cost
                  </th>
                  <th className="px-3 py-2 text-right min-w-[110px]">
                    Budget Line Overrun
                  </th>
                  <th className="px-3 py-2 text-right min-w-[85px]">
                    No Budget
                  </th>
                  <th className="px-3 py-2 text-right min-w-[110px]">
                    Adjustment
                  </th>
                  <th className="px-3 py-2 text-right min-w-[100px]">
                    Cumulative Total
                  </th>
                  <th className="px-3 py-2 text-right min-w-[110px]">
                    YTD Unexpended Balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {accountCodes.map((acct) => {
                  const objCodes = [
                    ...new Set(
                      [...allKeys]
                        .filter((k) => k.startsWith(`${acct}|`))
                        .map((k) => k.split('|')[1])
                    )
                  ].sort((a, b) =>
                    a.localeCompare(b, undefined, { numeric: true })
                  );

                  // Group subtotals
                  let acctBudget = 0;
                  let acctBudgetHasValue = false;
                  let acctCurrentITD = 0;
                  let acctNextITD = 0;
                  let acctTotal = 0;
                  let acctNoBudget = 0;
                  let acctOverrun = 0;
                  let acctAdjustment = 0;
                  let acctCumulative = 0;
                  let acctUnexpended = 0;

                  for (const obj of objCodes) {
                    const key = `${acct}|${obj}`;
                    const budgetAmt = budgetMap.get(key)?.amount ?? null;
                    const currentITD =
                      currentMap.get(key)?.inceptionToDate ?? 0;
                    const nextITD = nextMap.get(key)?.inceptionToDate ?? 0;
                    const total = Math.max(currentITD, nextITD);
                    const noBudget =
                      total !== 0 && budgetAmt === null ? -total : 0;
                    const adj = adjMap[key] ?? {
                      overrun: null,
                      adjustment: null
                    };
                    const overrun = adj.overrun ?? 0;
                    const adjustment = adj.adjustment ?? 0;
                    const cumulative = total + noBudget + overrun + adjustment;
                    const unexpended = (budgetAmt ?? 0) - cumulative;

                    if (budgetAmt !== null) {
                      acctBudget += budgetAmt;
                      acctBudgetHasValue = true;
                    }
                    acctCurrentITD += currentITD;
                    acctNextITD += nextITD;
                    acctTotal += total;
                    acctNoBudget += noBudget;
                    acctOverrun += overrun;
                    acctAdjustment += adjustment;
                    acctCumulative += cumulative;
                    acctUnexpended += unexpended;
                  }

                  const isCollapsed = collapsed.has(acct);
                  const funcDesc = getFuncDescription(acct);

                  return (
                    <>
                      {/* Function code section header (always visible) */}
                      <tr
                        key={`group-${acct}`}
                        className="bg-cobalt/5 border-y border-cobalt/10 cursor-pointer select-none hover:bg-cobalt/10 transition-colors text-[14px]"
                        onClick={() => toggleCollapse(acct)}
                      >
                        <td className="px-3 py-1.5 font-semibold text-cobalt uppercase tracking-wide">
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="text-cobalt/60 text-[10px] transition-transform duration-150"
                              style={{
                                display: 'inline-block',
                                transform: isCollapsed
                                  ? 'rotate(-90deg)'
                                  : 'rotate(0deg)'
                              }}
                            >
                              ▼
                            </span>
                            <span>
                              {acct}
                              {funcDesc ? ` — ${funcDesc}` : ''}
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold text-charcoal tabular-nums">
                          {acctBudgetHasValue ? (
                            usd(acctBudget)
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold text-charcoal tabular-nums">
                          {acctCurrentITD !== 0 ? (
                            usd(acctCurrentITD)
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold text-charcoal tabular-nums">
                          {acctNextITD !== 0 ? (
                            usd(acctNextITD)
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold text-charcoal tabular-nums">
                          {acctTotal !== 0 ? (
                            usd(acctTotal)
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold text-charcoal tabular-nums">
                          {acctOverrun !== 0 ? (
                            usd(acctOverrun)
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold tabular-nums">
                          {acctNoBudget !== 0 ? (
                            <span className="text-amber-700">
                              {usd(acctNoBudget)}
                            </span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold text-charcoal tabular-nums">
                          {acctAdjustment !== 0 ? (
                            usd(acctAdjustment)
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold text-charcoal tabular-nums">
                          {usd(acctCumulative)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-semibold tabular-nums">
                          <span
                            className={
                              acctUnexpended >= 0
                                ? 'text-emerald-700'
                                : 'text-red-700'
                            }
                          >
                            {usd(acctUnexpended)}
                          </span>
                        </td>
                      </tr>

                      {/* Detail rows (collapsed when toggled) */}
                      {!isCollapsed &&
                        objCodes.map((obj, i) => {
                          const key = `${acct}|${obj}`;
                          const budgetLine = budgetMap.get(key);
                          const currentLine = currentMap.get(key);
                          const nextLine = nextMap.get(key);
                          const budgetAmt = budgetLine?.amount ?? null;
                          const currentITD = currentLine?.inceptionToDate ?? 0;
                          const nextITD = nextLine?.inceptionToDate ?? 0;
                          const total = Math.max(currentITD, nextITD);
                          const noBudget =
                            total !== 0 && budgetAmt === null ? -total : 0;
                          const adj = adjMap[key] ?? {
                            overrun: null,
                            adjustment: null
                          };
                          const overrun = adj.overrun ?? 0;
                          const adjustment = adj.adjustment ?? 0;
                          const cumulative =
                            total + noBudget + overrun + adjustment;
                          const unexpended = (budgetAmt ?? 0) - cumulative;

                          return (
                            <tr
                              key={key}
                              className={`border-b border-border hover:bg-gray-50/60 transition-colors ${
                                i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                              }`}
                            >
                              <td className="px-3 py-1.5 pl-7">
                                <span className="font-mono text-[11px] text-cobalt/70 mr-1.5">
                                  {obj}
                                </span>
                                <span className="text-charcoal">
                                  {getDesc(acct, obj)}
                                </span>
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-charcoal">
                                {budgetAmt !== null ? (
                                  usd(budgetAmt)
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-charcoal">
                                {currentITD !== 0 ? (
                                  usd(currentITD)
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums text-charcoal">
                                {nextITD !== 0 ? (
                                  usd(nextITD)
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-right tabular-nums font-medium text-charcoal">
                                {total !== 0 ? (
                                  usd(total)
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              {/* Budget Line Overrun — manual input */}
                              <td className="px-3 py-1.5 text-right">
                                <NumberInput
                                  value={adj.overrun ?? null}
                                  disabled={!canEdit}
                                  onChange={(v) => updateAdj(key, 'overrun', v)}
                                />
                              </td>
                              {/* No Budget — formula */}
                              <td className="px-3 py-1.5 text-right tabular-nums">
                                {noBudget !== 0 ? (
                                  <span className="text-amber-700 font-medium">
                                    {usd(noBudget)}
                                  </span>
                                ) : (
                                  <span className="text-gray-300">—</span>
                                )}
                              </td>
                              {/* Adjustment — manual input */}
                              <td className="px-3 py-1.5 text-right">
                                <NumberInput
                                  value={adj.adjustment ?? null}
                                  disabled={!canEdit}
                                  onChange={(v) =>
                                    updateAdj(key, 'adjustment', v)
                                  }
                                />
                              </td>
                              {/* Cumulative Total */}
                              <td className="px-3 py-1.5 text-right tabular-nums font-medium text-charcoal">
                                {usd(cumulative)}
                              </td>
                              {/* YTD Unexpended Balance */}
                              <td className="px-3 py-1.5 text-right tabular-nums font-medium">
                                <span
                                  className={
                                    unexpended >= 0
                                      ? 'text-emerald-700'
                                      : 'text-red-700'
                                  }
                                >
                                  {usd(unexpended)}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </>
                  );
                })}

                {/* Grand total footer */}
                <tr className="bg-cobalt/10 font-bold border-t-2 border-cobalt/30">
                  <td className="px-3 py-2 text-charcoal">Grand Total</td>
                  <td className="px-3 py-2 text-right tabular-nums text-charcoal">
                    {totalBudget !== 0 ? usd(totalBudget) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-charcoal">
                    {totalCurrentITD !== 0 ? usd(totalCurrentITD) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-charcoal">
                    {totalNextITD !== 0 ? usd(totalNextITD) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-cobalt">
                    {usd(totalProgram)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-charcoal">
                    {totalOverrun !== 0 ? usd(totalOverrun) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {totalNoBudget !== 0 ? (
                      <span className="text-amber-700">
                        {usd(totalNoBudget)}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-charcoal">
                    {totalAdjustment !== 0 ? usd(totalAdjustment) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-cobalt">
                    {usd(totalCumulative)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <span
                      className={
                        totalUnexpended >= 0
                          ? 'text-emerald-700'
                          : 'text-red-700'
                      }
                    >
                      {usd(totalUnexpended)}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
