import React, { useState, useEffect } from 'react';
import { Todo } from '../types';
import { Check, Trash2, Plus, X, ArrowRight, GripVertical } from 'lucide-react';
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
  MouseSensor
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TodoViewProps {
  todos: Todo[];
  onTodosChange: () => void;
  onNavigateToExpense: (note: string) => void;
}

// Separate component for the Sortable Item
const SortableTodoItem = ({
  todo,
  onToggle,
  onDelete
}: {
  todo: Todo;
  onToggle: (todo: Todo) => void;
  onDelete: (id: string) => void;
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1, // Lift dragging item
    opacity: isDragging ? 0.8 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between p-4 rounded-2xl transition-all duration-200 mb-3 ${todo.isCompleted ? 'bg-gray-100 opacity-60' : 'bg-white shadow-sm hover:shadow-md'
        }`}
    >
      <div className="flex items-center gap-3 overflow-hidden flex-1">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing p-1 touch-none"
        >
          <GripVertical size={18} />
        </div>

        <button
          onClick={() => onToggle(todo)}
          className={`flex-shrink-0 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${todo.isCompleted ? 'bg-nordic-green border-nordic-green' : 'border-gray-300 hover:border-nordic-green'
            }`}
        >
          {todo.isCompleted && <Check size={14} color="white" strokeWidth={3} />}
        </button>
        <span className={`text-gray-700 truncate font-medium transition-all select-none ${todo.isCompleted ? 'line-through text-gray-400' : ''
          }`}>
          {todo.text}
        </span>
      </div>
      <button
        onClick={() => onDelete(todo.id)}
        className="text-gray-300 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-2"
      >
        <Trash2 size={18} />
      </button>
    </div>
  );
};

const TodoView: React.FC<TodoViewProps> = ({ todos, onTodosChange, onNavigateToExpense }) => {
  const [inputText, setInputText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [items, setItems] = useState<Todo[]>(todos);

  // Sync items with props when props change (e.g. initial load or add/delete from outside)
  useEffect(() => {
    setItems(todos);
  }, [todos]);

  // Custom Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [processingTodo, setProcessingTodo] = useState<Todo | null>(null);

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor), // Pointer handles both mouse and touch reasonably well for basics
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    // Explicit mouse/touch sensors can be used if Pointer has issues, but Pointer is usually best for modern React
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Slight delay for touch to differentiate from scroll if no handle, but we have a handle so it's safer
        tolerance: 5,
      },
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const newItems = arrayMove(items, oldIndex, newIndex);

        // Save new order asynchronously
        api.reorderTodos(newItems).then(() => {
          onTodosChange(); // Sync with parent/cloud after save
        });

        return newItems;
      });
    }
  };

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

    // Optimistic update
    setItems([newTodo, ...items]);

    await api.addTodo(newTodo);
    setInputText('');
    setIsSubmitting(false);
    onTodosChange();
  };

  const handleDelete = async (id: string) => {
    // Optimistic update
    setItems(items.filter(t => t.id !== id));
    await api.deleteTodo(id);
    onTodosChange();
  };

  const handleCheckClick = (todo: Todo) => {
    if (todo.isCompleted) {
      toggleCompletion(todo.id, false);
    } else {
      setProcessingTodo(todo);
      setModalOpen(true);
    }
  };

  const toggleCompletion = async (id: string, state: boolean) => {
    // Optimistic
    setItems(items.map(t => t.id === id ? { ...t, isCompleted: state } : t));
    await api.toggleTodo(id, state);
    onTodosChange();
  };

  const handleModalConfirm = async (addToExpense: boolean) => {
    if (!processingTodo) return;

    await toggleCompletion(processingTodo.id, true);
    setModalOpen(false);

    if (addToExpense) {
      onNavigateToExpense(processingTodo.text);
    }
    setProcessingTodo(null);
  };

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
        {items.length === 0 && (
          <div className="text-center text-gray-300 mt-20">目前沒有任務，好好享受今天！</div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items}
            strategy={verticalListSortingStrategy}
          >
            {items.map(todo => (
              <SortableTodoItem
                key={todo.id}
                todo={todo}
                onToggle={handleCheckClick}
                onDelete={handleDelete}
              />
            ))}
          </SortableContext>
        </DndContext>
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
              <br />是否要將此項目新增為一筆支出？
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