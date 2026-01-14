import { Category } from './types';

// Default Colors matching Nordic Theme
export const COLORS = {
  cream: '#fdfbf7',
  pink: '#e8d5d5',
  green: '#8da399',
  blue: '#8fa3ad',
  text: '#4a4a4a',
  white: '#ffffff',
  danger: '#e57373',
  success: '#8da399'
};

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat_1', label: '飲食', iconKey: 'Utensils', color: '#e8d5d5' },
  { id: 'cat_2', label: '交通', iconKey: 'Bus', color: '#8fa3ad' },
  { id: 'cat_3', label: '購物', iconKey: 'ShoppingBag', color: '#8da399' },
  { id: 'cat_4', label: '娛樂', iconKey: 'Film', color: '#f0c4c4' },
  { id: 'cat_5', label: '帳單', iconKey: 'Zap', color: '#b8c5d6' },
  { id: 'cat_6', label: '醫療', iconKey: 'Heart', color: '#d6b8b8' },
];

export const STORAGE_KEYS = {
  GAS_URL: 'lifemanager_gas_url',
  APP_TITLE: 'lifemanager_app_title',
  LOCAL_DATA: 'lifemanager_local_data',
};

export const CURRENCIES = [
  { code: 'TWD', label: '新台幣', symbol: 'NT$' },
  { code: 'USD', label: '美金', symbol: '$' },
  { code: 'JPY', label: '日幣', symbol: '¥' },
  { code: 'EUR', label: '歐元', symbol: '€' },
  { code: 'KRW', label: '韓元', symbol: '₩' },
  { code: 'CNY', label: '人民幣', symbol: '¥' },
];