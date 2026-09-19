/**
 * Safe storage utility for ZONABET
 * Provides robust fallbacks for browsers, iframes, and private browsing modes
 * where localStorage or sessionStorage may throw SecurityError.
 */

class SafeStorage {
  private memoryStore: Map<string, string> = new Map();

  getItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch (e) {
      // In restricted iframe or private mode, fallback to memory
    }
    return this.memoryStore.get(key) || null;
  }

  setItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
    } catch (e) {
      // In restricted iframe, fallback to memory
    }
    this.memoryStore.set(key, value);
  }

  removeItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch (e) {}
    this.memoryStore.delete(key);
  }

  getSessionItem(key: string): string | null {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        return window.sessionStorage.getItem(key);
      }
    } catch (e) {}
    return this.memoryStore.get(`session_${key}`) || null;
  }

  setSessionItem(key: string, value: string): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.setItem(key, value);
        return;
      }
    } catch (e) {}
    this.memoryStore.set(`session_${key}`, value);
  }

  removeSessionItem(key: string): void {
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.removeItem(key);
      }
    } catch (e) {}
    this.memoryStore.delete(`session_${key}`);
  }

  clear(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.clear();
      }
    } catch (e) {}
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        window.sessionStorage.clear();
      }
    } catch (e) {}
    this.memoryStore.clear();
  }
}

export const safeStorage = new SafeStorage();
