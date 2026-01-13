export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export interface Category {
  id: string;
  label: string;
  iconKey: string; // Key to map to Lucide icons
  color: string;
}

export interface Transaction {
  id: string;
  date: string; // ISO String YYYY-MM-DD
  type: TransactionType;
  categoryId: string;
  amount: number;
  note: string;
}

export interface Todo {
  id: string;
  text: string;
  isCompleted: boolean;
  createdAt: string;
}

export interface AppData {
  transactions: Transaction[];
  todos: Todo[];
  categories: Category[];
}

export enum AppView {
  EXPENSE = 'EXPENSE',
  TODO = 'TODO',
  SETTINGS = 'SETTINGS'
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}