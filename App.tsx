import React, { useState, useEffect, useCallback, useRef } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { 
  Plus, Search, LayoutGrid, List, BarChart2, Moon, Sun, 
  Trash2, Copy, CheckCircle, Circle, Calendar as CalendarIcon, AlertCircle, 
  Volume2, Menu, X, Tag, MoreVertical, Upload, Clock, Bell, Palette, Check
} from 'lucide-react';
import { VoiceInput } from './components/VoiceInput';
import { TaskStats } from './components/TaskStats';
import { CalendarView } from './components/CalendarView';
import { geminiService } from './services/geminiService';
import { Task, Priority, TaskStatus, Category, Recurrence } from './types';

// --- MOCK BACKEND DATA (Initial State) ---
const INITIAL_TASKS: Task[] = [];

const INITIAL_CATEGORIES: Category[] = [
  { id: '1', name: 'Work', color: 'bg-blue-500' },
  { id: '2', name: 'Personal', color: 'bg-green-500' },
  { id: '3', name: 'Academics', color: 'bg-purple-500' }
];

const COLOR_OPTIONS = [
  { name: 'Red', value: 'bg-red-500' },
  { name: 'Orange', value: 'bg-orange-500' },
  { name: 'Amber', value: 'bg-amber-500' },
  { name: 'Green', value: 'bg-emerald-500' },
  { name: 'Teal', value: 'bg-teal-500' },
  { name: 'Blue', value: 'bg-blue-500' },
  { name: 'Indigo', value: 'bg-indigo-500' },
  { name: 'Purple', value: 'bg-purple-500' },
  { name: 'Pink', value: 'bg-pink-500' },
  { name: 'Gray', value: 'bg-slate-500' },
];

// --- APP COMPONENT ---

