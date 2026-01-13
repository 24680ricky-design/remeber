import React, { useState, useEffect, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Transaction, Category, TransactionType } from '../types';
import { Trash2, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react';
import { api } from '../services/api';
import { COLORS } from '../constants';
import * as Icons from 'lucide-react';

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
  const [loading, setLoading] = useState(false);

  // Pre-fill note if coming from Todo
  useEffect(() => {
    if (initialNote) {
      setNote(initialNote);
      // Optional: Flash UI or focus
    }
  }, [initialNote]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(parseFloat(amount))) return;

    setLoading(true);
    const newTx: Transaction = {
      id: Date.now().toString(),
      date,
      type,
      categoryId: selectedCatId,
      amount: parseFloat(amount),
      note
    };

    const res = await api.addTransaction(newTx);
    if (res.success) {
      setAmount('');
      setNote('');
      if (initialNote) clearInitialNote();
      onTransactionChange();
    } else {
      alert('儲存失敗');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if(!window.confirm("確定要刪除這筆紀錄嗎？")) return;
    const res = await api.deleteTransaction(id);
    if (res.success) {
      onTransactionChange();
    }
  };

  // Dashboard Calculations
  const summary = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const monthTx = transactions.filter(t => t.date.startsWith(currentMonth));
    
    const income = monthTx.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const expense = monthTx.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    
    return { income, expense, balance: income - expense };
  }, [transactions]);

  // Chart Data
  const chartData = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const expenseTx = transactions.filter(t => t.type === TransactionType.EXPENSE && t.date.startsWith(currentMonth));
    const grouped: Record<string, number> = {};
    
    expenseTx.forEach(t => {
      const catName = categories.find(c => c.id === t.categoryId)?.label || '其他';
      grouped[catName] = (grouped[catName] || 0) + t.amount;
    });

    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [transactions, categories]);

  const COLORS_CHART = ['#8da399', '#8fa3ad', '#e8d5d5', '#f0c4c4', '#b8c5d6'];

  return (
    <div className="pb-24 animate-fade-in space-y-6">
      {/* Dashboard Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-[2rem] shadow-sm flex flex-col justify-between h-32">
           <div className="flex items-center text-nordic-green mb-2">
             <TrendingUp size={18} className="mr-2" />
             <span className="text-xs font-semibold uppercase tracking-wider">本月收入</span>
           </div>
           <span className="text-2xl font-bold text-gray-800">${summary.income.toLocaleString()}</span>
        </div>
        <div className="bg-white p-5 rounded-[2rem] shadow-sm flex flex-col justify-between h-32">
           <div className="flex items-center text-red-400 mb-2">
             <TrendingDown size={18} className="mr-2" />
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

          <div className="relative">
             <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={24} />
             <input
               type="number"
               inputMode="decimal"
               placeholder="0.00"
               value={amount}
               onChange={(e) => setAmount(e.target.value)}
               className="w-full pl-12 pr-4 py-4 text-4xl font-bold text-gray-700 bg-transparent border-b-2 border-gray-100 focus:border-nordic-green outline-none transition-colors placeholder-gray-200"
             />
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
      {chartData.length > 0 && (
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
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest px-4">近期紀錄</h3>
        {transactions.slice(0, 10).map((tx) => {
           const cat = categories.find(c => c.id === tx.categoryId);
           const IconComp = (Icons as any)[cat?.iconKey || 'Circle'] || Icons.Circle;
           return (
             <div key={tx.id} className="bg-white p-4 rounded-2xl flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3">
                   <div style={{ backgroundColor: cat?.color || '#eee' }} className="w-10 h-10 rounded-full flex items-center justify-center text-white">
                      <IconComp size={18} />
                   </div>
                   <div>
                     <p className="font-semibold text-gray-700 text-sm">{tx.note || cat?.label}</p>
                     <p className="text-xs text-gray-400">{tx.date}</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <span className={`font-bold ${tx.type === TransactionType.INCOME ? 'text-nordic-green' : 'text-gray-800'}`}>
                     {tx.type === TransactionType.INCOME ? '+' : '-'}${Math.abs(tx.amount).toLocaleString()}
                   </span>
                   <button onClick={() => handleDelete(tx.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                     <Trash2 size={16} />
                   </button>
                </div>
             </div>
           )
        })}
      </div>
    </div>
  );
};

export default ExpenseView;