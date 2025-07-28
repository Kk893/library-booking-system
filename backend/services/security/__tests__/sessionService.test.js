const sessionService = require('../sessionService');

test('sessionService should have parseExpiryToSeconds method', () => {
  expect(typeof sessionService.parseExpiryToSeconds).toBe('function');
});

test('parseExpiryToSeconds should parse time units correctly', () => {
  expect(sessionService.parseExpiryToSeconds('30s')).toBe(30);
  expect(sessionService.parseExpiryToSeconds('15m')).toBe(900);
  expect(sessionService.parseExpiryToSeconds('2h')).toBe(7200);
  expect(sessionService.parseExpiryToSeconds('7d')).toBe(604800);
});

test('parseExpiryToSeconds should return default for invalid format', () => {
  expect(sessionService.parseExpiryToSeconds('invalid')).toBe(3600);
  expect(sessionService.parseExpiryToSeconds('')).toBe(3600);
});

test('sessionService should have all required methods', () => {
  expect(typeof sessionService.generateTokenPair).toBe('function');
  expect(typeof sessionService.validateAccessToken).toBe('function');
  expect(typeof sessionService.validateRefreshToken).toBe('function');
  expect(typeof sessionService.refreshAccessToken).toBe('function');
  expect(typeof sessionService.blacklistToken).toBe('function');
  expect(typeof sessionService.invalidateSession).toBe('function');
  expect(typeof sessionService.invalidateAllUserSessions).toBe('function');
  expect(typeof sessionService.getSessionInfo).toBe('function');
});