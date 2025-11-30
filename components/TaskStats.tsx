import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Task, TaskStatus } from '../types';

interface TaskStatsProps {
  tasks: Task[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export const TaskStats: React.FC<TaskStatsProps> = ({ tasks }) => {
  // Data for Pie Chart (Status)
  const statusData = [
    { name: 'Todo', value: tasks.filter(t => t.status === TaskStatus.TODO).length },
    { name: 'In Progress', value: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length },
    { name: 'Done', value: tasks.filter(t => t.status === TaskStatus.DONE).length },
  ].filter(d => d.value > 0);

  // Data for Bar Chart (Tasks by Priority)
  const priorityData = [
    { name: 'Low', count: tasks.filter(t => t.priority === 'Low').length },
    { name: 'Med', count: tasks.filter(t => t.priority === 'Medium').length },
    { name: 'High', count: tasks.filter(t => t.priority === 'High').length },
    { name: 'Urg', count: tasks.filter(t => t.priority === 'Urgent').length },
  ];

  if (tasks.length === 0) {
    return <div className="p-8 text-center text-gray-500">No tasks data available yet.</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Task Status</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-4 mt-2">
           {statusData.map((entry, index) => (
             <div key={entry.name} className="flex items-center text-xs text-gray-600 dark:text-gray-400">
               <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length]}}></span>
               {entry.name} ({entry.value})
             </div>
           ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-100">Workload by Priority</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={priorityData}>
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#9ca3af" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip 
                 cursor={{fill: 'transparent'}}
                 contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
              />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};