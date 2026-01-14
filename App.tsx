import React, { useState, useEffect, useCallback } from 'react';
import { LayoutDashboard, CheckSquare, Settings as SettingsIcon } from 'lucide-react';
import ExpenseView from './components/ExpenseView';
import TodoView from './components/TodoView';
import Settings from './components/Settings';
import { AppView, AppData } from './types';
import { api } from './services/api';
import { STORAGE_KEYS, DEFAULT_CATEGORIES } from './constants';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppView>(AppView.EXPENSE);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AppData>({ transactions: [], todos: [], categories: DEFAULT_CATEGORIES });
  const [initialExpenseNote, setInitialExpenseNote] = useState<string>('');
  const [appTitle, setAppTitle] = useState('生活管家');

  const refreshData = useCallback(async () => {
    try {
      const res = await api.fetchData();
      if (res.success && res.data) {
        // Merge categories if local has changes (simplified: assume local is source of truth for categories if cloud fails or mixed)
        // Here we just take what API gives
        setData(res.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const title = localStorage.getItem(STORAGE_KEYS.APP_TITLE);
    if (title) setAppTitle(title);
    refreshData();
  }, [refreshData]);

  // Handle navigation from Todo Completion -> Expense
  const handleNavigateToExpense = (note: string) => {
    setInitialExpenseNote(note);
    setActiveTab(AppView.EXPENSE);
  };

  const handleCategoriesChange = (cats: any[]) => {
    setData(prev => ({ ...prev, categories: cats }));
    api.saveCategories(cats); // Fire and forget save
  };

  const NavButton = ({ view, icon: Icon, label }: { view: AppView; icon: any; label: string }) => {
    const isActive = activeTab === view;
    return (
      <button
        onClick={() => setActiveTab(view)}
        className={`flex flex-col items-center justify-center w-16 h-16 rounded-2xl transition-all duration-300 ${isActive
            ? 'bg-nordic-text text-white shadow-lg -translate-y-4 scale-110'
            : 'text-gray-400 hover:bg-gray-100'
          }`}
      >
        <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
        {isActive && <span className="text-[10px] mt-1 font-medium animate-fade-in">{label}</span>}
      </button>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fdfbf7] text-nordic-blue">
        <div className="flex flex-col items-center gap-4 animate-pulse">
          <div className="w-12 h-12 rounded-full border-4 border-nordic-pink border-t-nordic-green animate-spin"></div>
          <span className="font-semibold tracking-widest uppercase text-xs">載入中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] max-w-md mx-auto relative shadow-2xl overflow-hidden flex flex-col">
      {/* Header */}
      <header className="px-8 pt-10 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 tracking-tight">{appTitle} <span className="text-xs text-nordic-blue font-normal bg-nordic-blue/10 px-2 py-0.5 rounded-full">v1.1</span></h1>
          <p className="text-xs text-gray-400 font-medium uppercase tracking-widest mt-1">
            {new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-nordic-pink flex items-center justify-center text-white font-bold text-sm">
          LM
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto px-6 pt-2 scrollbar-hide">
        {activeTab === AppView.EXPENSE && (
          <ExpenseView
            initialNote={initialExpenseNote}
            clearInitialNote={() => setInitialExpenseNote('')}
            transactions={data.transactions}
            categories={data.categories}
            onTransactionChange={refreshData}
          />
        )}
        {activeTab === AppView.TODO && (
          <TodoView
            todos={data.todos}
            onTodosChange={refreshData}
            onNavigateToExpense={handleNavigateToExpense}
          />
        )}
        {activeTab === AppView.SETTINGS && (
          <Settings
            categories={data.categories}
            onCategoriesChange={handleCategoriesChange}
          />
        )}
      </main>

      {/* Floating Bottom Navigation */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-white/50 p-2 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.08)] flex gap-4 z-40">
        <NavButton view={AppView.EXPENSE} icon={LayoutDashboard} label="記帳" />
        <NavButton view={AppView.TODO} icon={CheckSquare} label="待辦" />
        <NavButton view={AppView.SETTINGS} icon={SettingsIcon} label="設定" />
      </div>
    </div>
  );
};

export default App;