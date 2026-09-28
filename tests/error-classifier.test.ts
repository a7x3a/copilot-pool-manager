import { describe, it, expect } from 'vitest';
import { classifyError } from '../src/core/health-checker';

describe('Error Classification', () => {
  it('should classify rate limit errors accurately', () => {
    expect(classifyError('HTTP 429 Too Many Requests')).toBe('RATE_LIMIT');
    expect(classifyError('Rate limit exceeded for user')).toBe('RATE_LIMIT');
    expect(classifyError('Secondary rate limit reached')).toBe('RATE_LIMIT');
  });

  it('should classify authentication errors accurately', () => {
    expect(classifyError('401 Bad credentials')).toBe('AUTH_ERROR');
    expect(classifyError('Authentication failed: token expired')).toBe('AUTH_ERROR');
    expect(classifyError('User does not have an active Copilot subscription')).toBe('AUTH_ERROR');
  });

  it('should classify network connectivity errors', () => {
    expect(classifyError('getaddrinfo ENOTFOUND api.github.com')).toBe('NETWORK_ERROR');
    expect(classifyError('fetch failed: connect ECONNREFUSED 127.0.0.1:443')).toBe('NETWORK_ERROR');
    expect(classifyError('Connection timed out ETIMEDOUT')).toBe('NETWORK_ERROR');
  });

  it('should classify server/service errors', () => {
    expect(classifyError('500 Internal Server Error')).toBe('SERVICE_ERROR');
    expect(classifyError('502 Bad Gateway')).toBe('SERVICE_ERROR');
    expect(classifyError('503 Service Unavailable')).toBe('SERVICE_ERROR');
  });

  it('should classify CLI missing / invocation errors', () => {
    expect(classifyError("'copilot' is not recognized as an internal or external command")).toBe('CLI_ERROR');
    expect(classifyError('copilot: command not found')).toBe('CLI_ERROR');
    expect(classifyError('Process returned exit code 1', 1)).toBe('CLI_ERROR');
  });
});
