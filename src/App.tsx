import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Briefcase, 
  Calendar,
  QrCode, 
  FileText, 
  LogOut, 
  Menu, 
  X, 
  Bell,
  ArrowRightLeft,
  Search,
  Settings as SettingsIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User } from './types';

// Components
import Dashboard from './components/Dashboard';
import Inventory from './components/Inventory';
import Projects from './components/Projects';
import CalendarView from './components/Calendar';
import IssueForm from './components/IssueForm';
import Reports from './components/Reports';
import Workflow from './components/Workflow';
import Approvals from './components/Approvals';
import Settings from './components/Settings';
import Invoices from './components/Invoices';

import Login from './components/Login';

const Layout = ({ user, logout, children }: { user: User, logout: () => void, children: React.ReactNode }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    const fetchPending = async () => {
      try {
        const res = await fetch('/api/transactions/pending/count');
        if (res.ok) {
          const data = await res.json();
          setPendingCount(data?.count || 0);
        }
      } catch (err) {
        console.error('Pending count fetch failed:', err);
      }
    };
    fetchPending();
    const interval = setInterval(fetchPending, 30000); // Update every 30s
    return () => clearInterval(interval);
  }, [location.pathname, isAdmin]); // Also refresh on route change

  const allMenuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['admin'] },
    { name: 'สต๊อกสินค้า', path: '/stock', icon: Package, roles: ['admin', 'staff'] },
    { name: 'ใบสำคัญ (Bills)', path: '/invoices', icon: FileText, roles: ['admin'] },
    { name: 'อนุมัติเบิก', path: '/approvals', icon: Bell, badge: pendingCount, roles: ['admin'] },
    { name: 'โปรเจค', path: '/projects', icon: Briefcase, roles: ['admin', 'staff'] },
    { name: 'ปฏิทินงาน', path: '/calendar', icon: Calendar, roles: ['admin', 'staff'] },
    { name: 'เบิกของ', path: '/issue', icon: ArrowRightLeft, roles: ['admin', 'staff'] },
    { name: 'รายงาน', path: '/reports', icon: FileText, roles: ['admin'] },
    { name: 'ตั้งค่า', path: '/settings', icon: SettingsIcon, roles: ['admin'] },
  ];

  const menuItems = allMenuItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="flex h-screen overflow-hidden bg-bg-light">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex flex-col w-[220px] bg-admin-dark text-[#c2c7d0] shadow-md z-10">
        <div className="p-[15px] flex items-center gap-2 border-b border-[#4b545c] text-white">
          <span className="text-2xl">🪵</span>
          <span className="font-bold text-sm uppercase tracking-wide">WoodCraft IMS</span>
        </div>
        
        <div className="flex-1 overflow-y-auto mt-2">
          <nav className="space-y-0">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center justify-between px-[15px] py-[10px] text-sm transition-all duration-200 ${
                    isActive 
                      ? 'bg-white/10 text-white border-l-3 border-admin-blue' 
                      : 'hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="bg-admin-danger text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[#4b545c]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-admin-gray uppercase tracking-tighter">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="flex items-center gap-2 w-full text-xs text-admin-gray hover:text-white transition-colors py-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Nav (Mobile & Desktop Header) */}
        <header className="bg-white border-b border-gray-200 h-[50px] flex items-center justify-between px-4 sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-3">
             <button className="md:hidden text-gray-500">
               <Menu className="w-5 h-5" />
             </button>
             <h1 className="text-sm font-semibold text-gray-700 hidden md:block">
               {menuItems.find(i => i.path === location.pathname)?.name || 'Dashboard'}
             </h1>
          </div>
          <div className="flex items-center gap-4">
            <button className="text-gray-400 hover:text-admin-blue transition-colors">
              <Bell className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-gray-200"></div>
            <span className="text-[12px] font-semibold text-gray-600 hidden sm:inline">WoodCraft Factory</span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-[15px] pb-24 md:pb-[15px]">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 h-[60px] flex justify-around items-center px-4 z-30 shadow-[0_-1px_3px_rgba(0,0,0,0.1)]">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const badge = item.badge || 0;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`bottom-nav-item flex flex-col items-center relative ${isActive ? 'active' : ''}`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-admin-blue' : 'text-admin-gray'}`} />
                  {badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-admin-danger text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white">
                      {badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px]">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};


export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('woodcraft_user');
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (userData: User) => {
    localStorage.setItem('woodcraft_user', JSON.stringify(userData));
    setUser(userData);
  };

  const handleLogout = () => {
    localStorage.removeItem('woodcraft_user');
    setUser(null);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const isAdmin = user.role === 'admin';

  return (
    <BrowserRouter>
      <Layout user={user} logout={handleLogout}>
        <Routes>
          {isAdmin ? (
            <>
              <Route path="/" element={<Dashboard />} />
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/settings" element={<Settings />} />
            </>
          ) : (
            <Route path="/" element={<Navigate to="/issue" replace />} />
          )}
          <Route path="/stock" element={<Inventory user={user} />} />
          <Route path="/projects" element={<Projects user={user} />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/issue" element={<IssueForm user={user} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
