import React, { useState } from 'react';
import { Todo } from '../types';
import { Check, Trash2, Plus, X, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

interface TodoViewProps {
  todos: Todo[];
  onTodosChange: () => void;
  onNavigateToExpense: (note: string) => void;
}

const TodoView: React.FC<TodoViewProps> = ({ todos, onTodosChange, onNavigateToExpense }) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Custom Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [processingTodo, setProcessingTodo] = useState<Todo | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    setIsSubmitting(true);
    const newTodo: Todo = {
      id: Date.now().toString(),
      text: inputText,
      isCompleted: false,
      createdAt: new Date().toISOString()
    };
    await api.addTodo(newTodo);
    setInputText('');
    setIsSubmitting(false);
    onTodosChange();
  };

  const handleDelete = async (id: string) => {
    await api.deleteTodo(id);
    onTodosChange();
  };

  // The Critical Logic: Click Check -> Loading UI -> Ask -> Execute
  const handleCheckClick = (todo: Todo) => {
    if (todo.isCompleted) {
        // Unchecking is simple, just toggle back
        toggleCompletion(todo.id, false);
    } else {
        // Checking triggers the flow
        setProcessingTodo(todo);
        setModalOpen(true);
    }
  };

  const toggleCompletion = async (id: string, state: boolean) => {
      await api.toggleTodo(id, state);
      onTodosChange();
  };

  const handleModalConfirm = async (addToExpense: boolean) => {
      if (!processingTodo) return;
      
      // 1. Update status in DB (Execute)
      await toggleCompletion(processingTodo.id, true);
      
      // 2. Close Modal
      setModalOpen(false);
      
      // 3. Conditional Navigation
      if (addToExpense) {
          onNavigateToExpense(processingTodo.text);
      }
      
      setProcessingTodo(null);
  };

  // Sort: Incomplete first
  const sortedTodos = [...todos].sort((a, b) => Number(a.isCompleted) - Number(b.isCompleted));

  return (
    <div className="pb-24 min-h-screen relative">
       {/* Input Header */}
       <div className="bg-white p-6 rounded-[2rem] shadow-sm mb-6 sticky top-0 z-10">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">待辦事項</h2>
          <form onSubmit={handleAdd} className="relative flex items-center">
             <input
               type="text"
               value={inputText}
               onChange={(e) => setInputText(e.target.value)}
               placeholder="新增任務..."
               className="w-full bg-gray-50 rounded-2xl py-4 pl-5 pr-14 outline-none focus:ring-2 focus:ring-nordic-pink/50 transition-all placeholder-gray-400"
             />
             <button
                disabled={isSubmitting}
                type="submit"
                className="absolute right-2 bg-nordic-text text-white p-2.5 rounded-xl hover:scale-105 active:scale-95 transition-transform"
             >
               <Plus size={20} />
             </button>
          </form>
       </div>

       {/* List */}
       <div className="space-y-3 px-1">
          {sortedTodos.length === 0 && (
              <div className="text-center text-gray-300 mt-20">目前沒有任務，好好享受今天！</div>
          )}
          {sortedTodos.map(todo => (
             <div 
               key={todo.id}
               className={`group flex items-center justify-between p-4 rounded-2xl transition-all duration-300 ${todo.isCompleted ? 'bg-gray-100 opacity-60' : 'bg-white shadow-sm hover:shadow-md'}`}
             >
                <div className="flex items-center gap-4 overflow-hidden">
                   <button
                     onClick={() => handleCheckClick(todo)}
                     className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${todo.isCompleted ? 'bg-nordic-green border-nordic-green' : 'border-gray-300 hover:border-nordic-green'}`}
                   >
                     {todo.isCompleted && <Check size={14} color="white" strokeWidth={3} />}
                   </button>
                   <span className={`text-gray-700 truncate font-medium transition-all ${todo.isCompleted ? 'line-through text-gray-400' : ''}`}>
                     {todo.text}
                   </span>
                </div>
                <button 
                  onClick={() => handleDelete(todo.id)}
                  className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                >
                  <Trash2 size={18} />
                </button>
             </div>
          ))}
       </div>

       {/* Custom Modal Backdrop */}
       {modalOpen && processingTodo && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => handleModalConfirm(false)}></div>
            <div className="bg-white rounded-[2rem] shadow-2xl p-6 w-full max-w-sm relative z-10 animate-fade-in-up">
               <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check size={24} />
               </div>
               <h3 className="text-xl font-bold text-center text-gray-800 mb-2">太棒了！</h3>
               <p className="text-center text-gray-500 mb-6">
                 你已完成 <span className="font-semibold text-gray-700">"{processingTodo.text}"</span>。
                 <br/>是否要將此項目新增為一筆支出？
               </p>
               <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleModalConfirm(false)}
                    className="py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200 transition-colors"
                  >
                    不用了
                  </button>
                  <button
                    onClick={() => handleModalConfirm(true)}
                    className="py-3 rounded-xl bg-nordic-green text-white font-semibold hover:brightness-105 transition-all flex items-center justify-center gap-2"
                  >
                    好，去記帳 <ArrowRight size={16} />
                  </button>
               </div>
            </div>
         </div>
       )}
    </div>
  );
};

export default TodoView;