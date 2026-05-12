import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Target,
  Activity,
  BarChart3,
  History,
  Award,
  CheckCircle2,
  ArrowUpRight,
  ArrowDownRight,
  Upload,
  X,
  FileText,
} from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { supabase } from './supabaseClient';

const STARTING_CAPITAL = 500.0;
const TARGET_CAPITAL = 100000.0;

const initialTrades = [
  { id: 205031048, symbol: 'XAUUSD', type: 'sell', volume: 0.01, profit: 20.8, time: '2026.04.29' },
  { id: 205107327, symbol: 'XAUUSD', type: 'sell', volume: 0.01, profit: 11.94, time: '2026.04.29' },
  { id: 205107329, symbol: 'XAUUSD', type: 'sell', volume: 0.01, profit: 11.94, time: '2026.04.29' },
  { id: 205107331, symbol: 'XAUUSD', type: 'sell', volume: 0.01, profit: 11.94, time: '2026.04.29' },
  { id: 205527816, symbol: 'XAUUSD', type: 'sell', volume: 0.01, profit: -12.44, time: '2026.04.30' },
  { id: 205527818, symbol: 'XAUUSD', type: 'sell', volume: 0.01, profit: -12.44, time: '2026.04.30' },
  { id: 205527820, symbol: 'XAUUSD', type: 'sell', volume: 0.01, profit: -12.44, time: '2026.04.30' },
  { id: 205530138, symbol: 'XAUUSD', type: 'buy', volume: 0.01, profit: 5.76, time: '2026.04.30' },
  { id: 161864817, symbol: 'XAUUSD', type: 'buy', volume: 0.02, profit: 46.54, time: '2026.05.07' },
  { id: 161864819, symbol: 'XAUUSD', type: 'buy', volume: 0.02, profit: 46.54, time: '2026.05.07' },
  { id: 162123512, symbol: 'XAUUSD', type: 'sell', volume: 0.01, profit: -13.06, time: '2026.05.08' },
  { id: 162123514, symbol: 'XAUUSD', type: 'sell', volume: 0.01, profit: -13.06, time: '2026.05.08' },
  { id: 162123516, symbol: 'XAUUSD', type: 'sell', volume: 0.01, profit: -13.06, time: '2026.05.08' },
  { id: 162153835, symbol: 'XAUUSD', type: 'sell', volume: 0.02, profit: 49.32, time: '2026.05.08' },
  { id: 162153837, symbol: 'XAUUSD', type: 'sell', volume: 0.02, profit: 49.32, time: '2026.05.08' },
  { id: 163013146, symbol: 'XAUUSD', type: 'buy', volume: 0.02, profit: -46.72, time: '2026.05.11' },
  { id: 163013148, symbol: 'XAUUSD', type: 'buy', volume: 0.02, profit: -46.72, time: '2026.05.11' },
  { id: 163698350, symbol: 'XAUUSD', type: 'buy', volume: 0.02, profit: 45.86, time: '2026.05.12' },
  { id: 163698352, symbol: 'XAUUSD', type: 'buy', volume: 0.02, profit: 45.86, time: '2026.05.12' },
  { id: 163698354, symbol: 'XAUUSD', type: 'buy', volume: 0.02, profit: 45.86, time: '2026.05.12' },
];

