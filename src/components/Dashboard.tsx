import React, { useState, useEffect } from 'react';
import { 
  Package, 
  AlertTriangle, 
  TrendingUp,
  Briefcase as BriefcaseIcon,
  ChevronRight,
  Bell
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsRes, lowStockRes] = await Promise.all([
          fetch('/api/dashboard'),
          fetch('/api/products/low-stock')
        ]);
        
        const statsData = statsRes.ok ? await statsRes.json() : { costsByProject: [] };
        const lowStockData = lowStockRes.ok ? await lowStockRes.json() : [];
        
        setStats(statsData || { costsByProject: [] });
        setLowStock(Array.isArray(lowStockData) ? lowStockData : []);
        setPendingCount(statsData?.pendingCount || 0);
      } catch (err) {
        console.error('Dashboard fetch failed:', err);
        setStats({ costsByProject: [] });
        setLowStock([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="space-y-[15px]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-800 tracking-tight"> WoodCraft Overview</h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-0.5">Industrial Control Center</p>
        </div>
        <div className="flex items-center gap-3">
           <Link to="/approvals" className="relative group p-2 bg-white border border-gray-100 shadow-sm rounded-lg hover:bg-gray-50 transition-all">
             <Bell className="w-4 h-4 text-gray-400 group-hover:text-admin-blue" />
             {pendingCount > 0 && (
               <span className="absolute -top-1 -right-1 w-4 h-4 bg-admin-danger text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
                 {pendingCount}
               </span>
             )}
           </Link>
           <div className="text-[12px] text-admin-gray uppercase font-bold tracking-widest">Live Performance</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[15px]">
        {[
          { label: 'โครงการทั้งหมด', value: `${stats?.projectCount || 0}`, icon: BriefcaseIcon, color: '#17a2b8' },
          { label: 'มูลค่าสต๊อกสินค้า', value: `฿${(stats?.stockValue || 0).toLocaleString()}`, icon: Package, color: '#2b2a2a' },
          { label: 'สต๊อกที่ต้องสั่งเพิ่ม', value: `${stats?.alertCount || 0} รายการ`, icon: AlertTriangle, color: '#dc3545' },
          { label: 'ต้นทุนเบิกจ่ายรวม', value: `฿${(stats?.totalSpent || 0).toLocaleString()}`, icon: TrendingUp, color: '#007bff' },
        ].map((item, idx) => (
          <div key={idx} className="info-box border border-gray-100 shadow-sm shadow-black/5">
            <div className="info-box-icon" style={{ backgroundColor: item.color }}>
              <item.icon className="w-6 h-6" />
            </div>
            <div className="info-box-content">
              <span className="info-box-text text-[10px] font-black uppercase tracking-wider text-gray-500">{item.label}</span>
              <span className="info-box-number text-lg font-black text-gray-800">{item.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[15px]">
        {[
          { label: 'จำนวนรายการที่เบิก', value: `${stats?.issuedCount || 0}`, sub: 'รายการทั้งหมด', color: 'border-l-admin-blue' },
          { label: 'อนุมัติแล้ว', value: `${stats?.approvedCount || 0}`, sub: 'รายการที่เสร็จสิ้น', color: 'border-l-admin-success' },
          { label: 'ยกเลิก/ปฏิเสธ', value: `${stats?.rejectedCount || 0}`, sub: 'ไม่ผ่านการอนุมัติ', color: 'border-l-admin-danger' },
        ].map((item, idx) => (
          <div key={idx} className={`bg-white p-4 rounded-xl border border-gray-100 border-l-4 ${item.color} shadow-sm`}>
            <p className="text-[9px] font-black uppercase text-gray-400 tracking-widest">{item.label}</p>
            <div className="flex items-end justify-between mt-1">
              <p className="text-xl font-black text-gray-800 leading-none">{item.value}</p>
              <span className="text-[9px] text-gray-400 font-bold italic">{item.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-[15px]">
        {/* Cost by Project */}
        <div className="lg:col-span-2 admin-card border-t-admin-blue">
          <div className="card-header border-b border-gray-100 flex justify-between items-center py-2 px-3">
            <span className="text-sm font-bold uppercase tracking-tight">ต้นทุนแยกตามโครงการ (Actual Cost)</span>
            <Link to="/issue" className="text-admin-blue px-2 py-1 rounded text-[11px] font-black uppercase hover:underline flex items-center gap-1">
              + บันทึกรายการใหม่ <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-3 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
               <thead>
                <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="p-3 border-b border-gray-100 text-left">ชื่อโปรเจค / ลูกค้า</th>
                  <th className="p-3 border-b border-gray-100 text-right">จำนวนเบิก</th>
                  <th className="p-3 border-b border-gray-100 text-right">ใช้จริง (Real-cost)</th>
                  <th className="p-3 border-b border-gray-100 text-left">ความคืบหน้า</th>
                  <th className="p-3 border-b border-gray-100 text-center">สถานะ</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-bold">
                {(!stats?.costsByProject || stats.costsByProject.length === 0) ? (
                  <tr><td colSpan={5} className="p-8 text-center text-gray-400 italic">No project stats available</td></tr>
                ) : stats.costsByProject.map((p: any, idx: number) => {
                  const isOver = (p.total_cost || 0) > (p.budget || 0);
                  const totalInclPending = (p.total_cost || 0) + (p.pending_cost || 0);
                  const budgetProgress = (p.budget || 0) > 0 ? (totalInclPending / p.budget) * 100 : 0;
                  
                  return (
                    <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="p-3">
                         <div className="text-gray-800 uppercase tracking-tight">{p.name || 'Unknown Project'}</div>
                         <div className="text-[9px] text-gray-400 font-bold tracking-tighter">BUDGET: ฿{(p.budget || 0).toLocaleString()}</div>
                      </td>
                      <td className="p-3 text-right text-gray-500">{(p.issue_count || 0)} ครั้ง</td>
                      <td className="p-3 text-right">
                        <div className={`font-black ${isOver ? 'text-admin-danger' : 'text-admin-blue'}`}>฿{(p.total_cost || 0).toLocaleString()}</div>
                        {(p.pending_cost || 0) > 0 && (
                          <div className="text-[9px] text-admin-warning italic">Pending: ฿{p.pending_cost.toLocaleString()}</div>
                        )}
                      </td>
                      <td className="p-3">
                         <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden mb-1">
                            <div 
                              className={`h-full ${budgetProgress > 90 ? 'bg-admin-danger' : 'bg-admin-blue'}`}
                              style={{ width: `${Math.min(budgetProgress, 100)}%` }}
                            ></div>
                         </div>
                         <div className="text-[8px] text-gray-400 text-right">{budgetProgress.toFixed(0)}%</div>
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${isOver ? 'bg-admin-danger text-white' : 'bg-admin-success text-white'}`}>
                          {isOver ? 'OVER BUDGET' : 'ON BUDGET'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Column: Inventory Alerts & LINE */}
        <div className="space-y-[15px]">
          <div className="admin-card border-t-admin-danger">
             <div className="card-header py-2 px-3 border-b border-gray-100 text-xs font-black uppercase text-gray-800">⚠️ สต๊อกใกล้หมด (CRITICAL ALERTS)</div>
             <div className="p-0 text-xs">
                {lowStock.length === 0 ? (
                  <div className="p-8 text-center text-gray-300 italic font-bold uppercase tracking-widest">
                    All clear! Stocks are healthy.
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {lowStock.map((prod, idx) => (
                      <div key={prod.id} className="p-3 flex justify-between items-center hover:bg-gray-50 transition-colors">
                        <div>
                           <div className="font-bold text-gray-800 uppercase leading-none mb-1">{prod.name}</div>
                           <div className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Category: {prod.category}</div>
                        </div>
                        <div className="text-right">
                           <div className="text-rose-600 font-black text-sm">{prod.stock_qty} {prod.unit}</div>
                           <div className="text-[9px] text-admin-danger/50 font-black uppercase tracking-tighter">Threshold: {prod.min_alert}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="m-3 bg-admin-blue/5 border border-admin-blue/10 rounded p-3 text-[10px]">
                   <div className="text-admin-blue font-black uppercase mb-1.5 flex items-center gap-1.5">
                     <span className="text-xs leading-none">💬</span> LINE NOTIFY INTEGRATION
                   </div>
                   <div className="space-y-1.5 text-gray-500 font-bold uppercase italic tracking-tighter leading-tight">
                     ระบบเชื่อมต่อสมบูรณ์: หัวหน้างานจะได้รับการแจ้งเตือนทันทีที่มีการเบิกจ่ายสินค้าที่ราคาต่อหน่วยสูงกว่าเกณฑ์
                   </div>
                </div>
             </div>
          </div>

          <div className="admin-card p-4 bg-gray-900 border-none text-white overflow-hidden relative group">
             <div className="relative z-10">
                <h4 className="text-[10px] font-black uppercase text-admin-blue mb-1">Quick Action Audit</h4>
                <p className="text-xs font-bold leading-relaxed opacity-80 mb-4">
                  ดาวน์โหลดรายงานสรุปการใช้วัสดุประจำเดือนนี้เพื่อตรวจสอบความผิดปกติ
                </p>
                <Link to="/reports" className="bg-admin-blue text-white px-4 py-1.5 rounded text-[10px] font-black uppercase tracking-wider block text-center transition-all hover:bg-blue-600 active:scale-95 shadow-lg shadow-admin-blue/30">
                  ไปหน้าประวัติรายการ
                </Link>
             </div>
             <div className="absolute right-[-10%] bottom-[-10%] opacity-10 group-hover:scale-110 transition-transform duration-500">
               <TrendingUp className="w-24 h-24 stroke-[4]" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