function App() {
  // State
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('typeit_tasks');
    return saved ? JSON.parse(saved) : INITIAL_TASKS;
  });
  
  const [categories, setCategories] = useState<Category[]>(() => {
    const saved = localStorage.getItem('typeit_categories');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration: Rename Learning to Academics for existing users
      return parsed.map((c: Category) => 
        (c.name === 'Learning' && c.id === '3') ? { ...c, name: 'Academics' } : c
      );
    }
    return INITIAL_CATEGORIES;
  });

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('typeit_theme') === 'dark' || 
           (!localStorage.getItem('typeit_theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'tasks' | 'dashboard' | 'calendar'>('tasks');
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Task Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Category Modal State
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryColor, setNewCategoryColor] = useState(COLOR_OPTIONS[5].value); // Default Blue

  // Reminder State
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [upcomingTasks, setUpcomingTasks] = useState<Task[]>([]);
  const hasCheckedReminders = useRef(false);

  // Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPriority, setFormPriority] = useState<Priority>(Priority.MEDIUM);
  const [formCategory, setFormCategory] = useState(INITIAL_CATEGORIES[0].name);
  const [formDueDate, setFormDueDate] = useState('');

  // Effects
  useEffect(() => {
    localStorage.setItem('typeit_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('typeit_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('typeit_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('typeit_theme', 'light');
    }
  }, [darkMode]);

  // Check for reminders on load (Tasks due tomorrow)
  useEffect(() => {
    if (hasCheckedReminders.current || tasks.length === 0) return;

    const checkUpcomingTasks = () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const dueTomorrow = tasks.filter(t => {
        if (!t.dueDate || t.status === TaskStatus.DONE) return false;
        // Check if date string starts with YYYY-MM-DD of tomorrow
        return t.dueDate.startsWith(tomorrowStr);
      });

      if (dueTomorrow.length > 0) {
        setUpcomingTasks(dueTomorrow);
        setShowReminderModal(true);
      }
      hasCheckedReminders.current = true;
    };

    // Small delay to ensure UI is ready
    const timer = setTimeout(checkUpcomingTasks, 1000);
    return () => clearTimeout(timer);
  }, [tasks]);

  // Actions
  const handleAddTask = (newTask: Partial<Task>) => {
    const task: Task = {
      id: crypto.randomUUID(),
      title: newTask.title || 'Untitled Task',
      description: newTask.description || '',
      priority: newTask.priority || Priority.MEDIUM,
      status: TaskStatus.TODO,
      category: newTask.category || categories[0].name,
      tags: newTask.tags || [],
      recurrence: newTask.recurrence || Recurrence.NONE,
      createdAt: Date.now(),
      dueDate: newTask.dueDate || '',
    };
    setTasks(prev => [task, ...prev]);
  };

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
  };

  const handleDeleteTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const handleToggleComplete = (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return { 
          ...t, 
          status: t.status === TaskStatus.DONE ? TaskStatus.TODO : TaskStatus.DONE 
        };
      }
      return t;
    }));
  };

  const handleDuplicate = (task: Task) => {
    const newTask = { ...task, id: crypto.randomUUID(), title: `${task.title} (Copy)`, createdAt: Date.now() };
    setTasks(prev => [newTask, ...prev]);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCat: Category = {
      id: crypto.randomUUID(),
      name: newCategoryName.trim(),
      color: newCategoryColor
    };
    setCategories(prev => [...prev, newCat]);
    setFormCategory(newCat.name); // Select the new category
    setNewCategoryName('');
    setIsCategoryModalOpen(false);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedTasks = JSON.parse(e.target?.result as string);
        if (Array.isArray(importedTasks)) {
            setTasks(prev => [...importedTasks, ...prev]); // Merge approach
            alert("Tasks imported successfully!");
        }
      } catch (err) {
        alert("Invalid JSON file.");
      }
    };
    reader.readAsText(file);
  };

  // Helper to open modal
  const openTaskModal = (task?: Task, prefillDate?: Date) => {
    if (task) {
        setEditingTask(task);
        setFormTitle(task.title);
        setFormDesc(task.description || '');
        setFormPriority(task.priority);
        setFormCategory(task.category);
        setFormDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
    } else {
        setEditingTask(null);
        setFormTitle('');
        setFormDesc('');
        setFormPriority(Priority.MEDIUM);
        setFormCategory(categories[0]?.name || 'Work');
        setFormDueDate(prefillDate ? prefillDate.toISOString().split('T')[0] : '');
    }
    setIsModalOpen(true);
  };

  // AI Handlers
  const handleVoiceTranscription = (text: string) => {
    console.log("Transcribed:", text);
  };

  const handleVoiceParsed = (taskData: Partial<Task>) => {
    handleAddTask(taskData);
  };

  const handleTTS = async (task: Task) => {
    const textToRead = `Task: ${task.title}. Priority: ${task.priority}. ${task.description ? 'Description: ' + task.description : ''}`;
    try {
        await geminiService.speakText(textToRead);
    } catch (e) {
        alert("Failed to generate speech. Check API Key.");
    }
  };

  // Drag and Drop
  const [draggedItem, setDraggedItem] = useState<Task | null>(null);

  const onDragStart = (e: React.DragEvent, item: Task) => {
    setDraggedItem(item);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const onDrop = (e: React.DragEvent, dropIndex: number) => {
     if (!draggedItem) return;
     const newTasks = [...tasks];
     const dragIndex = newTasks.findIndex(t => t.id === draggedItem.id);
     
     newTasks.splice(dragIndex, 1);
     newTasks.splice(dropIndex, 0, draggedItem);
     
     setTasks(newTasks);
     setDraggedItem(null);
  };


  // Filtered Tasks
  const filteredTasks = tasks.filter(t => {
    const matchesSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'All' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Render Helpers
  const PriorityBadge = ({ p }: { p: Priority }) => {
    const colors = {
      [Priority.LOW]: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      [Priority.MEDIUM]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      [Priority.HIGH]: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      [Priority.URGENT]: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors[p]}`}>{p}</span>;
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300 overflow-hidden font-sans">
      
      {/* Sidebar - Mobile Responsive */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:shadow-none border-r dark:border-gray-700
      `}>
        <div className="p-6 flex items-center justify-between">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-600">
                MyPlanner
            </h1>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-gray-500">
                <X size={24} />
            </button>
        </div>

        <nav className="px-4 space-y-2 mt-4">
            <button 
                onClick={() => setActiveTab('tasks')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'tasks' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
                <List size={20} /> Tasks
            </button>
            <button 
                onClick={() => setActiveTab('calendar')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'calendar' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
                <CalendarIcon size={20} /> Calendar
            </button>
            <button 
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 font-medium' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
                <BarChart2 size={20} /> Dashboard
            </button>
        </nav>

        <div className="absolute bottom-6 left-0 w-full px-6">
            <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-xl space-y-3">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                    <span>Dark Mode</span>
                    <button 
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-1 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 transition-colors"
                    >
                        {darkMode ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                </div>
                <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
                     <label className="w-full cursor-pointer flex items-center justify-center gap-1 text-xs font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-600 py-2 rounded border dark:border-gray-500 hover:bg-gray-50">
                        <Upload size={12} /> Import
                        <input type="file" onChange={handleImport} accept=".json" className="hidden" />
                     </label>
                </div>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 sm:px-8 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex items-center gap-4">
                <button onClick={() => setSidebarOpen(true)} className="md:hidden text-gray-600 dark:text-gray-300">
                    <Menu size={24} />
                </button>
                <div className="relative hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search tasks..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64 text-gray-700 dark:text-gray-200 transition-all"
                    />
                </div>
            </div>
            <div className="flex items-center gap-3">
                <VoiceInput onTranscription={(t) => setSearchQuery(t)} onTaskParsed={handleVoiceParsed} />
                <button 
                    onClick={() => openTaskModal()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full font-medium transition-colors shadow-lg shadow-indigo-500/30"
                >
                    <Plus size={20} />
                    <span className="hidden sm:inline">New Task</span>
                </button>
            </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 custom-scrollbar">
            {activeTab === 'dashboard' ? (
                <div className="max-w-5xl mx-auto animate-fadeIn">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-100">Analytics Dashboard</h2>
                    <TaskStats tasks={tasks} />
                </div>
            ) : activeTab === 'calendar' ? (
                <div className="h-[calc(100vh-8rem)] animate-fadeIn">
                    <CalendarView 
                        tasks={tasks} 
                        categories={categories}
                        onSelectDate={(date) => openTaskModal(undefined, date)}
                        onSelectTask={(task) => openTaskModal(task)}
                    />
                </div>
            ) : (
                <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
                    
                    {/* Filters */}
                    <div className="flex items-center gap-2 pb-2 overflow-x-auto no-scrollbar">
                        {(['All', TaskStatus.TODO, TaskStatus.IN_PROGRESS, TaskStatus.DONE] as const).map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                                    filterStatus === status 
                                    ? 'bg-gray-900 text-white dark:bg-white dark:text-black' 
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300'
                                }`}
                            >
                                {status}
                            </button>
                        ))}
                    </div>

                    {/* Task List */}
                    <div className="space-y-3">
                        {filteredTasks.length === 0 ? (
                            <div className="text-center py-20">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/20 mb-4">
                                    <CheckCircle className="w-8 h-8 text-indigo-500" />
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">No tasks found</h3>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">Try adjusting filters or add a new task.</p>
                            </div>
                        ) : (
                            filteredTasks.map((task, index) => {
                                const category = categories.find(c => c.name === task.category);
                                return (
                                <div 
                                    key={task.id}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, task)}
                                    onDragOver={(e) => onDragOver(e, index)}
                                    onDrop={(e) => onDrop(e, index)}
                                    className={`
                                        group relative bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm 
                                        hover:shadow-md transition-all duration-200 cursor-move
                                        ${task.status === TaskStatus.DONE ? 'opacity-60' : ''}
                                    `}
                                >
                                    <div className="flex items-start gap-4">
                                        <button 
                                            onClick={() => handleToggleComplete(task.id)}
                                            className={`mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                                                ${task.status === TaskStatus.DONE 
                                                    ? 'bg-green-500 border-green-500 text-white' 
                                                    : 'border-gray-300 dark:border-gray-600 hover:border-indigo-500'
                                                }`}
                                        >
                                            {task.status === TaskStatus.DONE && <CheckCircle size={14} fill="currentColor" />}
                                        </button>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className={`font-semibold text-gray-900 dark:text-gray-100 truncate ${task.status === TaskStatus.DONE ? 'line-through text-gray-500' : ''}`}>
                                                    {task.title}
                                                </h3>
                                                <PriorityBadge p={task.priority} />
                                            </div>
                                            {task.description && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 line-clamp-2">{task.description}</p>
                                            )}
                                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                                {task.dueDate && (
                                                    <span className={`flex items-center gap-1 ${new Date(task.dueDate) < new Date() && task.status !== TaskStatus.DONE ? 'text-red-500' : ''}`}>
                                                        <CalendarIcon size={12} />
                                                        {new Date(task.dueDate).toLocaleDateString()}
                                                    </span>
                                                )}
                                                <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-white ${category?.color || 'bg-gray-400'}`}>
                                                    <Tag size={10} />
                                                    {task.category}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleTTS(task)} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Read Aloud">
                                                <Volume2 size={18} />
                                            </button>
                                            <button onClick={() => handleDuplicate(task)} className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Duplicate">
                                                <Copy size={18} />
                                            </button>
                                            <button 
                                                onClick={() => openTaskModal(task)}
                                                className="p-2 text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                            <button onClick={() => handleDeleteTask(task.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Delete">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )})
                        )}
                    </div>
                </div>
            )}
        </div>

        {/* Add/Edit Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {editingTask ? 'Edit Task' : 'Create Task'}
                        </h2>
                        <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
                            <input 
                                autoFocus
                                type="text" 
                                value={formTitle} 
                                onChange={(e) => setFormTitle(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="What needs to be done?"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                            <textarea 
                                value={formDesc} 
                                onChange={(e) => setFormDesc(e.target.value)}
                                rows={3}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                                placeholder="Add details..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Due Date</label>
                                <input 
                                    type="date" 
                                    value={formDueDate}
                                    onChange={(e) => setFormDueDate(e.target.value)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Priority</label>
                                <select 
                                    value={formPriority}
                                    onChange={(e) => setFormPriority(e.target.value as Priority)}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none"
                                >
                                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                             <div className="flex gap-2">
                                <select 
                                    value={formCategory}
                                    onChange={(e) => setFormCategory(e.target.value)}
                                    className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none"
                                >
                                    {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                                <button 
                                    onClick={() => setIsCategoryModalOpen(true)}
                                    className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 transition-colors"
                                    title="Add New Category"
                                >
                                    <Plus size={20} />
                                </button>
                             </div>
                         </div>
                    </div>
                    <div className="p-6 pt-2 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => {
                                if (!formTitle.trim()) return;
                                if (editingTask) {
                                    handleUpdateTask({
                                        ...editingTask,
                                        title: formTitle,
                                        description: formDesc,
                                        priority: formPriority,
                                        category: formCategory,
                                        dueDate: formDueDate ? new Date(formDueDate).toISOString() : undefined
                                    });
                                } else {
                                    handleAddTask({
                                        title: formTitle,
                                        description: formDesc,
                                        priority: formPriority,
                                        category: formCategory,
                                        dueDate: formDueDate ? new Date(formDueDate).toISOString() : undefined
                                    });
                                }
                                setIsModalOpen(false);
                            }}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-500/30"
                        >
                            {editingTask ? 'Save Changes' : 'Create Task'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Category Creation Modal */}
        {isCategoryModalOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                         <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">New Category</h3>
                         <button onClick={() => setIsCategoryModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                             <X size={20} />
                         </button>
                    </div>
                    <div className="p-5 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                            <input 
                                autoFocus
                                type="text" 
                                value={newCategoryName} 
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="e.g. Fitness"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Color</label>
                            <div className="grid grid-cols-5 gap-3">
                                {COLOR_OPTIONS.map((color) => (
                                    <button
                                        key={color.name}
                                        onClick={() => setNewCategoryColor(color.value)}
                                        className={`w-8 h-8 rounded-full ${color.value} flex items-center justify-center transition-transform hover:scale-110 ring-2 ${newCategoryColor === color.value ? 'ring-offset-2 ring-indigo-500 dark:ring-offset-gray-800' : 'ring-transparent'}`}
                                        title={color.name}
                                    >
                                        {newCategoryColor === color.value && <Check size={14} className="text-white" />}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="p-5 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-2">
                        <button 
                             onClick={() => setIsCategoryModalOpen(false)}
                             className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                             onClick={handleAddCategory}
                             disabled={!newCategoryName.trim()}
                             className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                        >
                            Add Category
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Reminder Modal */}
        {showReminderModal && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform scale-100 transition-transform">
                    <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2 font-semibold text-lg">
                            <Bell className="w-5 h-5 animate-pulse" />
                            Daily Reminder
                        </div>
                        <button onClick={() => setShowReminderModal(false)} className="text-white/80 hover:text-white">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-5">
                        <p className="text-gray-600 dark:text-gray-300 mb-4 font-medium">
                            You have {upcomingTasks.length} {upcomingTasks.length === 1 ? 'task' : 'tasks'} due tomorrow!
                        </p>
                        <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                            {upcomingTasks.map(task => (
                                <div key={task.id} className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                    <Clock size={16} className="text-indigo-500 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{task.title}</p>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                            <Tag size={10} /> {task.category}
                                        </span>
                                    </div>
                                    <PriorityBadge p={task.priority} />
                                </div>
                            ))}
                        </div>
                        <button 
                            onClick={() => setShowReminderModal(false)}
                            className="w-full mt-5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-xl font-medium transition-colors"
                        >
                            Got it, thanks!
                        </button>
                    </div>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}

export default App;