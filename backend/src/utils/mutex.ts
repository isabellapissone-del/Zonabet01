/**
 * Keyed Mutex for synchronizing concurrent operations per resource (e.g., walletId)
 */
export class KeyedMutex {
  private locks: Map<string, Promise<void>> = new Map();

  async acquire<T>(key: string, task: () => Promise<T>): Promise<T> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }

    let releaseLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    this.locks.set(key, lockPromise);

    try {
      return await task();
    } finally {
      this.locks.delete(key);
      releaseLock!();
    }
  }
}

export const walletMutex = new KeyedMutex();
export const betMutex = new KeyedMutex();
