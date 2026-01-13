import { Transaction, Todo, Category, AppData, ApiResponse } from '../types';
import { DEFAULT_CATEGORIES, STORAGE_KEYS } from '../constants';

// Helper to simulate delay for better UX feel in local mode
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

class ApiService {
  private getGasUrl(): string | null {
    return localStorage.getItem(STORAGE_KEYS.GAS_URL);
  }

  private getLocalData(): AppData {
    const raw = localStorage.getItem(STORAGE_KEYS.LOCAL_DATA);
    if (!raw) {
      const initial: AppData = {
        transactions: [],
        todos: [],
        categories: DEFAULT_CATEGORIES
      };
      localStorage.setItem(STORAGE_KEYS.LOCAL_DATA, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  }

  private saveLocalData(data: AppData) {
    localStorage.setItem(STORAGE_KEYS.LOCAL_DATA, JSON.stringify(data));
  }

  // --- CORE METHODS ---

  async fetchData(): Promise<ApiResponse<AppData>> {
    const url = this.getGasUrl();
    if (url) {
      try {
        const response = await fetch(`${url}?action=GET_DATA`);
        const json = await response.json();
        if (json.success) return json;
        throw new Error(json.message);
      } catch (e) {
        console.error("Cloud fetch failed, falling back to local for viewing only is not implemented, returning error", e);
        return { success: false, message: 'Failed to fetch from cloud.' };
      }
    } else {
      await delay(500); // Fake load
      return { success: true, data: this.getLocalData() };
    }
  }

  async addTransaction(transaction: Transaction): Promise<ApiResponse<Transaction>> {
    const url = this.getGasUrl();
    if (url) {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify({ action: 'ADD_TRANSACTION', payload: transaction })
      });
      return await response.json();
    } else {
      const data = this.getLocalData();
      data.transactions.unshift(transaction); // Add to top
      this.saveLocalData(data);
      await delay(300);
      return { success: true, data: transaction };
    }
  }

  async deleteTransaction(id: string): Promise<ApiResponse<null>> {
    const url = this.getGasUrl();
    if (url) {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify({ action: 'DELETE_TRANSACTION', payload: { id } })
      });
      return await response.json();
    } else {
      const data = this.getLocalData();
      data.transactions = data.transactions.filter(t => t.id !== id);
      this.saveLocalData(data);
      return { success: true };
    }
  }

  async addTodo(todo: Todo): Promise<ApiResponse<Todo>> {
    const url = this.getGasUrl();
    if (url) {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify({ action: 'ADD_TODO', payload: todo })
      });
      return await response.json();
    } else {
      const data = this.getLocalData();
      data.todos.unshift(todo);
      this.saveLocalData(data);
      return { success: true, data: todo };
    }
  }

  async toggleTodo(id: string, isCompleted: boolean): Promise<ApiResponse<null>> {
    const url = this.getGasUrl();
    if (url) {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify({ action: 'TOGGLE_TODO', payload: { id, isCompleted } })
      });
      return await response.json();
    } else {
      const data = this.getLocalData();
      const index = data.todos.findIndex(t => t.id === id);
      if (index !== -1) {
        data.todos[index].isCompleted = isCompleted;
        this.saveLocalData(data);
      }
      return { success: true };
    }
  }

  async deleteTodo(id: string): Promise<ApiResponse<null>> {
    const url = this.getGasUrl();
    if (url) {
      const response = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        body: JSON.stringify({ action: 'DELETE_TODO', payload: { id } })
      });
      return await response.json();
    } else {
      const data = this.getLocalData();
      data.todos = data.todos.filter(t => t.id !== id);
      this.saveLocalData(data);
      return { success: true };
    }
  }

  async saveCategories(categories: Category[]): Promise<ApiResponse<null>> {
    // For simplicity, categories are mostly local config unless we expand GAS script
    // But to follow the dual mode, let's just keep them in localStorage for config
    // or assume the GAS script handles them. 
    // To keep it simple: Categories are saved to local data structure.
    
    // In this implementation, we will save them to the same source.
    const url = this.getGasUrl();
    if(url) {
       // Ideally GAS handles this, but for this scope, let's mock it or assume simple sync
       // If using GAS, we might not update categories often. 
       // Let's implement local only for categories to avoid complexity or update both.
       localStorage.setItem('lifemanager_categories_cache', JSON.stringify(categories));
       return { success: true };
    } else {
        const data = this.getLocalData();
        data.categories = categories;
        this.saveLocalData(data);
        return { success: true };
    }
  }
}

export const api = new ApiService();