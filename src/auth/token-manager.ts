import { credentialStore, ICredentialStore } from './credential-store';

export class TokenManager {
  private store: ICredentialStore;

  constructor(store: ICredentialStore = credentialStore) {
    this.store = store;
  }

  public getCredentialReference(username: string): string {
    return `cpm:account:${username.toLowerCase().trim()}`;
  }

  public saveToken(username: string, token: string): string {
    const reference = this.getCredentialReference(username);
    this.store.setCredential(reference, token.trim());
    return reference;
  }

  public getToken(credentialReference: string): string | null {
    return this.store.getCredential(credentialReference);
  }

  public deleteToken(credentialReference: string): boolean {
    return this.store.deleteCredential(credentialReference);
  }

  public hasToken(credentialReference: string): boolean {
    return this.store.hasCredential(credentialReference);
  }
}

export const tokenManager = new TokenManager();
