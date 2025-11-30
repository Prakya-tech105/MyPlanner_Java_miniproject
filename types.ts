export enum Priority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  URGENT = 'Urgent'
}

export enum TaskStatus {
  TODO = 'Todo',
  IN_PROGRESS = 'In Progress',
  DONE = 'Done'
}

export enum Recurrence {
  NONE = 'None',
  DAILY = 'Daily',
  WEEKLY = 'Weekly',
  MONTHLY = 'Monthly'
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string; // ISO string
  startTime?: string; // "HH:mm"
  endTime?: string; // "HH:mm"
  priority: Priority;
  status: TaskStatus;
  category: string;
  tags: string[];
  recurrence: Recurrence;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface AppState {
  tasks: Task[];
  categories: Category[];
  darkMode: boolean;
  searchQuery: string;
  filterPriority: Priority | 'All';
  filterCategory: string | 'All';
  isRecording: boolean;
}

export type Theme = 'light' | 'dark';