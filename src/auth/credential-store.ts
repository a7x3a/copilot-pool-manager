import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { CREDENTIAL_SERVICE_NAME } from '../config/defaults';
import { getCpmDir, ensureCpmDirectories } from '../config/config';
import { registerKnownToken } from '../logging/logger';

export interface ICredentialStore {
  setCredential(reference: string, secret: string): void;
  getCredential(reference: string): string | null;
  deleteCredential(reference: string): boolean;
  hasCredential(reference: string): boolean;
}

/**
 * Windows Credential Manager implementation using @napi-rs/keyring.
 * Directly calls Win32 CredReadW/CredWriteW/CredDeleteW native APIs on Windows.
 * On non-Windows platforms (e.g. Linux CI), cleanly uses the secure local encrypted store.
 */
export class WindowsCredentialStore implements ICredentialStore {
  private serviceName: string;
  private isWindows: boolean;

  constructor(serviceName: string = CREDENTIAL_SERVICE_NAME) {
    this.serviceName = serviceName;
    this.isWindows = process.platform === 'win32';
  }

  public setCredential(reference: string, secret: string): void {
    if (!secret) {
      throw new Error('Cannot store empty secret');
    }
    registerKnownToken(secret);
    if (this.isWindows) {
      try {
        const { Entry } = require('@napi-rs/keyring');
        const entry = new Entry(this.serviceName, reference);
        entry.setPassword(secret);
        return;
      } catch (err: any) {
        // Fallback to local encrypted store if keyring fails
      }
    }
    fallbackStore.setCredential(reference, secret);
  }

  public getCredential(reference: string): string | null {
    if (this.isWindows) {
      try {
        const { Entry } = require('@napi-rs/keyring');
        const entry = new Entry(this.serviceName, reference);
        const secret = entry.getPassword();
        if (secret) {
          registerKnownToken(secret);
          return secret;
        }
      } catch (err: any) {
        // Try fallback store
      }
    }
    return fallbackStore.getCredential(reference);
  }

  public deleteCredential(reference: string): boolean {
    let deletedKeyring = false;
    if (this.isWindows) {
      try {
        const { Entry } = require('@napi-rs/keyring');
        const entry = new Entry(this.serviceName, reference);
        entry.deletePassword();
        deletedKeyring = true;
      } catch {
        // may not exist in keyring
      }
    }

    const deletedFallback = fallbackStore.deleteCredential(reference);
    return deletedKeyring || deletedFallback;
  }

  public hasCredential(reference: string): boolean {
    const cred = this.getCredential(reference);
    return Boolean(cred && cred.length > 0);
  }
}

/**
 * Encrypted fallback store using Node.js standard crypto (AES-256-GCM).
 * Secure, cross-platform, and leaves zero plaintext files.
 */
class EncryptedFileCredentialStore implements ICredentialStore {
  private getStoragePath(): string {
    ensureCpmDirectories();
    return path.join(getCpmDir(), 'vault.enc');
  }

  private getKeyPath(): string {
    ensureCpmDirectories();
    return path.join(getCpmDir(), 'vault.key');
  }

  private getEncryptionKey(): Buffer {
    ensureCpmDirectories();
    const keyPath = this.getKeyPath();
    if (fs.existsSync(keyPath)) {
      return fs.readFileSync(keyPath);
    }
    const newKey = crypto.randomBytes(32);
    try {
      fs.writeFileSync(keyPath, newKey, { mode: 0o600 });
    } catch {
      // best-effort permission setting
    }
    return newKey;
  }

  private readVault(): Record<string, string> {
    const filePath = this.getStoragePath();
    if (!fs.existsSync(filePath)) {
      return {};
    }

    try {
      const encryptedData = fs.readFileSync(filePath);
      if (encryptedData.length < 28) return {};

      const iv = encryptedData.subarray(0, 12);
      const authTag = encryptedData.subarray(12, 28);
      const ciphertext = encryptedData.subarray(28);

      const key = this.getEncryptionKey();
      const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
      return JSON.parse(decrypted.toString('utf8'));
    } catch {
      return {};
    }
  }

  private writeVault(data: Record<string, string>): void {
    ensureCpmDirectories();
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const plaintext = Buffer.from(JSON.stringify(data), 'utf8');
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const authTag = cipher.getAuthTag();

    const output = Buffer.concat([iv, authTag, ciphertext]);
    fs.writeFileSync(this.getStoragePath(), output, { mode: 0o600 });
  }

  public setCredential(reference: string, secret: string): void {
    registerKnownToken(secret);
    const vault = this.readVault();
    vault[reference] = secret;
    this.writeVault(vault);
  }

  public getCredential(reference: string): string | null {
    const vault = this.readVault();
    const secret = vault[reference] || null;
    if (secret) {
      registerKnownToken(secret);
    }
    return secret;
  }

  public deleteCredential(reference: string): boolean {
    const vault = this.readVault();
    if (reference in vault) {
      delete vault[reference];
      this.writeVault(vault);
      return true;
    }
    return false;
  }

  public hasCredential(reference: string): boolean {
    const vault = this.readVault();
    return Boolean(vault[reference]);
  }
}

const fallbackStore = new EncryptedFileCredentialStore();
export const credentialStore = new WindowsCredentialStore();
