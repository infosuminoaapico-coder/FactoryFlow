import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Briefcase,
  Clock,
  LayoutGrid,
  List as ListIcon
} from 'lucide-react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays, 
  eachDayOfInterval,
  isWithinInterval,
  parseISO
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { Project } from '../types';

export default function ProjectCalendar() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setProjects(data.filter((p: Project) => p && p.start_date && p.end_date));
        } else {
          setProjects([]);
        }
      })
      .catch(err => {
        console.error('Calendar fetch failed:', err);
        setProjects([]);
      })
      .finally(() => setLoading(false));
  }, []);

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter w-48">
            {format(currentMonth, 'MMMM yyyy')}
          </h2>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            <button 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-white rounded shadow-sm transition-all text-admin-gray hover:text-admin-blue"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1 text-[10px] font-black uppercase hover:bg-white rounded transition-all text-admin-gray hover:text-admin-blue"
            >
              Today
            </button>
            <button 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1.5 hover:bg-white rounded shadow-sm transition-all text-admin-gray hover:text-admin-blue"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
          <button 
            onClick={() => setViewMode('month')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all ${
              viewMode === 'month' ? 'bg-white text-admin-blue shadow-sm' : 'text-gray-400'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Month
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-[10px] font-black uppercase transition-all ${
              viewMode === 'list' ? 'bg-white text-admin-blue shadow-sm' : 'text-gray-400'
            }`}
          >
            <ListIcon className="w-3.5 h-3.5" /> List
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50/50">
        {days.map((day, idx) => (
          <div key={idx} className="py-2 text-center text-[10px] font-black text-admin-gray uppercase tracking-widest border-r border-gray-100 last:border-0">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const projectInDay = projects.filter(p => {
          try {
            if (!p.start_date || !p.end_date) return false;
            return isWithinInterval(cloneDay, {
              start: parseISO(p.start_date),
              end: parseISO(p.end_date)
            });
          } catch (e) {
            return false;
          }
        });

        days.push(
          <div
            key={day.toString()}
            className={`min-h-[120px] bg-white border-r border-b border-gray-100 p-2 relative group overflow-hidden ${
              !isSameMonth(day, monthStart) ? 'bg-gray-50/50 grayscale opacity-40' : ''
            }`}
          >
            <span className={`text-[11px] font-black ${isSameDay(day, new Date()) ? 'bg-admin-blue text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-gray-400'}`}>
              {format(day, 'd')}
            </span>
            
            <div className="mt-2 space-y-1">
              {projectInDay.map((p, idx) => (
                <div 
                  key={idx}
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold truncate transition-all cursor-default ${
                    p.status === 'completed' 
                      ? 'bg-admin-success/10 text-admin-success border-l-2 border-admin-success' 
                      : 'bg-admin-blue/10 text-admin-blue border-l-2 border-admin-blue'
                  } hover:scale-[1.02]`}
                  title={`${p.name} (${p.customer})`}
                >
                  {p.name}
                </div>
              ))}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="bg-white">{rows}</div>;
  };

  const renderList = () => {
    const sortedProjects = [...projects]
      .filter(p => {
        try {
          return p.start_date && !isNaN(parseISO(p.start_date).getTime());
        } catch (e) { return false; }
      })
      .sort((a, b) => 
        parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime()
      );

    return (
      <div className="p-6 space-y-4 max-w-4xl mx-auto">
        {sortedProjects.map(p => (
          <div key={p.id} className="admin-card overflow-hidden group hover:shadow-xl transition-all border-none shadow-sm flex">
            <div className={`w-2 ${p.status === 'completed' ? 'bg-admin-success' : 'bg-admin-blue'}`}></div>
            <div className="p-4 flex-1 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{p.name}</h3>
                <p className="text-[10px] text-admin-gray font-bold uppercase">{p.customer}</p>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-admin-gray">
                    <Clock className="w-3 h-3" />
                    {(() => {
                      try {
                        return `${format(parseISO(p.start_date), 'dd MMM')} - ${format(parseISO(p.end_date), 'dd MMM yyyy')}`;
                      } catch (e) {
                        return 'Invalid Date';
                      }
                    })()}
                  </div>
                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                    p.status === 'completed' ? 'bg-admin-success text-white' : 'bg-admin-warning text-gray-800'
                  }`}>
                    {p.status}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] text-admin-gray font-bold uppercase mb-1">งบประมาณ</p>
                <p className="text-sm font-black text-admin-blue">฿{(p.budget || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
        ))}

        {sortedProjects.length === 0 && (
          <div className="py-20 text-center text-admin-gray">
            <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-10" />
            <p className="font-bold uppercase tracking-widest text-xs">No projects scheduled yet</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-[15px]">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {renderHeader()}
        {viewMode === 'month' ? (
          <>
            {renderDays()}
            <div className="overflow-x-auto">
              <div className="min-w-[800px]">
                {renderCells()}
              </div>
            </div>
          </>
        ) : (
          renderList()
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="admin-card p-5 border-t-admin-blue">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-admin-blue/10 text-admin-blue flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-admin-gray uppercase tracking-widest">Total Projects</p>
              <p className="text-2xl font-black text-gray-900">{projects.length}</p>
            </div>
          </div>
        </div>
        
        <div className="admin-card p-5 border-t-admin-success">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-admin-success/10 text-admin-success flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-admin-gray uppercase tracking-widest">Ongoing</p>
              <p className="text-2xl font-black text-gray-900">
                {projects.filter(p => {
                  try {
                    return isWithinInterval(new Date(), {
                      start: parseISO(p.start_date),
                      end: parseISO(p.end_date)
                    });
                  } catch(e) { return false; }
                }).length}
              </p>
            </div>
          </div>
        </div>

        <div className="admin-card p-5 border-t-admin-warning">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-admin-warning/10 text-admin-warning flex items-center justify-center">
               <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-black text-admin-gray uppercase tracking-widest">Upcoming</p>
              <p className="text-2xl font-black text-gray-900">
                {projects.filter(p => parseISO(p.start_date) > new Date()).length}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
