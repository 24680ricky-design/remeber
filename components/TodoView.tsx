import React, { useState, useEffect, useMemo } from 'react';
import { Todo, Category } from '../types';
import { Check, Trash2, Plus, X, ArrowRight, GripVertical, Calendar, List as ListIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  TouchSensor,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  defaultDropAnimationSideEffects,
  DropAnimation
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- Components ---

const SortableTodoItem = ({
  todo,
  onToggle,
  onDelete,
  showDate = false
}: {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onDelete: (id: string) => void;
  showDate?: boolean;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: todo.id, data: { type: 'Todo', todo } });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.3 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between p-3 rounded-xl transition-all duration-200 mb-2 border ${todo.isCompleted ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'
        }`}
    >
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing p-1 touch-none"
        >
          <GripVertical size={16} />
        </div>

        <button
          onClick={() => onToggle(todo)}
          className={`flex-shrink-0 w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-colors ${todo.isCompleted ? 'bg-nordic-green border-nordic-green' : 'border-gray-300 hover:border-nordic-green'
            }`}
        >
          {todo.isCompleted && <Check size={12} color="white" strokeWidth={3} />}
        </button>
        <div className="flex flex-col overflow-hidden">
          <span className={`text-gray-700 truncate font-medium text-sm transition-all select-none ${todo.isCompleted ? 'line-through text-gray-400' : ''
            }`}>
            {todo.text}
          </span>
          {showDate && todo.targetDate && (
            <span className="text-[10px] text-gray-400 flex items-center gap-1">
              <Calendar size={10} /> {todo.targetDate}
            </span>
          )}
        </div>
      </div>
      <button
        onClick={() => onDelete(todo.id)}
        className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

// --- Main Component ---

interface TodoViewProps {
  todos: Todo[];
  onTodosChange: () => void;
  onNavigateToExpense: (note: string) => void;
}

type ViewMode = 'list' | 'schedule';

const TodoView: React.FC<TodoViewProps> = ({ todos, onTodosChange, onNavigateToExpense }) => {
  const [items, setItems] = useState<Todo[]>(todos);
  const [viewMode, setViewMode] = useState<ViewMode>('schedule');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Date/Month State
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [processingTodo, setProcessingTodo] = useState<Todo | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null); // For DragOverlay

  useEffect(() => {
    setItems(todos);
  }, [todos]);

  // --- Helpers ---
  const adjustMonth = (delta: number) => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const newDate = new Date(y, m - 1 + delta, 1);
    setSelectedMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, '0')}`);
  };

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const [year, month] = selectedMonth.split('-').map(Number);
  const daysInMonth = getDaysInMonth(year, month);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dateObj = new Date(year, month - 1, d);
    const dayName = dateObj.toLocaleDateString('zh-TW', { weekday: 'short' });
    const isToday = new Date().toDateString() === dateObj.toDateString();
    return { d, dateStr, dayName, isToday };
  });

  // --- Logic ---

  const handleCreateTodo = async (text: string, date?: string) => {
    if (!text.trim()) return;
    setIsSubmitting(true);
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      isCompleted: false,
      createdAt: new Date().toISOString(),
      targetDate: date
    };

    setItems([newTodo, ...items]); // Optimistic
    await api.addTodo(newTodo);
    onTodosChange();
    setIsSubmitting(false);
  };

  const handleDelete = async (id: string) => {
    setItems(items.filter(t => t.id !== id));
    await api.deleteTodo(id);
    onTodosChange();
  };

  const handleToggle = async (todo: Todo) => {
    const newState = !todo.isCompleted;
    if (newState) {
      // Check if we should prompt for expense
      setProcessingTodo(todo);
      setModalOpen(true);
    } else {
      // Just toggle back
      await updateLocalAndRemote(items.map(t => t.id === todo.id ? { ...t, isCompleted: false, isCompletedAt: undefined } : t));
    }
  };

  const updateLocalAndRemote = async (newItems: Todo[]) => {
    setItems(newItems);
    // We use reorderTodos as a generic "Sync" for now since it saves the whole list
    await api.reorderTodos(newItems);
    onTodosChange();
  };

  const handleModalConfirm = async (addToExpense: boolean) => {
    if (!processingTodo) return;
    const updatedItems = items.map(t => t.id === processingTodo.id ? { ...t, isCompleted: true } : t);
    setItems(updatedItems);
    await api.toggleTodo(processingTodo.id, true); // Sync single status
    onTodosChange();

    setModalOpen(false);
    if (addToExpense) {
      onNavigateToExpense(processingTodo.text);
    }
    setProcessingTodo(null);
  };

  // --- DnD Handlers ---
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // If over a "Day Container" (droppable)
    // NOTE: dnd-kit sortable usually assumes items are draggable.
    // If we drag over a container that is empty, we handle it here.
    const activeItem = items.find(i => i.id === activeId);
    if (!activeItem) return;

    // Check if over is a date container (we'll prefix date containers with "date-")
    const isOverDateContainer = (over.id as string).startsWith('date-');

    if (isOverDateContainer) {
      const newDate = (over.id as string).replace('date-', '');
      if (activeItem.targetDate !== newDate) {
        setItems(items.map(t => t.id === activeId ? { ...t, targetDate: newDate } : t));
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Dragged to a regular item
    if (activeId !== overId) {
      const oldIndex = items.findIndex(t => t.id === activeId);
      const newIndex = items.findIndex(t => t.id === overId);

      // If simply reordering
      if (oldIndex !== -1 && newIndex !== -1) {
        // Check if we need to update date (if dragged into a different group)
        const activeItem = items[oldIndex];
        const overItem = items[newIndex];

        let newItems = arrayMove(items, oldIndex, newIndex);

        // If moving between lists (e.g. diff dates), adopt the date
        if (activeItem.targetDate !== overItem.targetDate) {
          newItems = newItems.map(t => t.id === activeId ? { ...t, targetDate: overItem.targetDate } : t);
        }

        await updateLocalAndRemote(newItems);
        return;
      }
    }

    // If dropped on container (handled in DragOver mostly, but persist here)
    if (overId.startsWith('date-')) {
      const newDate = overId.replace('date-', '');
      const item = items.find(t => t.id === activeId);
      if (item && item.targetDate !== newDate) {
        const newItems = items.map(t => t.id === activeId ? { ...t, targetDate: newDate } : t);
        await updateLocalAndRemote(newItems);
      }
    }
  };

  // --- Render Helpers ---

  const renderSchedule = () => {
    return (
      <div className="space-y-6">
        {daysArray.map(({ dateStr, d, dayName, isToday }) => {
          const dayTodos = items.filter(t => t.targetDate === dateStr);
          const isPast = new Date(dateStr) < new Date(new Date().setHours(0, 0, 0, 0));

          return (
            <div key={dateStr} className={`animate-fade-in-up`}>
              {/* Date Header */}
              <div
                className={`sticky top-[80px] z-10 flex items-center justify-between py-2 px-1 mb-2 backdrop-blur-sm bg-[#fdfbf7]/80 ${isToday ? 'text-nordic-blue' : 'text-gray-500'}`}
              >
                <div className="flex items-center gap-2">
                  <div className={`w-10 h-10 flex flex-col items-center justify-center rounded-xl border  ${isToday ? 'bg-nordic-blue text-white border-nordic-blue shadow-md' : 'bg-white border-gray-200'}`}>
                    <span className="text-[10px] uppercase leading-none">{dayName}</span>
                    <span className="text-lg font-bold leading-none">{d}</span>
                  </div>
                  {isToday && <span className="text-xs font-bold bg-nordic-blue/10 px-2 py-1 rounded-full">TODAY</span>}
                </div>
                <button
                  onClick={() => {
                    const text = prompt(`新增任務於 ${dateStr}:`);
                    if (text) handleCreateTodo(text, dateStr);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-nordic-green transition-colors"
                >
                  <Plus size={18} />
                </button>
              </div>

              {/* Drop Zone */}
              <SortableContext
                id={`date-${dateStr}`} // Acts as container ID
                items={dayTodos}
                strategy={verticalListSortingStrategy}
              >
                <div
                  className={`min-h-[60px] rounded-2xl p-2 transition-colors duration-300 ${dayTodos.length === 0 ? 'bg-gray-50/50 border-2 border-dashed border-gray-100 hover:border-nordic-blue/30' : ''}`}
                >
                  {dayTodos.map(todo => (
                    <SortableTodoItem
                      key={todo.id}
                      todo={todo}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                    />
                  ))}
                  {dayTodos.length === 0 && (
                    <div className="h-full flex items-center justify-center text-xs text-gray-300 cursor-default select-none">
                      無事項
                    </div>
                  )}
                </div>
              </SortableContext>
            </div>
          )
        })}
      </div>
    );
  };

  const renderList = () => {
    // Show all items, sorted by date then created
    const sorted = [...items].sort((a, b) => {
      if (!a.targetDate && !b.targetDate) return 0;
      if (!a.targetDate) return 1;
      if (!b.targetDate) return -1;
      return a.targetDate.localeCompare(b.targetDate);
    });

    return (
      <div className="space-y-2 p-1">
        <SortableContext items={sorted} strategy={verticalListSortingStrategy}>
          {sorted.map(todo => (
            <SortableTodoItem
              key={todo.id}
              todo={todo}
              onToggle={handleToggle}
              onDelete={handleDelete}
              showDate={true}
            />
          ))}
        </SortableContext>
        {sorted.length === 0 && <div className="text-center text-gray-300 mt-10">清單是空的</div>}
      </div>
    )
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: { opacity: '0.5' },
      },
    }),
  };

  return (
    <div className="pb-24 min-h-screen relative">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {/* Header Control */}
        <div className="bg-white p-4 rounded-[2rem] shadow-sm mb-6 sticky top-0 z-20 border border-gray-50">
          <div className="flex items-center justify-between mb-4">
            {/* Backlog / Schedule Switcher */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('schedule')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'schedule' ? 'bg-white shadow text-nordic-blue' : 'text-gray-400'}`}
              >
                <Calendar size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow text-nordic-blue' : 'text-gray-400'}`}
              >
                <ListIcon size={18} />
              </button>
            </div>

            {/* Month Picker (Only for Schedule) */}
            {viewMode === 'schedule' && (
              <div className="flex items-center gap-2">
                <button onClick={() => adjustMonth(-1)} className="text-gray-400 hover:text-nordic-blue"><ChevronLeft size={20} /></button>
                <div className="relative cursor-pointer group">
                  <span className="text-sm font-bold text-gray-700">{year}年 <span className="text-nordic-blue">{month}月</span></span>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => e.target.value && setSelectedMonth(e.target.value)}
                    onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  />
                  <div className="h-0.5 w-full bg-nordic-blue/20 mt-0.5 rounded-full group-hover:bg-nordic-blue/50 transition-colors"></div>
                </div>
                <button onClick={() => adjustMonth(1)} className="text-gray-400 hover:text-nordic-blue"><ChevronRight size={20} /></button>
              </div>
            )}
          </div>

          {/* Quick Add (Context Aware) */}
          <form
            onSubmit={(e) => { e.preventDefault(); const input = (e.target as any).text.value; handleCreateTodo(input, new Date().toISOString().split('T')[0]); (e.target as any).reset(); }}
            className="relative flex items-center"
          >
            <input
              name="text"
              type="text"
              placeholder={`新增任務至 ${new Date().toLocaleDateString('zh-TW')}...`}
              className="w-full bg-gray-50 rounded-2xl py-3 pl-4 pr-12 text-sm outline-none focus:ring-2 focus:ring-nordic-pink/50 transition-all placeholder-gray-400"
            />
            <button disabled={isSubmitting} className="absolute right-2 bg-nordic-text text-white p-2.5 rounded-xl hover:scale-105 transition-transform"><Plus size={16} /></button>
          </form>
        </div>

        {/* View Content */}
        <div className="px-1">
          {viewMode === 'schedule' ? renderSchedule() : renderList()}
        </div>

        {/* Drag Overlay */}
        <DragOverlay dropAnimation={dropAnimation}>
          {activeId ? (
            <div className="bg-white p-3 rounded-xl shadow-xl border border-nordic-blue/30 opacity-90 rotate-2">
              {(() => {
                const t = items.find(i => i.id === activeId);
                return t ? <span className="font-medium text-gray-700">{t.text}</span> : null;
              })()}
            </div>
          ) : null}
        </DragOverlay>

        {/* Expense Modal */}
        {modalOpen && processingTodo && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => handleModalConfirm(false)}></div>
            <div className="bg-white rounded-[2rem] shadow-2xl p-6 w-full max-w-sm relative z-10 animate-fade-in-up">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check size={24} />
              </div>
              <h3 className="text-xl font-bold text-center text-gray-800 mb-2">任務完成！</h3>
              <p className="text-center text-gray-500 mb-6">
                你已完成 <span className="font-semibold text-gray-700">"{processingTodo.text}"</span>。
                <br />是否將此列為支出？
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => handleModalConfirm(false)} className="py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold hover:bg-gray-200">不用了</button>
                <button onClick={() => handleModalConfirm(true)} className="py-3 rounded-xl bg-nordic-green text-white font-semibold hover:brightness-105 flex items-center justify-center gap-2">好，去記帳 <ArrowRight size={16} /></button>
              </div>
            </div>
          </div>
        )}

      </DndContext>
    </div>
  );
};

export default TodoView;