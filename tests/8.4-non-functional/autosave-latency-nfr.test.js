/**
 * NFR: Autosave latency should be <= 2.5s (given debounce 500ms and min interval 2000ms)
 */

import { AutosaveManager } from '../../app/services/autosave-manager.js';

// Simple in-memory EventBus stub
function createEventBus() {
  const listeners = {};
  return {
    subscribe(type, cb) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(cb);
    },
    publish(type, payload) {
      (listeners[type] || []).forEach((cb) => cb(payload));
    }
  };
}

describe('NFR - Autosave latency', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // jsdom localStorage is available; ensure clean
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('autosave completes within <= 2.5s window from first change', async () => {
    const eventBus = createEventBus();

    // Mock storageManager.save to succeed quickly
    const storageManager = {
      save: jest.fn().mockResolvedValue({ success: true })
    };

    // Configure interval to 2000ms and enabled=true
    const manager = new AutosaveManager({
      eventBus,
      storageManager,
      enabled: true,
      interval: 2000
    });

    // Mark a change (this schedules autosave in `interval` ms)
    manager.markAsChanged();

    // Advance time by 2500ms to cover debounce(implicit) + min interval
    jest.advanceTimersByTime(2500);

    // Allow any pending microtasks to flush
    await Promise.resolve();

    // Assertions: a draft should be written and storageManager.save called
    const draft = localStorage.getItem('draft:multinotation');
    expect(draft).toBeTruthy();
    expect(storageManager.save).toHaveBeenCalled();
  });
});