const App = () => {
  const [tradeHistory, setTradeHistory] = useState(initialTrades);
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [challengeTitle, setChallengeTitle] = useState('$500 → $100K Challenge');
  const [startingCapital, setStartingCapital] = useState(STARTING_CAPITAL);
  const [targetCapital, setTargetCapital] = useState(TARGET_CAPITAL);
  const [draftChallengeTitle, setDraftChallengeTitle] = useState('$500 → $100K Challenge');
  const [draftStartingCapital, setDraftStartingCapital] = useState(STARTING_CAPITAL);
  const [draftTargetCapital, setDraftTargetCapital] = useState(TARGET_CAPITAL);
  const [isChallengeOpen, setIsChallengeOpen] = useState(false);
  const [lastChallenge, setLastChallenge] = useState(null);
  const fileInputRef = useRef(null);

  const CHALLENGE_STORAGE_KEY = '500k-dashboard:active-challenge';
  const LAST_CHALLENGE_STORAGE_KEY = '500k-dashboard:last-challenge';

  const safeParseJSON = (value) => {
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  };

  const saveActiveChallenge = (state) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(CHALLENGE_STORAGE_KEY, JSON.stringify(state));
  };

  const loadActiveChallenge = () => {
    if (typeof window === 'undefined') return null;
    return safeParseJSON(window.localStorage.getItem(CHALLENGE_STORAGE_KEY));
  };

  const saveLastChallenge = (state) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(LAST_CHALLENGE_STORAGE_KEY, JSON.stringify(state));
    setLastChallenge(state);
  };

  const loadLastChallenge = () => {
    if (typeof window === 'undefined') return null;
    return safeParseJSON(window.localStorage.getItem(LAST_CHALLENGE_STORAGE_KEY));
  };

  const restoreLastChallenge = () => {
    const saved = loadLastChallenge();
    if (!saved) {
      setImportStatus('No archived challenge found to restore.');
      return;
    }

    setChallengeTitle(saved.challengeTitle || '$500 → $100K Challenge');
    setStartingCapital(saved.startingCapital || STARTING_CAPITAL);
    setTargetCapital(saved.targetCapital || TARGET_CAPITAL);
    setTradeHistory(saved.tradeHistory || []);
    setImportStatus('Previous challenge restored from archive.');
  };

  useEffect(() => {
    const savedActive = loadActiveChallenge();
    const savedLast = loadLastChallenge();

    if (savedLast) {
      setLastChallenge(savedLast);
    }

    if (savedActive) {
      setChallengeTitle(savedActive.challengeTitle || '$500 → $100K Challenge');
      setStartingCapital(savedActive.startingCapital || STARTING_CAPITAL);
      setTargetCapital(savedActive.targetCapital || TARGET_CAPITAL);
      setTradeHistory(savedActive.tradeHistory || []);
      setIsLoading(false);
      return;
    }

    const fetchTrades = async () => {
      if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
        setImportStatus('Supabase credentials missing. Use .env or Netlify env vars.');
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        setImportStatus(`Failed to load Supabase trades: ${error.message}`);
      } else if (data?.length) {
        setTradeHistory(
          data.map((row) => ({
            ...row,
            volume: parseFloat(row.volume),
            profit: parseFloat(row.profit),
          }))
        );
      }
      setIsLoading(false);
    };

    fetchTrades();
  }, []);

  const openChallengeModal = () => {
    setDraftChallengeTitle(challengeTitle);
    setDraftStartingCapital(startingCapital);
    setDraftTargetCapital(targetCapital);
    setIsChallengeOpen(true);
  };

  const closeChallengeModal = () => {
    setIsChallengeOpen(false);
  };

  const startNewChallenge = () => {
    if (tradeHistory.length > 0) {
      saveLastChallenge({
        challengeTitle,
        startingCapital,
        targetCapital,
        tradeHistory,
      });
    }

    const nextStarting = Number(draftStartingCapital) || 0;
    const nextTarget = Number(draftTargetCapital) || 0;
    const nextTitle = draftChallengeTitle.trim() || 'New Challenge';

    setStartingCapital(nextStarting);
    setTargetCapital(nextTarget);
    setChallengeTitle(nextTitle);
    setTradeHistory([]);
    setImportStatus(`Started a fresh challenge: ${nextTitle}`);
    setIsChallengeOpen(false);
  };

  useEffect(() => {
    saveActiveChallenge({
      challengeTitle,
      startingCapital,
      targetCapital,
      tradeHistory,
    });
  }, [challengeTitle, startingCapital, targetCapital, tradeHistory]);

  const normalizeHeader = (value) => String(value || '').trim().toLowerCase();

  const buildColumnMap = (headerRow) => {
    const columnMap = {};

    headerRow.forEach((cell, index) => {
      const label = normalizeHeader(cell);

      if (/position|ticket|order|ticket #|order #/.test(label)) {
        columnMap.id = index;
      }
      if (/symbol|item|instrument|pair/.test(label)) {
        columnMap.symbol = index;
      }
      if (/^type$/.test(label)) {
        columnMap.type = index;
      }
      if (/volume|size|lots/.test(label)) {
        columnMap.volume = index;
      }
      if (/profit|pnl|net profit/.test(label)) {
        columnMap.profit = index;
      }
      if (/open time|open date|close time|close date|time|date/.test(label)) {
        if (!columnMap.time || /open/.test(label) || /close/.test(label)) {
          columnMap.time = index;
        }
      }
    });

    return columnMap;
  };

  const parseNumeric = (value) => {
    const cleaned = String(value ?? '').replace(/[, ]+/g, '').replace(/[^0-9.\-]/g, '');
    const parsed = parseFloat(cleaned);
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const detectHeaderRow = (rows) => {
    return rows.findIndex((row) =>
      Array.isArray(row) && row.some((cell) => {
        const label = normalizeHeader(cell);
        return /ticket|order|symbol|type|volume|profit|pnl/.test(label);
      })
    );
  };

  const parseFileRows = async (file) => {
    const isExcel = /\.(xls|xlsx)$/i.test(file.name);

    if (isExcel) {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
    }

    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (err) => reject(err),
      });
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Processing file...');

    try {
      const rows = await parseFileRows(file);
      const existingIds = new Set(tradeHistory.map((t) => t.id));
      const newTrades = [];
      let skipped = 0;

      const headerIndex = detectHeaderRow(rows);
      const headerMap = headerIndex >= 0 ? buildColumnMap(rows[headerIndex]) : {};
      const dataRows = headerIndex >= 0 ? rows.slice(headerIndex + 1) : rows;

      dataRows.forEach((row) => {
        if (!Array.isArray(row) || row.length === 0) return;

        const rawTime = headerMap.time != null ? row[headerMap.time] : row[0];
        const time = String(rawTime ?? '').split(' ')[0];
        const posId = parseInt(
          headerMap.id != null ? row[headerMap.id] : row[1],
          10
        );
        const symbol = String(headerMap.symbol != null ? row[headerMap.symbol] : row[2] ?? '').trim();
        const type = String(headerMap.type != null ? row[headerMap.type] : row[3] ?? '').trim().toLowerCase();
        const volume = parseNumeric(headerMap.volume != null ? row[headerMap.volume] : row[4]);
        const profit = parseNumeric(headerMap.profit != null ? row[headerMap.profit] : row[12]);

        if (!Number.isNaN(posId) && symbol && (type === 'buy' || type === 'sell') && !Number.isNaN(profit)) {
          if (!existingIds.has(posId)) {
            newTrades.push({ id: posId, symbol, type, volume, profit, time });
          } else {
            skipped += 1;
          }
        }
      });

      if (newTrades.length > 0) {
        const tradeIds = newTrades.map((trade) => trade.id);
        const { data: existingRows, error: existingError } = await supabase
          .from('trades')
          .select('id')
          .in('id', tradeIds);

        if (existingError) {
          setImportStatus(`Supabase duplicate check failed: ${existingError.message}`);
        } else {
          const existingIdsFromDb = new Set(existingRows?.map((row) => row.id) ?? []);
          const filteredTrades = newTrades.filter((trade) => !existingIdsFromDb.has(trade.id));
          skipped += newTrades.length - filteredTrades.length;

          if (filteredTrades.length > 0) {
            const { error } = await supabase.from('trades').insert(filteredTrades);
            if (error) {
              setImportStatus(`Supabase insert failed: ${error.message}`);
            } else {
              setTradeHistory((prev) => [...prev, ...filteredTrades].sort((a, b) => a.id - b.id));
              setImportStatus(`Added ${filteredTrades.length} new trades. Skipped ${skipped} duplicates.`);
            }
          } else {
            setImportStatus(`No new trades to insert. Skipped ${skipped} duplicates.`);
          }
        }
      } else {
        setImportStatus(`No new trades found. Skipped ${skipped} duplicates or malformed rows.`);
      }
    } catch (err) {
      setImportStatus('Error reading file: ' + (err?.message || 'Unable to parse file.'));
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const metrics = useMemo(() => {
    let currentBalance = startingCapital;
    const equityCurve = [{ time: 'Start', balance: startingCapital }];
    let grossProfit = 0;
    let grossLoss = 0;
    let wins = 0;
    let losses = 0;
    let maxDD = 0;
    let peak = startingCapital;

    tradeHistory.forEach((t, index) => {
      currentBalance += t.profit;
      equityCurve.push({ time: `T${index + 1}`, balance: parseFloat(currentBalance.toFixed(2)) });
      if (t.profit > 0) {
        grossProfit += t.profit;
        wins += 1;
      } else {
        grossLoss += Math.abs(t.profit);
        losses += 1;
      }
      if (currentBalance > peak) peak = currentBalance;
      const dd = ((peak - currentBalance) / peak) * 100;
      if (dd > maxDD) maxDD = dd;
    });

    const totalTrades = wins + losses;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
    const avgWin = wins > 0 ? grossProfit / wins : 0;
    const avgLoss = losses > 0 ? grossLoss / losses : 0;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit;
    const expectancy = totalTrades > 0 ? (winRate / 100) * avgWin - ((1 - winRate / 100) * avgLoss) : 0;
    const progress = targetCapital > 0 ? (currentBalance / targetCapital) * 100 : 0;

    return {
      balance: currentBalance,
      left: targetCapital - currentBalance,
      progress,
      winRate,
      profitFactor,
      expectancy,
      maxDD,
      equityCurve,
      totalTrades,
    };
  }, [tradeHistory, startingCapital, targetCapital]);

  const dailyPnL = useMemo(() => {
    const map = {};
    tradeHistory.forEach((t) => {
      map[t.time] = (map[t.time] || 0) + t.profit;
    });
    return Object.entries(map).map(([date, pnl]) => ({
      date: date.split('.').slice(1).join('/'),
      pnl: parseFloat(pnl.toFixed(2)),
    }));
  }, [tradeHistory]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{challengeTitle}</h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-500" />
              Real-time Trading Performance
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={openChallengeModal}
              className="flex items-center gap-2 border border-slate-200 bg-white text-slate-900 px-4 py-2 rounded-2xl text-sm hover:bg-slate-50 transition-all"
            >
              <Target size={16} />
              Start New Challenge
            </button>
            {lastChallenge && (
              <button
                onClick={restoreLastChallenge}
                className="flex items-center gap-2 border border-slate-200 bg-slate-50 text-slate-900 px-4 py-2 rounded-2xl text-sm hover:bg-slate-100 transition-all"
              >
                Restore Last Challenge
              </button>
            )}
            <div className="flex items-center gap-2">
              {importStatus && (
                <div className="bg-blue-50 border border-blue-100 text-blue-700 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
                  {importStatus}
                  <button onClick={() => setImportStatus(null)} className="hover:text-blue-900">
                    <X size={12} />
                  </button>
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
                accept=".csv,.xls,.xlsx"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isImporting}
                className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
              >
                <Upload size={16} />
                {isImporting ? 'Importing...' : 'Sync MT5 Data'}
              </button>
            </div>

            <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
              <div className="px-4 py-2 bg-emerald-50 rounded-xl">
                <p className="text-xs font-semibold text-emerald-600 uppercase">Phase</p>
                <p className="text-sm font-bold text-emerald-900">STAGE 1</p>
              </div>
            </div>
          </div>
        </div>

        {isChallengeOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between gap-4 border-b border-slate-200 px-6 py-5">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Challenge Setup</p>
                  <h2 className="text-xl font-bold text-slate-900">Start a new challenge</h2>
                </div>
                <button onClick={closeChallengeModal} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-4 px-6 py-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">Challenge Name</label>
                  <input
                    type="text"
                    value={draftChallengeTitle}
                    onChange={(e) => setDraftChallengeTitle(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-400"
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Starting Capital</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={draftStartingCapital}
                      onChange={(e) => setDraftStartingCapital(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">Target Capital</label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={draftTargetCapital}
                      onChange={(e) => setDraftTargetCapital(e.target.value)}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition-colors focus:border-blue-400"
                    />
                  </div>
                </div>

                <p className="text-sm text-slate-500">
                  Starting a new challenge will clear the current ledger view and let you import fresh CSV results from scratch.
                </p>
              </div>
              <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeChallengeModal}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={startNewChallenge}
                  className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Start Challenge
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Current Balance"
            value={`$${metrics.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            subValue={`Total Gain: $${(metrics.balance - startingCapital).toFixed(2)}`}
            icon={<TrendingUp className="text-emerald-500" />}
            trend={startingCapital > 0 ? ((metrics.balance - startingCapital) / startingCapital * 100).toFixed(1) : '0.0'}
          />
          <StatCard
            title="Roadmap Goal"
            value={`$${metrics.left.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            subValue={`Left to $${targetCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
            icon={<Target className="text-blue-500" />}
            progress={metrics.progress}
          />
          <StatCard
            title="Win Rate"
            value={`${metrics.winRate.toFixed(1)}%`}
            subValue={`${metrics.totalTrades} Total Executions`}
            icon={<Award className="text-amber-500" />}
          />
          <StatCard
            title="Profit Factor"
            value={metrics.profitFactor.toFixed(2)}
            subValue={`Expectancy: $${metrics.expectancy.toFixed(2)}`}
            icon={<BarChart3 className="text-indigo-500" />}
            status={metrics.profitFactor > 1.4 ? 'Healthy' : 'Caution'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-500" /> Equity Growth
              </h3>
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full">
                Max DD: {metrics.maxDD.toFixed(1)}%
              </span>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.equityCurve}>
                  <defs>
                    <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" hide />
                  <YAxis orientation="right" stroke="#94a3b8" fontSize={12} tickFormatter={(val) => `$${val}`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                  <Area type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEquity)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-500" /> Challenge Health
            </h3>
            <div className="space-y-5">
              <AssessmentItem
                label="Risk Management"
                score={metrics.maxDD < 10 ? 'EXCELLENT' : 'STABLE'}
                desc={`You are holding a ${metrics.maxDD.toFixed(1)}% drawdown relative to peak.`}
              />
              <AssessmentItem
                label="Win Edge"
                score={metrics.winRate >= 50 ? 'VERIFIED' : 'NEUTRAL'}
                desc={`${metrics.winRate.toFixed(1)}% accuracy is aligning with the Balanced Roadmap.`}
              />

              <div className="mt-8 p-6 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl relative overflow-hidden">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Challenge Completion</p>
                <p className="text-3xl font-black">{metrics.progress.toFixed(3)}%</p>
                <div className="w-full bg-slate-700 h-2 rounded-full mt-4 overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${Math.max(metrics.progress, 1)}%` }} />
                </div>
                <div className="absolute -bottom-4 -right-4 opacity-10">
                  <Target className="w-24 h-24" />
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-center">
                <FileText className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    Upload your MT5 "ReportHistory" export (CSV or XLSX) and the app will detect the right columns for your trades.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-500" /> Daily Gains
            </h3>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyPnL}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                  <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                    {dailyPnL.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-slate-500" /> Live Ledger
              </h3>
              <p className="text-xs font-bold text-slate-400">{tradeHistory.length} Trades Logged</p>
            </div>
            <div className="flex-1 overflow-y-auto max-h-[250px] pr-2 custom-scrollbar">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-white text-xs font-bold text-slate-400 uppercase tracking-tight z-10">
                  <tr>
                    <th className="pb-3 px-1">ID</th>
                    <th className="pb-3 px-1">Asset</th>
                    <th className="pb-3 px-1">Type</th>
                    <th className="pb-3 px-1 text-right">Net Profit</th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-slate-100">
                  {tradeHistory.slice().reverse().map((t) => (
                    <tr key={t.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-1 text-[11px] text-slate-400 font-mono">#{t.id}</td>
                      <td className="py-3 px-1 font-semibold">{t.symbol}</td>
                      <td className="py-3 px-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${t.type === 'buy' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                          {t.type}
                        </span>
                      </td>
                      <td className={`py-3 px-1 text-right font-black ${t.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {t.profit >= 0 ? `+$${t.profit.toFixed(2)}` : `-$${Math.abs(t.profit).toFixed(2)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, subValue, icon, trend, progress, status }) => (
  <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 relative overflow-hidden group hover:shadow-md transition-all">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2.5 bg-slate-50 rounded-2xl group-hover:bg-blue-50 transition-colors">{icon}</div>
      {trend && (
        <span className={`flex items-center text-xs font-bold ${parseFloat(trend) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
          {parseFloat(trend) >= 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
          {trend}%
        </span>
      )}
      {status && (
        <span className={`text-[10px] font-black px-2 py-1 rounded-full ${status === 'Healthy' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          {status}
        </span>
      )}
    </div>
    <div className="space-y-1">
      <h4 className="text-sm font-semibold text-slate-500">{title}</h4>
      <p className="text-2xl font-black text-slate-900">{value}</p>
      <p className="text-xs text-slate-400 font-medium">{subValue}</p>
    </div>
    {progress !== undefined && (
      <div className="mt-4 h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600 rounded-full transition-all duration-1000" style={{ width: `${Math.max(progress, 1)}%` }} />
      </div>
    )}
  </div>
);

const AssessmentItem = ({ label, score, desc }) => (
  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
    <div className="flex items-center justify-between">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
      <span className="text-[10px] font-black text-blue-600">{score}</span>
    </div>
    <p className="text-xs font-semibold text-slate-700 leading-relaxed">{desc}</p>
  </div>
);

export default App;
