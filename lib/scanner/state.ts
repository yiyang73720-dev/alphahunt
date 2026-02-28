import { Signal } from '../types';

// ========================================
// Scanner State — Track fired signals to avoid duplicate alerts
// ========================================

export interface ScannerState {
  isRunning: boolean;
  lastScan: string | null;
  scanCount: number;
  firedSignals: Map<string, FiredSignal>;
  signalHistory: FiredSignal[];
  errors: string[];
}

export interface FiredSignal {
  signalId: string;
  signal: Signal;
  firedAt: string;
  alertSent: boolean;
}

// In-memory singleton state
let state: ScannerState = {
  isRunning: false,
  lastScan: null,
  scanCount: 0,
  firedSignals: new Map(),
  signalHistory: [],
  errors: [],
};

export function getState(): ScannerState {
  return state;
}

export function setRunning(running: boolean) {
  state.isRunning = running;
}

export function recordScan() {
  state.lastScan = new Date().toISOString();
  state.scanCount++;
}

export function recordError(error: string) {
  state.errors.push(`[${new Date().toISOString()}] ${error}`);
  // Keep last 50 errors
  if (state.errors.length > 50) state.errors = state.errors.slice(-50);
}

// Check if a signal has already fired (returns true if NEW)
export function isNewSignal(signal: Signal): boolean {
  return !state.firedSignals.has(signal.id);
}

// Record a signal as fired
export function recordSignal(signal: Signal, alertSent: boolean) {
  const fired: FiredSignal = {
    signalId: signal.id,
    signal,
    firedAt: new Date().toISOString(),
    alertSent,
  };
  state.firedSignals.set(signal.id, fired);
  state.signalHistory.push(fired);

  // Keep history to last 200 entries
  if (state.signalHistory.length > 200) {
    state.signalHistory = state.signalHistory.slice(-200);
  }
}

// Get serializable status for API responses
export function getStatus() {
  return {
    isRunning: state.isRunning,
    lastScan: state.lastScan,
    scanCount: state.scanCount,
    activeSignals: state.firedSignals.size,
    recentErrors: state.errors.slice(-5),
  };
}

// Get signal history for API
export function getHistory() {
  return state.signalHistory.map((f) => ({
    signalId: f.signalId,
    type: f.signal.type,
    game: f.signal.game,
    betTeam: f.signal.betTeam,
    kellyPct: f.signal.kellyPct,
    urgency: f.signal.urgency,
    firedAt: f.firedAt,
    alertSent: f.alertSent,
  }));
}

// Reset state (for new day)
export function resetState() {
  state.firedSignals.clear();
  state.signalHistory = [];
  state.scanCount = 0;
  state.errors = [];
}
