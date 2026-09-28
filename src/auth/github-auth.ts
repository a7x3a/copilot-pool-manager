export interface GitHubUserInfo {
  username: string;
  name: string | null;
  copilotPlan: string;
}

export interface ValidationResult {
  valid: boolean;
  user?: GitHubUserInfo;
  error?: string;
  statusCode?: number;
}

export interface DeviceCodeResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

// GitHub CLI official OAuth client ID for command-line tools
const GITHUB_CLI_CLIENT_ID = '178c1a77c661e84a5819';

export async function validateGitHubToken(token: string): Promise<ValidationResult> {
  if (!token || token.trim() === '') {
    return { valid: false, error: 'Token is empty' };
  }

  try {
    const res = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token.trim()}`,
        'User-Agent': 'CopilotPoolManager/1.0',
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (res.status === 200) {
      const data = await res.json() as any;
      let plan = 'individual';
      if (data.plan && data.plan.name) {
        plan = data.plan.name;
      }

      return {
        valid: true,
        user: {
          username: data.login,
          name: data.name || data.login,
          copilotPlan: plan,
        },
      };
    } else if (res.status === 401) {
      return { valid: false, error: 'Authentication failed: Invalid or expired GitHub token', statusCode: 401 };
    } else if (res.status === 403) {
      return { valid: false, error: 'GitHub API rate limit exceeded or insufficient permissions', statusCode: 403 };
    } else {
      return { valid: false, error: `GitHub API returned status ${res.status}`, statusCode: res.status };
    }
  } catch (err: any) {
    return { valid: false, error: `Network connection failed: ${err.message}` };
  }
}

export async function requestDeviceCode(clientId: string = GITHUB_CLI_CLIENT_ID): Promise<DeviceCodeResponse> {
  const res = await fetch('https://github.com/login/device/code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'CopilotPoolManager/1.0',
    },
    body: JSON.stringify({
      client_id: clientId,
      scope: 'read:user copilot repo',
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to request device code from GitHub (status ${res.status})`);
  }

  return res.json() as Promise<DeviceCodeResponse>;
}

export async function pollDeviceToken(
  deviceCode: string,
  interval: number = 5,
  expiresIn: number = 900,
  clientId: string = GITHUB_CLI_CLIENT_ID
): Promise<string> {
  const startTime = Date.now();
  const pollIntervalMs = (interval || 5) * 1000;

  while ((Date.now() - startTime) < expiresIn * 1000) {
    await new Promise((r) => setTimeout(r, pollIntervalMs));

    const res = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'CopilotPoolManager/1.0',
      },
      body: JSON.stringify({
        client_id: clientId,
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      }),
    });

    if (res.ok) {
      const data = await res.json() as any;
      if (data.access_token) {
        return data.access_token;
      }
      if (data.error === 'authorization_pending') {
        continue;
      }
      if (data.error === 'slow_down') {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      if (data.error === 'expired_token') {
        throw new Error('Device code has expired. Please try again.');
      }
      if (data.error === 'access_denied') {
        throw new Error('Access denied by user.');
      }
      if (data.error) {
        throw new Error(`OAuth error: ${data.error_description || data.error}`);
      }
    }
  }

  throw new Error('Authentication timed out waiting for authorization.');
}
