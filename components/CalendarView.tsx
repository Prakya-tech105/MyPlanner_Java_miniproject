import React, { useState } from 'react';
import { 
  ChevronLeft, ChevronRight, Plus, Clock, 
  Calendar as CalendarIcon, List, Grid3X3, Columns, Square, 
  MoreHorizontal
} from 'lucide-react';
import { Task, Priority, Category } from '../types';

interface CalendarViewProps {
  tasks: Task[];
  categories: Category[];
  onSelectDate: (date: Date) => void;
  onSelectTask: (task: Task) => void;
}

type ViewMode = 'Day' | 'Week' | 'Month' | 'Year' | 'Schedule';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const CalendarView: React.FC<CalendarViewProps> = ({ tasks, categories, onSelectDate, onSelectTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('Month');

  // --- Helpers ---

  const isSameDate = (date1: Date, date2: Date) => {
    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      // Handle naive date strings (YYYY-MM-DD) vs ISO
      const taskDate = new Date(task.dueDate);
      // Compare simply by YMD to avoid timezone offset issues with naive dates
      const tY = taskDate.getFullYear();
      const tM = taskDate.getMonth();
      const tD = taskDate.getDate();
      // If the string was just YYYY-MM-DD, the Date constructor treats it as UTC usually, 
      // but input[type="date"] values are usually parsed as local midnight or UTC midnight depending on browser.
      // We'll use the exact string match if possible for reliability, or fallback to Date objects.
      
      // Simpler check: matching ISO string date part
      const targetISO = date.toISOString().split('T')[0];
      const taskISO = task.dueDate.split('T')[0];
      return targetISO === taskISO;
    });
  };

  const getCategoryColor = (catName: string) => {
    const cat = categories.find(c => c.name === catName);
    return cat?.color || 'bg-gray-400';
  };

  const getPriorityColor = (p: Priority) => {
    switch(p) {
      case Priority.URGENT: return 'bg-red-100 text-red-800 border-red-500 dark:bg-red-900/30 dark:text-red-200';
      case Priority.HIGH: return 'bg-orange-100 text-orange-800 border-orange-500 dark:bg-orange-900/30 dark:text-orange-200';
      case Priority.MEDIUM: return 'bg-yellow-100 text-yellow-800 border-yellow-500 dark:bg-yellow-900/30 dark:text-yellow-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-500 dark:bg-blue-900/30 dark:text-blue-200';
    }
  };

  // --- Navigation ---

  const navigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    const offset = direction === 'next' ? 1 : -1;

    switch (viewMode) {
      case 'Day':
        newDate.setDate(newDate.getDate() + offset);
        break;
      case 'Week':
        newDate.setDate(newDate.getDate() + (offset * 7));
        break;
      case 'Month':
        newDate.setMonth(newDate.getMonth() + offset);
        break;
      case 'Year':
        newDate.setFullYear(newDate.getFullYear() + offset);
        break;
      case 'Schedule':
        // For schedule, maybe jump by month?
        newDate.setMonth(newDate.getMonth() + offset);
        break;
    }
    setCurrentDate(newDate);
  };

  // --- Renderers ---

  const renderTaskChip = (task: Task, showDetails = false) => {
    return (
      <div 
        key={task.id}
        onClick={(e) => {
          e.stopPropagation();
          onSelectTask(task);
        }}
        className={`
          px-2 py-1 rounded text-xs font-medium shadow-sm cursor-pointer border-l-2 transition-transform hover:scale-[1.02] flex items-center gap-1.5
          ${getPriorityColor(task.priority)}
          ${showDetails ? 'mb-2' : 'truncate'}
        `}
        title={`${task.title} (${task.category})`}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${getCategoryColor(task.category)}`}></span>
        <div className="min-w-0">
          <div className="truncate font-semibold">{task.title}</div>
          {showDetails && task.description && (
             <div className="opacity-75 truncate text-[10px]">{task.description}</div>
          )}
        </div>
      </div>
    );
  };

  // 1. DAY VIEW
  const renderDayView = () => {
    const tasksForDay = getTasksForDate(currentDate);
    const isToday = isSameDate(new Date(), currentDate);

    return (
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 p-4 overflow-y-auto">
        <div className={`
          bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 min-h-[500px]
          ${isToday ? 'ring-2 ring-indigo-500/20' : ''}
        `}>
           <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-3xl font-bold text-gray-800 dark:text-gray-100">
                  {DAYS[currentDate.getDay()]}
                </h3>
                <p className="text-lg text-gray-500 dark:text-gray-400">
                  {currentDate.getDate()} {MONTHS[currentDate.getMonth()]}
                </p>
              </div>
              <button 
                onClick={() => onSelectDate(currentDate)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                <Plus size={18} /> Add Task
              </button>
           </div>
           
           <div className="space-y-3">
             {tasksForDay.length === 0 ? (
               <div className="text-center py-20 text-gray-400 dark:text-gray-600">
                  <Clock size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No tasks scheduled for this day.</p>
               </div>
             ) : (
               tasksForDay.map(task => renderTaskChip(task, true))
             )}
           </div>
        </div>
      </div>
    );
  };

  // 2. WEEK VIEW
  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay(); // 0 (Sun) to 6 (Sat)
    // Adjust to make Sunday start index 0
    startOfWeek.setDate(currentDate.getDate() - day);

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekDays.push(d);
    }

    return (
      <div className="flex-1 grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 overflow-hidden">
        {weekDays.map((date, idx) => {
          const isToday = isSameDate(new Date(), date);
          const dayTasks = getTasksForDate(date);
          
          return (
            <div 
              key={idx} 
              className={`
                bg-white dark:bg-gray-800 flex flex-col min-h-0
                ${isToday ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''}
              `}
            >
              <div 
                className={`
                  p-3 text-center border-b border-gray-100 dark:border-gray-700 
                  ${isToday ? 'text-indigo-600 dark:text-indigo-400 font-bold' : 'text-gray-600 dark:text-gray-400'}
                `}
              >
                <div className="text-xs uppercase opacity-75">{DAYS[date.getDay()]}</div>
                <div className={`
                  mx-auto w-8 h-8 flex items-center justify-center rounded-full mt-1
                  ${isToday ? 'bg-indigo-600 text-white' : 'text-xl'}
                `}>
                  {date.getDate()}
                </div>
              </div>
              
              <div 
                className="flex-1 p-2 space-y-2 overflow-y-auto custom-scrollbar group"
                onClick={() => onSelectDate(date)}
              >
                <button className="w-full py-1 text-xs text-gray-300 hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity flex justify-center">
                   <Plus size={14} />
                </button>
                {dayTasks.map(task => renderTaskChip(task))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 3. MONTH VIEW (Refactored)
  const renderMonthView = () => {
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const cells = [];

    // Header
    const headers = DAYS.map(day => (
      <div key={day} className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
        {day}
      </div>
    ));

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} className="bg-gray-50/50 dark:bg-gray-900/50 min-h-[100px]"></div>);
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday = isSameDate(new Date(), date);
      const daysTasks = getTasksForDate(date);

      cells.push(
        <div 
          key={day} 
          onClick={() => onSelectDate(date)}
          className={`
            group min-h-[100px] p-1 sm:p-2 border-t border-r border-gray-100 dark:border-gray-700 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors cursor-pointer relative flex flex-col gap-1
            ${isToday ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : 'bg-white dark:bg-gray-800'}
          `}
        >
          <div className="flex justify-between items-start mb-1">
            <span className={`
              w-6 h-6 flex items-center justify-center rounded-full text-xs font-medium
              ${isToday 
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' 
                : 'text-gray-700 dark:text-gray-300 group-hover:bg-gray-200 dark:group-hover:bg-gray-700'}
            `}>
              {day}
            </span>
            <button className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-indigo-600 transition-all">
              <Plus size={14} />
            </button>
          </div>
          
          <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar max-h-[70px]">
            {daysTasks.map(task => renderTaskChip(task))}
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="grid grid-cols-7 flex-shrink-0">{headers}</div>
        <div className="grid grid-cols-7 auto-rows-fr overflow-y-auto flex-1 bg-gray-200 dark:bg-gray-700 gap-px border-l border-b border-gray-200 dark:border-gray-700">
          {cells}
        </div>
      </div>
    );
  };

  // 4. YEAR VIEW
  const renderYearView = () => {
    const year = currentDate.getFullYear();
    
    return (
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {MONTHS.map((monthName, monthIndex) => {
            const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
            const firstDay = new Date(year, monthIndex, 1).getDay(); // 0-6
            
            // Generate simple mini grid
            const miniCells = [];
            // Padding
            for(let i=0; i<firstDay; i++) {
               miniCells.push(<div key={`pad-${i}`} />);
            }
            // Days
            for(let d=1; d<=daysInMonth; d++) {
               const date = new Date(year, monthIndex, d);
               const hasTasks = getTasksForDate(date).length > 0;
               const isToday = isSameDate(new Date(), date);
               
               miniCells.push(
                 <div 
                    key={d} 
                    onClick={() => {
                        setCurrentDate(date);
                        setViewMode('Day');
                    }}
                    className={`
                      h-6 flex items-center justify-center text-[10px] rounded-full cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600 relative
                      ${isToday ? 'bg-indigo-600 text-white font-bold' : 'text-gray-600 dark:text-gray-400'}
                    `}
                 >
                   {d}
                   {hasTasks && !isToday && (
                     <div className="absolute bottom-0.5 w-1 h-1 bg-indigo-500 rounded-full"></div>
                   )}
                 </div>
               );
            }

            return (
              <div key={monthName} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                <h4 className="font-bold text-gray-800 dark:text-gray-200 mb-2 text-center">{monthName}</h4>
                <div className="grid grid-cols-7 gap-1 text-center">
                   {['S','M','T','W','T','F','S'].map(d => (
                     <span key={d} className="text-[10px] text-gray-400 font-medium">{d}</span>
                   ))}
                   {miniCells}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 5. SCHEDULE VIEW
  const renderScheduleView = () => {
    // Get all dates with tasks from now onwards
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Sort tasks by date
    const sortedTasks = [...tasks]
        .filter(t => t.dueDate)
        .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
    
    // Group by date
    const grouped: { [key: string]: Task[] } = {};
    sortedTasks.forEach(t => {
        if (!t.dueDate) return;
        const key = t.dueDate.split('T')[0];
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(t);
    });

    const dates = Object.keys(grouped);

    return (
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 custom-scrollbar">
         <div className="max-w-2xl mx-auto space-y-6">
            {dates.length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    <List size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No upcoming scheduled tasks.</p>
                </div>
            ) : (
                dates.map(dateStr => {
                    const date = new Date(dateStr);
                    // Hack to fix timezone offset for display if needed, but dateStr is YYYY-MM-DD
                    // Let's create a date object that respects the string exactly
                    const [y, m, d] = dateStr.split('-').map(Number);
                    const displayDate = new Date(y, m-1, d); 
                    const isPast = displayDate < today;

                    return (
                        <div key={dateStr} className={`relative pl-8 ${isPast ? 'opacity-60' : ''}`}>
                            {/* Timeline Line */}
                            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>
                            <div className="absolute left-[5px] top-4 w-4 h-4 rounded-full border-4 border-white dark:border-gray-900 bg-indigo-500"></div>
                            
                            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
                                <h4 className="font-bold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
                                    {displayDate.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                    {isSameDate(displayDate, new Date()) && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Today</span>}
                                </h4>
                                <div className="space-y-2">
                                    {grouped[dateStr].map(task => renderTaskChip(task, true))}
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
         </div>
      </div>
    );
  };

  // --- Main Render ---

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 gap-4">
        
        {/* Date Title & Nav */}
        <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-start">
            <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
            <Clock className="text-indigo-500 hidden md:block" />
            <span className="truncate">
                {viewMode === 'Year' ? currentDate.getFullYear() : 
                 viewMode === 'Day' ? currentDate.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric'}) :
                 `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`}
            </span>
            </h2>
            <div className="flex gap-1">
                <button onClick={() => navigate('prev')} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><ChevronLeft size={20} /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 text-sm font-medium bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50">Today</button>
                <button onClick={() => navigate('next')} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"><ChevronRight size={20} /></button>
            </div>
        </div>

        {/* View Switcher */}
        <div className="flex p-1 bg-gray-100 dark:bg-gray-700/50 rounded-lg overflow-x-auto max-w-full">
            {[
                { id: 'Day', icon: Square, label: 'Day' },
                { id: 'Week', icon: Columns, label: 'Week' },
                { id: 'Month', icon: Grid3X3, label: 'Month' },
                { id: 'Year', icon: CalendarIcon, label: 'Year' },
                { id: 'Schedule', icon: List, label: 'Schedule' },
            ].map(view => (
                <button
                    key={view.id}
                    onClick={() => setViewMode(view.id as ViewMode)}
                    className={`
                        flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap
                        ${viewMode === view.id 
                            ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}
                    `}
                >
                    <view.icon size={16} />
                    <span className="hidden sm:inline">{view.label}</span>
                </button>
            ))}
        </div>
      </div>

      {/* Content Area */}
      {viewMode === 'Day' && renderDayView()}
      {viewMode === 'Week' && renderWeekView()}
      {viewMode === 'Month' && renderMonthView()}
      {viewMode === 'Year' && renderYearView()}
      {viewMode === 'Schedule' && renderScheduleView()}
    </div>
  );
};