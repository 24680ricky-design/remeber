import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Transaction, Category, TransactionType } from '../types';
import { api } from '../services/api';
import { COLORS, CURRENCIES } from '../constants';
import * as Icons from 'lucide-react';
import { getExchangeRate } from '../services/currency';

interface ExpenseViewProps {
  initialNote?: string;
  clearInitialNote: () => void;
  transactions: Transaction[];
  categories: Category[];
  onTransactionChange: () => void;
}

const ExpenseView: React.FC<ExpenseViewProps> = ({
  initialNote,
  clearInitialNote,
  transactions,
  categories,
  onTransactionChange
}) => {
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [selectedCatId, setSelectedCatId] = useState<string>(categories[0]?.id || '');
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [currency, setCurrency] = useState<string>('TWD');
  const [loading, setLoading] = useState(false);

  // Month Selection State (YYYY-MM) - Use Local Time
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Pre-fill note if coming from Todo
  useEffect(() => {
    if (initialNote) {
      setNote(initialNote);
    }
  }, [initialNote]);

  const adjustMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    // Create date using local time constructor
    const newDate = new Date(y, m - 1 + delta, 1);
    const newY = newDate.getFullYear();
    const newM = newDate.getMonth() + 1;
    setSelectedMonth(`${newY}-${String(newM).padStart(2, '0')}`);
  };

  const handlePrevMonth = () => adjustMonth(-1);
  const handleNextMonth = () => adjustMonth(1);

  const currentMonthTransactions = useMemo(() => {
    return transactions.filter(t => t.date.startsWith(selectedMonth));
  }, [transactions, selectedMonth]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) return;

    setLoading(true);
    let finalAmount = parseFloat(amount);
    let finalNote = note;

    if (currency !== 'TWD') {
      try {
        const rate = await getExchangeRate(currency, 'TWD');
        if (rate) {
          const originalAmount = finalAmount;
          finalAmount = Math.round(originalAmount * rate);
          const noteSuffix = ` (原幣: ${currency} ${originalAmount})`;
          finalNote = finalNote ? finalNote + noteSuffix : noteSuffix;
        } else {
          alert('無法取得匯率，將以原幣金額儲存');
        }
      } catch (error) {
        console.error(error);
        alert('匯率換算失敗');
      }
    }

    const newTx: Transaction = {
      id: Date.now().toString(),
      date,
      type,
      categoryId: selectedCatId,
      amount: finalAmount,
      note: finalNote
    };

    const res = await api.addTransaction(newTx);
    if (res.success) {
      setAmount('');
      setNote('');
      setCurrency('TWD'); // Reset to default
      if (initialNote) clearInitialNote();
      onTransactionChange();
    } else {
      alert('儲存失敗');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("確定要刪除這筆紀錄嗎？")) return;
    const res = await api.deleteTransaction(id);
    if (res.success) {
      onTransactionChange();
    }
  };

  // Dashboard Calculations (Based on Selected Month)
  const summary = useMemo(() => {
    const income = currentMonthTransactions.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const expense = currentMonthTransactions.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    return { income, expense, balance: income - expense };
  }, [currentMonthTransactions]);

  // Chart Data (Based on Selected Month)
  const chartData = useMemo(() => {
    const expenseTx = currentMonthTransactions.filter(t => t.type === TransactionType.EXPENSE);
    const grouped: Record<string, number> = {};

    expenseTx.forEach(t => {
      const catName = categories.find(c => c.id === t.categoryId)?.label || '其他';
      grouped[catName] = (grouped[catName] || 0) + t.amount;
    });

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [currentMonthTransactions, categories]);

  // Group Transactions by Date
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    currentMonthTransactions.forEach(t => {
      if (!groups[t.date]) groups[t.date] = [];
      groups[t.date].push(t);
    });
    // Sort dates descending
    return Object.keys(groups).sort((a, b) => b.localeCompare(a)).map(date => {
      const txs = groups[date];
      const dailyIncome = txs.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
      const dailyExpense = txs.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
      return { date, txs, dailyIncome, dailyExpense };
    });
  }, [currentMonthTransactions]);

  const COLORS_CHART = ['#8da399', '#8fa3ad', '#e8d5d5', '#f0c4c4', '#b8c5d6'];

  const [year, month] = selectedMonth.split('-');

  return (
    <div className="pb-24 animate-fade-in space-y-6">

      {/* Month Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-[2rem] shadow-sm">
        <button onClick={handlePrevMonth} className="p-2 text-gray-400 hover:text-nordic-blue transition-colors">
          <Icons.ChevronLeft size={24} />
        </button>
        <div className="relative group cursor-pointer flex flex-col items-center">
          <h2 className="text-lg font-bold text-gray-800 tracking-wide pointer-events-none">
            {year}年 <span className="text-nordic-blue">{month}月</span>
          </h2>
          {/* Hint line */}
          <div className="h-1 w-8 bg-nordic-blue/20 rounded-full mt-1 group-hover:bg-nordic-blue/40 transition-colors pointer-events-none"></div>

          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
            onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
        </div>

        <button onClick={handleNextMonth} className="p-2 text-gray-400 hover:text-nordic-blue transition-colors">
          <Icons.ChevronRight size={24} />
        </button>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-[2rem] shadow-sm flex flex-col justify-between h-32">
          <div className="flex items-center text-nordic-green mb-2">
            <Icons.TrendingUp size={18} className="mr-2" />
            <span className="text-xs font-semibold uppercase tracking-wider">本月收入</span>
          </div>
          <span className="text-2xl font-bold text-gray-800">${summary.income.toLocaleString()}</span>
        </div>
        <div className="bg-white p-5 rounded-[2rem] shadow-sm flex flex-col justify-between h-32">
          <div className="flex items-center text-red-400 mb-2">
            <Icons.TrendingDown size={18} className="mr-2" />
            <span className="text-xs font-semibold uppercase tracking-wider">本月支出</span>
          </div>
          <span className="text-2xl font-bold text-gray-800">${summary.expense.toLocaleString()}</span>
        </div>
      </div>

      {/* Input Section */}
      <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex justify-center mb-4">
            <div className="bg-gray-100 p-1 rounded-full flex">
              <button
                type="button"
                onClick={() => setType(TransactionType.EXPENSE)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${type === TransactionType.EXPENSE ? 'bg-white shadow-sm text-nordic-text' : 'text-gray-400'}`}
              >
                支出
              </button>
              <button
                type="button"
                onClick={() => setType(TransactionType.INCOME)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${type === TransactionType.INCOME ? 'bg-white shadow-sm text-nordic-text' : 'text-gray-400'}`}
              >
                收入
              </button>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                {CURRENCIES.find(c => c.code === currency)?.symbol}
              </span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-12 pr-4 py-4 text-4xl font-bold text-gray-700 bg-transparent border-b-2 border-gray-100 focus:border-nordic-green outline-none transition-colors placeholder-gray-200"
              />
            </div>
            <div className="relative w-24">
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-full py-4 bg-gray-50 rounded-xl text-center font-bold text-gray-600 outline-none focus:ring-2 focus:ring-nordic-green/20 appearance-none"
              >
                {CURRENCIES.map(c => (
                  <option key={c.code} value={c.code}>{c.code}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                <Icons.ChevronDown size={14} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 py-2">
            {categories.map((cat) => {
              // Dynamic Icon Loading
              const IconComp = (Icons as any)[cat.iconKey] || Icons.Circle;
              const isSelected = selectedCatId === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCatId(cat.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-2xl transition-all ${isSelected ? 'bg-nordic-green/10 ring-2 ring-nordic-green ring-offset-2' : 'hover:bg-gray-50'}`}
                >
                  <div
                    style={{ backgroundColor: isSelected ? cat.color : '#f3f4f6' }}
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-1 transition-colors"
                  >
                    <IconComp size={18} color={isSelected ? '#fff' : '#9ca3af'} />
                  </div>
                  <span className={`text-[10px] truncate w-full text-center ${isSelected ? 'font-bold text-nordic-text' : 'text-gray-400'}`}>
                    {cat.label}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="備註事項..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-nordic-green/20 outline-none"
              />
            </div>
            <div className="relative w-1/3">
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-50 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-nordic-green/20 outline-none"
              />
            </div>
          </div>

          <button
            disabled={loading}
            type="submit"
            className="w-full bg-nordic-green text-white py-4 rounded-xl font-semibold shadow-lg shadow-nordic-green/30 active:scale-[0.98] transition-all hover:brightness-105 disabled:opacity-50"
          >
            {loading ? '儲存中...' : '新增交易'}
          </button>
        </form>
      </div>

      {/* Chart & List */}
      {
        chartData.length > 0 && (
          <div className="bg-white p-6 rounded-[2rem] shadow-sm">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">統計分析</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_CHART[index % COLORS_CHART.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )
      }

      {/* Grouped Transaction List */}
      <div className="space-y-4">
        {groupedTransactions.length === 0 && (
          <div className="text-center text-gray-300 py-10">本月尚無紀錄</div>
        )}

        {groupedTransactions.map((group) => {
          const dateObj = new Date(group.date);
          const dateStr = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
          const dayStr = dateObj.toLocaleDateString('zh-TW', { weekday: 'long' });

          return (
            <div key={group.date} className="animate-fade-in-up">
              {/* Daily Header */}
              <div className="flex items-center justify-between px-4 mb-2">
                <div className="text-sm font-bold text-gray-500">
                  {dateStr} <span className="text-xs font-normal text-gray-400 ml-1">{dayStr}</span>
                </div>
                <div className="text-xs font-medium text-gray-400 flex gap-3">
                  {group.dailyIncome > 0 && <span className="text-nordic-green">+{group.dailyIncome}</span>}
                  {group.dailyExpense > 0 && <span className="text-red-400">-{group.dailyExpense}</span>}
                </div>
              </div>

              {/* Transactions for this day */}
              <div className="space-y-2">
                {group.txs.map((tx) => {
                  const cat = categories.find(c => c.id === tx.categoryId);
                  const IconComp = (Icons as any)[cat?.iconKey || 'Circle'] || Icons.Circle;
                  return (
                    <div key={tx.id} className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div style={{ backgroundColor: cat?.color || '#eee' }} className="w-10 h-10 rounded-full flex items-center justify-center text-white">
                          <IconComp size={18} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-semibold text-gray-700 text-sm truncate max-w-[120px]">{tx.note || cat?.label}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`font-bold ${tx.type === TransactionType.INCOME ? 'text-nordic-green' : 'text-gray-800'}`}>
                          {tx.type === TransactionType.INCOME ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()}
                        </span>
                        <button onClick={() => handleDelete(tx.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                          <Icons.Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div >
  );
};

export default ExpenseView;