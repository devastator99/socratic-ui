import { trackEvent, trackScreen } from '@/utils/analytics';

describe('analytics stub', () => {
  const originalLog = console.log;
  let logs: string[];

  beforeEach(() => {
    logs = [];
    // @ts-ignore
    console.log = (...args: any[]) => {
      logs.push(args.join(' '));
    };
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it('tracks screen views', () => {
    trackScreen('Library', { count: 2 });
    expect(logs.some(l => l.includes('[analytics] screen: Library'))).toBe(true);
  });

  it('tracks events', () => {
    trackEvent('upload_complete', { id: '123' });
    expect(logs.some(l => l.includes('[analytics] event: upload_complete'))).toBe(true);
  });
});
