export interface ProgressProvider {
  isComplete(taskId: string): boolean;
  markComplete(taskId: string): void;
  getGraphHash(): string | null;
  setGraphHash(hash: string): void;
  reset(): void;
}

export class LocalStorageProgressProvider implements ProgressProvider {
  private prefix: string;

  constructor(prefix = "wayfinder") {
    this.prefix = prefix;
  }

  isComplete(taskId: string): boolean {
    try {
      return (
        localStorage.getItem(`${this.prefix}:task:${taskId}:done`) === "true"
      );
    } catch {
      return false;
    }
  }

  markComplete(taskId: string): void {
    try {
      localStorage.setItem(`${this.prefix}:task:${taskId}:done`, "true");
    } catch {
      // localStorage unavailable — silently ignore
    }
  }

  getGraphHash(): string | null {
    try {
      return localStorage.getItem(`${this.prefix}:graphHash`);
    } catch {
      return null;
    }
  }

  setGraphHash(hash: string): void {
    try {
      localStorage.setItem(`${this.prefix}:graphHash`, hash);
    } catch {
      // localStorage unavailable — silently ignore
    }
  }

  reset(): void {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (
          key &&
          key.startsWith(`${this.prefix}:task:`) &&
          key.endsWith(":done")
        ) {
          keysToRemove.push(key);
        }
      }
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
    } catch {
      // localStorage unavailable — silently ignore
    }
  }
}
