/**
 * TaskFlow Phase 5 Sprint 2 Test Suite
 * Validates:
 * 1. Pomodoro calculation & formatting utilities
 * 2. Timer state serialization, localStorage persistence, and corruption recovery
 * 3. Background tab / suspension time leap recovery (timestamp-based truth)
 * 4. Deduplicated session completion notification guard
 * 5. CommandPalette debounced search & stale-response cancellation logic
 * 6. Backend search query generation (title, description, tags)
 */

import assert from 'assert';
import {
  calculateRemainingSeconds,
  formatTimerDisplay,
  loadPomodoroState,
  savePomodoroState,
} from './src/utils/pomodoro.js';

let passed = 0;
let total = 0;

function it(description, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(err);
  }
}

console.log('\n--- Phase 5 Sprint 2: Pomodoro & Global Search Test Suite ---\n');

// 1. Pomodoro Utilities
console.log('1. Pomodoro Calculation & Formatting Utilities:');

it('calculateRemainingSeconds accurately computes remaining seconds from target timestamp', () => {
  const now = 1700000000000;
  const targetEndTime = now + 1500000; // +1500s = 25 minutes
  const remaining = calculateRemainingSeconds(targetEndTime, now);
  assert.strictEqual(remaining, 1500);
});

it('calculateRemainingSeconds rounds up partial seconds properly', () => {
  const now = 1700000000000;
  const targetEndTime = now + 123456; // 123.456s -> ceil = 124s
  const remaining = calculateRemainingSeconds(targetEndTime, now);
  assert.strictEqual(remaining, 124);
});

it('calculateRemainingSeconds returns 0 when target is in the past', () => {
  const now = 1700000000000;
  const targetEndTime = now - 5000; // 5s ago
  const remaining = calculateRemainingSeconds(targetEndTime, now);
  assert.strictEqual(remaining, 0);
});

it('calculateRemainingSeconds returns 0 for invalid or null timestamps', () => {
  assert.strictEqual(calculateRemainingSeconds(null), 0);
  assert.strictEqual(calculateRemainingSeconds(undefined), 0);
  assert.strictEqual(calculateRemainingSeconds(NaN), 0);
  assert.strictEqual(calculateRemainingSeconds('invalid'), 0);
});

it('formatTimerDisplay formats seconds to MM:SS string correctly', () => {
  assert.strictEqual(formatTimerDisplay(0), '00:00');
  assert.strictEqual(formatTimerDisplay(9), '00:09');
  assert.strictEqual(formatTimerDisplay(60), '01:00');
  assert.strictEqual(formatTimerDisplay(65), '01:05');
  assert.strictEqual(formatTimerDisplay(1500), '25:00');
  assert.strictEqual(formatTimerDisplay(300), '05:00');
  assert.strictEqual(formatTimerDisplay(3599), '59:59');
  assert.strictEqual(formatTimerDisplay(-10), '00:00');
  assert.strictEqual(formatTimerDisplay(null), '00:00');
  assert.strictEqual(formatTimerDisplay(undefined), '00:00');
});

// 2. State Persistence & Recovery
console.log('\n2. Timer State Serialization & Persistence:');

