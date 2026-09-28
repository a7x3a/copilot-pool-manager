import { describe, it, expect } from 'vitest';
import { TokenManager } from '../src/auth/token-manager';
import { WindowsCredentialStore } from '../src/auth/credential-store';

describe('Credential Storage & Token Management', () => {
  it('should format credential references correctly', () => {
    const mgr = new TokenManager();
    const ref = mgr.getCredentialReference('octocat-dev');
    expect(ref).toBe('cpm:account:octocat-dev');
  });

  it('should securely store, retrieve, and delete tokens via CredentialStore', () => {
    const store = new WindowsCredentialStore('cpm:test:credentials');
    const mgr = new TokenManager(store);

    const username = 'test-suite-user-' + Date.now();
    const token = 'ghp_testtoken1234567890abcdefghijklmnopqr';

    const ref = mgr.saveToken(username, token);
    expect(ref).toBe(`cpm:account:${username}`);

    const retrieved = mgr.getToken(ref);
    expect(retrieved).toBe(token);

    const exists = mgr.hasToken(ref);
    expect(exists).toBe(true);

    const deleted = mgr.deleteToken(ref);
    expect(deleted).toBe(true);

    const retrievedAfterDelete = mgr.getToken(ref);
    expect(retrievedAfterDelete).toBeNull();
  });
});
