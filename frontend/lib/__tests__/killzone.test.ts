import { describe, it, expect } from 'vitest';
import {
  formatMinutes,
  isInOptimalWindow,
  getZoneColor,
  getVolatilityColor,
  formatZoneName,
  convertTime,
  formatKillZoneTime,
  KILL_ZONE_SESSIONS,
} from '@/lib/killzone';
import type { KillZoneData } from '@/lib/killzone';

describe('formatMinutes', () => {
  it('returns "soon" for null', () => {
    expect(formatMinutes(null)).toBe('soon');
  });

  it('returns "soon" for undefined', () => {
    expect(formatMinutes(undefined)).toBe('soon');
  });

  it('returns "soon" for zero', () => {
    expect(formatMinutes(0)).toBe('soon');
  });

  it('formats minutes-only values', () => {
    expect(formatMinutes(30)).toBe('30m');
  });

  it('formats hours and minutes', () => {
    expect(formatMinutes(90)).toBe('1h 30m');
  });

  it('formats exact hour', () => {
    expect(formatMinutes(60)).toBe('1h 0m');
  });

  it('formats large values', () => {
    expect(formatMinutes(125)).toBe('2h 5m');
  });
});

describe('isInOptimalWindow', () => {
  it('returns true when active and optimal', () => {
    const data: KillZoneData = {
      zone_type: 'ny_kill_zone',
      zone_name: 'NY Kill Zone',
      is_active: true,
      time_until_next: null,
      time_remaining: 60,
      session: 'market_open',
      optimal_for_entries: true,
      volatility_expected: 'high',
      rationale: 'test',
    };
    expect(isInOptimalWindow(data)).toBe(true);
  });

  it('returns false when not active', () => {
    const data: KillZoneData = {
      zone_type: 'off_hours',
      zone_name: 'Off Hours',
      is_active: false,
      time_until_next: 30,
      time_remaining: null,
      session: 'after_hours',
      optimal_for_entries: false,
      volatility_expected: 'low',
      rationale: 'test',
    };
    expect(isInOptimalWindow(data)).toBe(false);
  });

  it('returns false when active but not optimal', () => {
    const data: KillZoneData = {
      zone_type: 'asian_session',
      zone_name: 'Asian Session',
      is_active: true,
      time_until_next: null,
      time_remaining: 120,
      session: 'after_hours',
      optimal_for_entries: false,
      volatility_expected: 'low',
      rationale: 'test',
    };
    expect(isInOptimalWindow(data)).toBe(false);
  });

  it('returns false for null', () => {
    expect(isInOptimalWindow(null)).toBe(false);
  });
});

describe('getZoneColor', () => {
  it('returns muted colors for inactive zones', () => {
    const data: KillZoneData = {
      zone_type: 'off_hours',
      zone_name: '',
      is_active: false,
      time_until_next: null,
      time_remaining: null,
      session: '',
      optimal_for_entries: false,
      volatility_expected: '',
      rationale: '',
    };
    expect(getZoneColor(data)).toContain('bg-bg-tertiary');
  });

  it('returns bullish colors for active optimal zones', () => {
    const data: KillZoneData = {
      zone_type: 'london_kill_zone',
      zone_name: '',
      is_active: true,
      time_until_next: null,
      time_remaining: 30,
      session: '',
      optimal_for_entries: true,
      volatility_expected: 'high',
      rationale: '',
    };
    expect(getZoneColor(data)).toContain('accent-bullish');
  });

  it('returns warning colors for active non-optimal zones', () => {
    const data: KillZoneData = {
      zone_type: 'asian_session',
      zone_name: '',
      is_active: true,
      time_until_next: null,
      time_remaining: 30,
      session: '',
      optimal_for_entries: false,
      volatility_expected: 'low',
      rationale: '',
    };
    expect(getZoneColor(data)).toContain('yellow-500');
  });

  it('returns muted for null', () => {
    expect(getZoneColor(null)).toContain('bg-bg-tertiary');
  });
});

describe('getVolatilityColor', () => {
  it('returns bullish for high', () => {
    expect(getVolatilityColor('high')).toBe('text-accent-bullish');
  });

  it('returns yellow for medium', () => {
    expect(getVolatilityColor('medium')).toBe('text-yellow-500');
  });

  it('returns tertiary for low', () => {
    expect(getVolatilityColor('low')).toBe('text-text-tertiary');
  });

  it('returns tertiary for unknown', () => {
    expect(getVolatilityColor('unknown')).toBe('text-text-tertiary');
  });
});

describe('formatZoneName', () => {
  it('converts snake_case to Title Case', () => {
    expect(formatZoneName('london_kill_zone')).toBe('London Kill Zone');
  });

  it('converts short snake_case', () => {
    expect(formatZoneName('off_hours')).toBe('Off Hours');
  });

  it('handles single word', () => {
    expect(formatZoneName('test')).toBe('Test');
  });
});

describe('convertTime', () => {
  it('returns EST passthrough when no timezone given', () => {
    const result = convertTime(9, 30);
    expect(result.hour).toBe(9);
    expect(result.minute).toBe(30);
    expect(result.timezone).toBe('EST');
  });
});

describe('formatKillZoneTime', () => {
  it('returns EST format when no timezone given', () => {
    expect(formatKillZoneTime('3:00', '5:00')).toBe('3:00 - 5:00 EST');
  });
});

describe('KILL_ZONE_SESSIONS', () => {
  it('has 4 sessions', () => {
    expect(KILL_ZONE_SESSIONS).toHaveLength(4);
  });

  it('matches backend schedule', () => {
    const london = KILL_ZONE_SESSIONS.find((s) => s.type === 'london_kill_zone');
    expect(london?.start).toBe('3:00');
    expect(london?.end).toBe('5:00');
  });
});
