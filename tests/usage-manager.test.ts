import { describe, it, expect } from 'vitest';
import { UsageManager } from '../src/core/usage-manager';

describe('Usage Manager', () => {
  it('should parse observable CLI output for token counts', () => {
    const mgr = new UsageManager();
    const output = 'Session complete. Total tokens: 1,450. Response generated.';
    const parsed = mgr.parseCopilotOutput(output);

    expect(parsed).not.toBeNull();
    expect(parsed?.tokens).toBe(1450);
  });

  it('should parse observable CLI output for credits', () => {
    const mgr = new UsageManager();
    const output = 'Credits: 25.50 remaining';
    const parsed = mgr.parseCopilotOutput(output);

    expect(parsed).not.toBeNull();
    expect(parsed?.credits).toBe(25.5);
  });

  it('should return null when no usage metrics are present in output', () => {
    const mgr = new UsageManager();
    const output = 'Copilot session initialized. Welcome to GitHub Copilot CLI!';
    const parsed = mgr.parseCopilotOutput(output);

    expect(parsed).toBeNull();
  });
});