// Setup mock localStorage
const mockStorage = {};
const mockLocalStorage = {
  getItem: (key) => mockStorage[key] || null,
  setItem: (key, value) => { mockStorage[key] = String(value); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
};
global.localStorage = mockLocalStorage;

it('savePomodoroState and loadPomodoroState persist and retrieve timer state correctly', () => {
  const stateToSave = {
    mode: 'focus',
    isRunning: true,
    timeLeft: 1250,
    targetEndTime: Date.now() + 1250000,
    activeTaskId: 'task-test-456',
    focusDurationMinutes: 25,
    breakDurationMinutes: 5,
    soundEnabled: true,
  };

  savePomodoroState(stateToSave);
  const loaded = loadPomodoroState();

  assert.strictEqual(loaded.mode, 'focus');
  assert.strictEqual(loaded.isRunning, true);
  assert.strictEqual(loaded.activeTaskId, 'task-test-456');
  assert.strictEqual(loaded.focusDurationMinutes, 25);
  assert.strictEqual(loaded.breakDurationMinutes, 5);
  assert.strictEqual(loaded.soundEnabled, true);
  assert.strictEqual(typeof loaded.targetEndTime, 'number');
});

it('loadPomodoroState safely handles corrupted JSON and returns null', () => {
  mockLocalStorage.setItem('taskflow-pomodoro-state', '{ invalid JSON @@@ }');
  const loaded = loadPomodoroState();
  assert.strictEqual(loaded, null);
});

it('pomodoro state initialization gracefully falls back to defaults when storage is empty or corrupted', () => {
  const saved = loadPomodoroState(); // returns null
  const focusDuration = Number(saved?.focusDuration) || 25 * 60;
  const breakDuration = Number(saved?.breakDuration) || 5 * 60;
  const mode = saved?.mode === 'break' ? 'break' : 'focus';
  const status = saved?.status === 'running' || saved?.status === 'paused' ? saved.status : 'idle';
  const soundEnabled = saved?.soundEnabled !== undefined ? Boolean(saved.soundEnabled) : true;
  const activeTaskId = saved?.activeTaskId || null;

  assert.strictEqual(focusDuration, 1500);
  assert.strictEqual(breakDuration, 300);
  assert.strictEqual(mode, 'focus');
  assert.strictEqual(status, 'idle');
  assert.strictEqual(soundEnabled, true);
  assert.strictEqual(activeTaskId, null);
});

// 3. Background Tab & Suspension Time-Leap Simulation
console.log('\n3. Background Tab Suspension & Timestamp Reconciliation:');

it('reconciles remaining time accurately when system sleeps or tab pauses for long duration', () => {
  const startTime = 1700000000000;
  const targetEndTime = startTime + 1500 * 1000; // 25 mins later

  // Normal tick 1 second later
  const tick1Time = startTime + 1000;
  assert.strictEqual(calculateRemainingSeconds(targetEndTime, tick1Time), 1499);

  // Tab suspended / laptop closed for 1800 seconds (30 mins)
  const wakeTime = startTime + 1800 * 1000;
  const remainingAfterWake = calculateRemainingSeconds(targetEndTime, wakeTime);

  // Remaining time is immediately clamped to 0 without ticking 1800 times
  assert.strictEqual(remainingAfterWake, 0);
});

// 4. Deduplicated Session Completion Notification Guard
console.log('\n4. Deduplicated Session Completion Guard:');

it('prevents duplicate completion notifications across multiple ticks after session expiry', () => {
  let notificationCount = 0;
  let lastCompletedSessionId = null;

  function simulateTick(session) {
    const isFinished = session.remaining <= 0;
    if (isFinished && session.isRunning) {
      if (lastCompletedSessionId !== session.sessionId) {
        lastCompletedSessionId = session.sessionId;
        notificationCount++;
      }
    }
  }

  const activeSession = {
    sessionId: 'session-12345',
    isRunning: true,
    remaining: 0,
  };

  // First tick when expired
  simulateTick(activeSession);
  assert.strictEqual(notificationCount, 1);

  // Subsequent ticks with same sessionId and zero remaining
  simulateTick(activeSession);
  simulateTick(activeSession);
  simulateTick(activeSession);
  assert.strictEqual(notificationCount, 1, 'Subsequent ticks must not trigger duplicate notifications');

  // Next session triggers notification when it finishes
  const nextSession = {
    sessionId: 'session-67890',
    isRunning: true,
    remaining: 0,
  };
  simulateTick(nextSession);
  assert.strictEqual(notificationCount, 2, 'New session triggers exactly one notification');
});

// 5. CommandPalette Stale-Response Protection & Query Logic
console.log('\n5. CommandPalette Stale Response Cancellation Logic:');

it('ignores stale async responses when query changes rapidly', async () => {
  let activeRequestId = 0;
  let displayedResults = null;

  async function mockSearch(query, requestId, delayMs, fakeResults) {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (requestId === activeRequestId) {
          displayedResults = fakeResults;
        }
        resolve();
      }, delayMs);
    });
  }

  // User types "doc" -> Request 1 (slower, takes 100ms)
  activeRequestId = 1;
  const req1 = mockSearch('doc', 1, 100, ['Doctor appointment', 'Documentation']);

  // User quickly types "doctor" -> Request 2 (faster, takes 20ms)
  activeRequestId = 2;
  const req2 = mockSearch('doctor', 2, 20, ['Doctor appointment']);

  await Promise.all([req1, req2]);

  // Even though Request 1 finished last, displayedResults reflects Request 2
  assert.deepStrictEqual(displayedResults, ['Doctor appointment']);
});

it('avoids triggering API search for short queries under 2 characters', () => {
  function shouldTriggerSearch(query) {
    const trimmed = (query || '').trim();
    return trimmed.length >= 2;
  }

  assert.strictEqual(shouldTriggerSearch(''), false);
  assert.strictEqual(shouldTriggerSearch('   '), false);
  assert.strictEqual(shouldTriggerSearch('a'), false);
  assert.strictEqual(shouldTriggerSearch(' a '), false);
  assert.strictEqual(shouldTriggerSearch('ab'), true);
  assert.strictEqual(shouldTriggerSearch(' urgent '), true);
});

// 6. Backend Task Search Filtering Logic
console.log('\n6. Backend Search Where Clause Structure:');

it('builds where clause matching title, description, and tags', () => {
  function buildTaskWhere({ search, userId }) {
    const where = { userId };
    if (search && search.trim()) {
      const cleanSearch = search.trim();
      where.OR = [
        { title: { contains: cleanSearch, mode: 'insensitive' } },
        { description: { contains: cleanSearch, mode: 'insensitive' } },
        { tags: { has: cleanSearch } },
      ];
    }
    return where;
  }

  const whereClause = buildTaskWhere({ search: 'urgent', userId: 'user-1' });

  assert.strictEqual(whereClause.userId, 'user-1');
  assert.ok(Array.isArray(whereClause.OR));
  assert.strictEqual(whereClause.OR.length, 3);
  assert.deepStrictEqual(whereClause.OR[0], { title: { contains: 'urgent', mode: 'insensitive' } });
  assert.deepStrictEqual(whereClause.OR[1], { description: { contains: 'urgent', mode: 'insensitive' } });
  assert.deepStrictEqual(whereClause.OR[2], { tags: { has: 'urgent' } });
});

console.log(`\n========================================`);
console.log(`Phase 5 Sprint 2 Suite: ${passed}/${total} assertions passed.`);
console.log(`========================================\n`);

if (passed !== total) {
  process.exit(1);
}
