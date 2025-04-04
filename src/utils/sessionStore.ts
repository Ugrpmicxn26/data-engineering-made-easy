
/**
 * In-memory session-based data store
 * Data will be wiped when the browser session ends
 */

// Use sessionStorage to persist data during the session but clear when browser closes
const useSessionStorage = true;

class SessionStore {
  private stores: Record<string, any[]> = {};
  private initialized = false;

  constructor() {
    this.loadFromSessionStorage();
  }

  private loadFromSessionStorage() {
    if (!useSessionStorage || typeof window === 'undefined' || this.initialized) return;
    
    try {
      const storedData = sessionStorage.getItem('zip-merge-session-data');
      if (storedData) {
        this.stores = JSON.parse(storedData);
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to load data from session storage:', error);
    }
  }

  private saveToSessionStorage() {
    if (!useSessionStorage || typeof window === 'undefined') return;
    
    try {
      sessionStorage.setItem('zip-merge-session-data', JSON.stringify(this.stores));
    } catch (error) {
      console.error('Failed to save data to session storage:', error);
    }
  }

  // Create a new store or replace existing one
  createStore(storeName: string, initialData: any[] = []): void {
    this.stores[storeName] = [...initialData];
    this.saveToSessionStorage();
  }

  // Get all data from a store
  getStore(storeName: string): any[] {
    this.loadFromSessionStorage();
    return this.stores[storeName] || [];
  }

  // Add items to a store
  addItems(storeName: string, items: any[]): void {
    if (!this.stores[storeName]) {
      this.stores[storeName] = [];
    }
    this.stores[storeName] = [...this.stores[storeName], ...items];
    this.saveToSessionStorage();
  }

  // Update an item in a store
  updateItem(storeName: string, id: string | number, updatedItem: any): boolean {
    if (!this.stores[storeName]) return false;
    
    const index = this.stores[storeName].findIndex(item => item.id === id);
    if (index === -1) return false;
    
    this.stores[storeName][index] = { ...this.stores[storeName][index], ...updatedItem };
    this.saveToSessionStorage();
    return true;
  }

  // Delete an item from a store
  deleteItem(storeName: string, id: string | number): boolean {
    if (!this.stores[storeName]) return false;
    
    const initialLength = this.stores[storeName].length;
    this.stores[storeName] = this.stores[storeName].filter(item => item.id !== id);
    
    if (this.stores[storeName].length !== initialLength) {
      this.saveToSessionStorage();
      return true;
    }
    return false;
  }

  // Clear a specific store
  clearStore(storeName: string): void {
    if (this.stores[storeName]) {
      delete this.stores[storeName];
      this.saveToSessionStorage();
    }
  }

  // Clear all stores (logout or session end)
  clearAll(): void {
    this.stores = {};
    if (useSessionStorage && typeof window !== 'undefined') {
      sessionStorage.removeItem('zip-merge-session-data');
    }
  }

  // Check if a store exists
  hasStore(storeName: string): boolean {
    return !!this.stores[storeName];
  }

  // Get store names
  getStoreNames(): string[] {
    return Object.keys(this.stores);
  }
}

// Create a singleton instance
export const sessionStore = new SessionStore();

// Hook for tracking auth state
export const useSessionAuth = () => {
  const user = sessionStorage.getItem('zip-merge-user');
  return {
    isAuthenticated: !!user,
    user: user ? JSON.parse(user) : null,
    login: (email: string) => {
      const user = { email, id: Date.now().toString(), name: email.split('@')[0] };
      sessionStorage.setItem('zip-merge-user', JSON.stringify(user));
      return user;
    },
    logout: () => {
      sessionStorage.removeItem('zip-merge-user');
      sessionStore.clearAll();
    }
  };
};
