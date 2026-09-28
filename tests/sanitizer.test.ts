import { describe, it, expect } from 'vitest';
import { sanitizeText, registerKnownToken } from '../src/logging/logger';

describe('Logging & Token Sanitization', () => {
  it('should redact classic GitHub personal access tokens', () => {
    const raw = 'Error authenticating with token ghp_123456789012345678901234567890123456 in session';
    const sanitized = sanitizeText(raw);
    expect(sanitized).not.toContain('ghp_123456789012345678901234567890123456');
    expect(sanitized).toContain('***REDACTED***');
  });

  it('should redact fine-grained GitHub personal access tokens', () => {
    const token = 'github_pat_11AEXAMPLE00000000000000000000000000000000000000000000000000000000000000000000000000';
    const raw = `Using ${token} to connect`;
    const sanitized = sanitizeText(raw);
    expect(sanitized).not.toContain(token);
    expect(sanitized).toContain('***REDACTED***');
  });

  it('should redact OAuth bearer tokens', () => {
    const raw = 'Headers: Bearer gho_abcdef1234567890abcdef1234567890abcdef12';
    const sanitized = sanitizeText(raw);
    expect(sanitized).not.toContain('gho_abcdef1234567890abcdef1234567890abcdef12');
    expect(sanitized).toContain('***REDACTED***');
  });

  it('should redact dynamically registered known tokens', () => {
    const secret = 'super_secret_custom_token_987654';
    registerKnownToken(secret);
    const raw = `Command executed with ${secret} present`;
    const sanitized = sanitizeText(raw);
    expect(sanitized).not.toContain(secret);
    expect(sanitized).toContain('***REDACTED***');
  });
});
