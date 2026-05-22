import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Calendar, 
  Search,
  Plus,
  Clock,
  CheckCircle2,
  FileText,
  AlertOctagon,
  AlertCircle,
  X,
  Coins,
  TrendingDown,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Project, PlanItem, Product, User } from '../types';

export default function Projects({ user }: { user: User }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [summary, setSummary] = useState({ total_cost: 0, issue_count: 0 });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddPlanModal, setShowAddPlanModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);

  const isAdmin = user.role === 'admin';
  const [newProject, setNewProject] = useState({
    name: '',
    customer: '',
    start_date: '',
    end_date: '',
    budget: ''
  });
  const [newPlanItem, setNewPlanItem] = useState({
    product_id: '',
    planned_qty: ''
  });

  const fetchProjects = () => {
    fetch('/api/projects')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setProjects(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setProjects([]);
        setLoading(false);
      });
  };

  const fetchProducts = () => {
    fetch('/api/products')
      .then(res => res.ok ? res.json() : [])
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchProjects();
    fetchProducts();
  }, []);

  const loadPlan = async (project: Project) => {
    setLoading(true);
    try {
      const [planRes, summaryRes, issuesRes] = await Promise.all([
        fetch(`/api/projects/${project.id}/plan`),
        fetch(`/api/projects/${project.id}/summary`),
        fetch(`/api/projects/${project.id}/issues`)
      ]);
      
      const planData = planRes.ok ? await planRes.json() : [];
      const summaryData = summaryRes.ok ? await summaryRes.json() : { total_cost: 0, issue_count: 0 };
      const issuesData = issuesRes.ok ? await issuesRes.json() : [];

      setPlan(Array.isArray(planData) ? planData : []);
      setSummary(summaryData);
      setIssues(Array.isArray(issuesData) ? issuesData : []);
      setSelectedProject(project);
    } catch (err) {
      console.error("Error loading project details", err);
      setPlan([]);
      setSummary({ total_cost: 0, issue_count: 0 });
      setIssues([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newProject,
          budget: parseFloat(newProject.budget) || 0
        })
      });
      if (res.ok) {
        setShowAddModal(false);
        setNewProject({ name: '', customer: '', start_date: '', end_date: '', budget: '' });
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPlanItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject) return;
    try {
      const res = await fetch(`/api/projects/${selectedProject.id}/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: parseInt(newPlanItem.product_id),
          planned_qty: parseFloat(newPlanItem.planned_qty)
        })
      });
      if (res.ok) {
        setShowAddPlanModal(false);
        setNewPlanItem({ product_id: '', planned_qty: '' });
        loadPlan(selectedProject);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteProject = async (id: number) => {
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setShowDeleteConfirm(null);
        if (selectedProject?.id === id) setSelectedProject(null);
        fetchProjects();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateProjectStatus = async (id: number, newStatus: string) => {
    const project = projects.find(p => p.id === id);
    if (!project) return;

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...project,
          status: newStatus
        })
      });
      if (res.ok) {
        fetchProjects();
        if (selectedProject?.id === id) {
          setSelectedProject({ ...selectedProject, status: newStatus });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-[15px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-800">โปรเจคดำเนินงาน</h1>
          <p className="text-admin-gray text-xs">ติดตามงบประมาณและวัสดุต่อโครงการ</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-admin-blue text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm flex items-center gap-2 hover:bg-blue-600 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> เพิ่มโปรเจค
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-[15px]">
        {/* Project List */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold text-admin-gray uppercase tracking-widest px-1">รายการโครงการ</h3>
          <div className="max-h-[600px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {projects.map((project) => (
              <div 
                key={project.id}
                onClick={() => loadPlan(project)}
                className={`p-3 rounded border-t-3 transition-all cursor-pointer shadow-sm ${
                  selectedProject?.id === project.id 
                    ? 'bg-white border-admin-blue ring-1 ring-admin-blue/20' 
                    : 'bg-white border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded ${selectedProject?.id === project.id ? 'bg-admin-blue text-white' : 'bg-gray-100 text-admin-gray'}`}>
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className={`text-sm font-bold uppercase ${selectedProject?.id === project.id ? 'text-admin-blue' : 'text-gray-800'}`}>{project.name}</h4>
                      <p className="text-[10px] text-admin-gray font-semibold">ลูกค้า: {project.customer}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAdmin && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowDeleteConfirm(project.id);
                        }}
                        className="p-1 text-gray-300 hover:text-admin-danger transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <select
                      value={project.status || ''}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateProjectStatus(project.id, e.target.value)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase outline-none cursor-pointer ${
                        project.status === 'in-progress' 
                          ? 'bg-admin-warning text-gray-800'
                          : 'bg-admin-success text-white'
                      }`}
                    >
                      <option value="in-progress">ING</option>
                      <option value="completed">DONE</option>
                      <option value="pending">PEND</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center justify-between mt-3 px-1">
                  <div className="flex items-center gap-3 text-[10px] text-admin-gray font-semibold">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{project.start_date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>ถึง {project.end_date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-gray-800">
                    <Coins className="w-3 h-3 text-admin-warning" />
                    <span>{(project.budget || 0).toLocaleString()} ฿</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project Plan */}
        <div className="space-y-2">
          <h3 className="text-[11px] font-bold text-admin-gray uppercase tracking-widest px-1">
            สรุปการใช้วัสดุ {selectedProject ? `: ${selectedProject.name}` : ''}
          </h3>
          
          <AnimatePresence mode="wait">
            {selectedProject ? (
              <motion.div 
                key={selectedProject.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="admin-card border-t-admin-blue p-4"
              >
                {/* Overall Budget Progress */}
                <div className="mb-6 p-4 bg-gray-50 border border-gray-100 rounded-lg">
                   <div className="flex justify-between items-end mb-2">
                      <div>
                        <p className="text-[9px] text-admin-gray font-bold uppercase">งบประมาณโครงการ</p>
                        <p className="text-xl font-black text-gray-900">{(selectedProject.budget || 0).toLocaleString()} <span className="text-sm font-bold">฿</span></p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-admin-gray font-bold uppercase">ใช้ไปแล้ว</p>
                        <p className={`text-lg font-black ${ (summary?.total_cost || 0) > (selectedProject.budget || 0) ? 'text-admin-danger' : 'text-admin-blue'}`}>
                          {isAdmin ? `${(summary?.total_cost || 0).toLocaleString()} ฿` : '*** ฿'}
                        </p>
                      </div>
                   </div>
                   <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(((summary?.total_cost || 0) / (selectedProject.budget || 1)) * 100, 100)}%` }}
                        className={`h-full ${ (summary?.total_cost || 0) > (selectedProject.budget || 0) ? 'bg-admin-danger' : 'bg-admin-blue'}`}
                      />
                   </div>
                   <div className="flex justify-between mt-1">
                      <p className="text-[9px] font-bold text-admin-gray uppercase italic">0%</p>
                      <p className="text-[9px] font-bold text-admin-gray uppercase italic">
                        {((summary?.total_cost || 0) / (selectedProject.budget || 1) * 100).toFixed(1)}% USED
                      </p>
                   </div>
                </div>

                {plan.length > 0 ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-2">
                       <div className="bg-gray-50 border border-gray-100 p-2 rounded flex flex-col justify-center">
                          <p className="text-[9px] text-admin-gray font-bold uppercase">จำนวนครั้งที่เบิก</p>
                          <p className="text-sm font-bold text-gray-800">{summary?.issue_count || 0} ครั้ง</p>
                       </div>
                       <div className="bg-gray-50 border border-gray-100 p-2 rounded flex flex-col justify-center">
                          <p className="text-[9px] text-admin-gray font-bold uppercase">เป้าหมายวัสดุ</p>
                          <p className="text-sm font-bold text-gray-800">{plan.length} รายการ</p>
                       </div>
                    </div>

                    <div className="space-y-3">
                       <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                          <h4 className="text-[10px] font-bold text-gray-500 uppercase">รายละเอียดเป้าหมาย</h4>
                          <button 
                            onClick={() => setShowAddPlanModal(true)}
                            className="text-[9px] font-bold text-admin-blue hover:underline flex items-center gap-1"
                          >
                            <Plus className="w-2.5 h-2.5" /> เพิ่มรายการวัสดุ
                          </button>
                       </div>
                        {plan.map((item) => {
                          const used = item.used_qty || 0;
                          const progress = Math.min((used / item.planned_qty) * 100, 100);
                          const isOver = used > item.planned_qty;
                          
                          return (
                            <div key={item.id} className="space-y-1.5">
                              <div className="flex justify-between items-end">
                                <div>
                                  <p className="text-[11px] font-bold text-gray-800 uppercase leading-none">{item.product_name}</p>
                                  <p className="text-[9px] text-admin-gray font-bold uppercase">แผน: {item.planned_qty} {item.unit}</p>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {isOver && <AlertTriangle className="w-3.5 h-3.5 text-admin-danger animate-pulse" />}
                                    <p className={`text-[11px] font-bold ${isOver ? 'text-admin-danger' : 'text-admin-blue'}`}>
                                      {used} {item.unit}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="h-2 w-full bg-gray-100 rounded overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${progress}%` }}
                                  className={`h-full ${isOver ? 'bg-admin-danger' : 'bg-admin-blue'}`}
                                />
                              </div>
                              {isOver && <p className="text-[9px] text-admin-danger font-bold text-right tracking-tighter uppercase">+ เกินแผน {used - item.planned_qty} หน่วย</p>}
                            </div>
                          );
                        })}
                    </div>

                    {/* Issue History Table */}
                    <div className="pt-4 border-t border-gray-100">
                       <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[10px] font-bold text-gray-500 uppercase">ประวัติการเบิกของ (ล่าสุด)</h4>
                          <span className="text-[9px] text-admin-gray font-bold">{issues.length} รายการทั้งหมด</span>
                       </div>
                       <div className="overflow-x-auto rounded border border-gray-50">
                          <table className="w-full text-[10px] text-left">
                             <thead>
                                <tr className="bg-gray-50">
                                   <th className="p-1.5 font-bold">วันที่</th>
                                   <th className="p-1.5 font-bold">รายการ</th>
                                   <th className="p-1.5 font-bold text-right">จำนวน</th>
                                   <th className="p-1.5 font-bold text-right">สถานะ</th>
                                </tr>
                             </thead>
                             <tbody>
                                {issues.slice(0, 8).map((issue, idx) => (
                                   <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50">
                                      <td className="p-1.5 text-admin-gray">{new Date(issue.datetime).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' })}</td>
                                      <td className="p-1.5 font-semibold text-gray-700">
                                        {issue.product_name}
                                        {issue.note && <p className="text-[8px] text-gray-400 font-normal italic">{issue.note}</p>}
                                      </td>
                                      <td className="p-1.5 text-right font-bold">{issue.qty} {issue.unit}</td>
                                      <td className="p-1.5 text-right">
                                         <span className={`px-1 rounded-sm text-[8px] font-black ${
                                            issue.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                            issue.status === 'PENDING' ? 'bg-yellow-100 text-yellow-700 animate-pulse' :
                                            'bg-red-100 text-red-700'
                                         }`}>
                                            {issue.status}
                                         </span>
                                      </td>
                                   </tr>
                                ))}
                                {issues.length === 0 && (
                                   <tr>
                                      <td colSpan={4} className="p-4 text-center text-gray-300 italic">ยังไม่มีประวัติการเบิก</td>
                                   </tr>
                                )}
                             </tbody>
                          </table>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 text-center text-admin-gray text-xs">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-20" />
                    <p>ยังไม่ได้ระบุงบประมาณวัสดุ หรือโครงการยังไม่มีการเบิก</p>
                    <p className="text-[10px] mt-1 italic">ประวัติการเบิก: {issues.length} รายการ</p>
                  </div>
                )}
                
                <div className="mt-8 pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] text-admin-gray font-bold uppercase">ความคืบหน้าภาพรวม (ต้นทุน)</p>
                      <p className="text-lg font-black text-gray-900">
                        {isAdmin ? `${((summary?.total_cost || 0) / (selectedProject.budget || 1) * 100).toFixed(0)}%` : '***%'}
                      </p>
                    </div>
                    <button className="bg-admin-dark text-white px-4 py-1.5 text-[10px] font-bold rounded uppercase tracking-wider hover:bg-black transition-all">
                      Export Report
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="bg-white rounded border border-dashed border-gray-300 h-[600px] flex flex-col items-center justify-center text-admin-gray text-xs">
                <Briefcase className="w-12 h-12 mb-3 opacity-20" />
                <p className="font-bold uppercase tracking-widest text-[10px]">เลือกโปรเจคเพื่อดูข้อมูลต้นทุนและงบประมาณ</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Add Project Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-2xl w-full max-w-md overflow-hidden border border-gray-200"
            >
              <div className="bg-admin-blue p-4 flex items-center justify-between text-white">
                <h2 className="font-black uppercase tracking-tighter text-lg">เพิ่มโครงการใหม่</h2>
                <button onClick={() => setShowAddModal(false)} className="hover:rotate-90 transition-transform">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleAddProject} className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ชื่อโครงการ</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. Build-in คอนโด Noble..."
                    className="w-full bg-gray-50 border border-gray-200 p-2 rounded text-sm font-bold focus:ring-2 focus:ring-admin-blue outline-none"
                    value={newProject.name}
                    onChange={e => setNewProject({...newProject, name: e.target.value})}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ชื่อลูกค้า / สถานที่</label>
                  <input 
                    required
                    type="text" 
                    placeholder="e.g. คุณอนันต์ / สุขุมวิท 24"
                    className="w-full bg-gray-50 border border-gray-200 p-2 rounded text-sm font-bold focus:ring-2 focus:ring-admin-blue outline-none"
                    value={newProject.customer}
                    onChange={e => setNewProject({...newProject, customer: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">วันที่เริ่ม</label>
                    <input 
                      required
                      type="date" 
                      className="w-full bg-gray-50 border border-gray-200 p-2 rounded text-xs font-bold focus:ring-2 focus:ring-admin-blue outline-none"
                      value={newProject.start_date}
                      onChange={e => setNewProject({...newProject, start_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">วันที่สิ้นสุด</label>
                    <input 
                      required
                      type="date" 
                      className="w-full bg-gray-50 border border-gray-200 p-2 rounded text-xs font-bold focus:ring-2 focus:ring-admin-blue outline-none"
                      value={newProject.end_date}
                      onChange={e => setNewProject({...newProject, end_date: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">งบประมาณวัสดุ (บาท)</label>
                  <div className="relative">
                    <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-admin-warning" />
                    <input 
                      required
                      type="number" 
                      placeholder="0.00"
                      className="w-full bg-gray-50 border border-gray-200 pl-10 pr-4 py-2 rounded text-sm font-black text-gray-900 focus:ring-2 focus:ring-admin-blue outline-none"
                      value={newProject.budget}
                      onChange={e => setNewProject({...newProject, budget: e.target.value})}
                    />
                  </div>
                </div>
                <div className="pt-2">
                  <button className="w-full bg-admin-blue text-white py-3 rounded text-sm font-black uppercase tracking-widest shadow-lg shadow-admin-blue/20 hover:scale-[1.02] active:scale-95 transition-all">
                    บันทึกโครงการ
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Plan Item Modal */}
      <AnimatePresence>
        {showAddPlanModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200"
            >
              <div className="bg-admin-dark p-3 flex items-center justify-between text-white">
                <h2 className="font-black uppercase tracking-tighter text-sm italic">วางแผนวัสดุ (Project Plan)</h2>
                <button onClick={() => setShowAddPlanModal(false)} className="hover:rotate-90 transition-transform">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleAddPlanItem} className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">เลือกวัสดุ/สินค้า</label>
                  <select 
                    required
                    className="w-full bg-gray-50 border border-gray-200 p-2 rounded text-xs font-bold focus:ring-2 focus:ring-admin-blue outline-none"
                    value={newPlanItem.product_id}
                    onChange={e => setNewPlanItem({...newPlanItem, product_id: e.target.value})}
                  >
                    <option value="">-- เลือกรายการ --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">จำนวนที่วางแผน</label>
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    placeholder="0.00"
                    className="w-full bg-gray-50 border border-gray-200 p-2 rounded text-sm font-black focus:ring-2 focus:ring-admin-blue outline-none"
                    value={newPlanItem.planned_qty}
                    onChange={e => setNewPlanItem({...newPlanItem, planned_qty: e.target.value})}
                  />
                </div>
                <div className="pt-2">
                  <button className="w-full bg-admin-dark text-white py-2.5 rounded text-xs font-black uppercase tracking-widest shadow-lg hover:bg-black transition-all">
                    เพิ่มลงในแผน
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200 p-6 text-center"
            >
              <div className="w-16 h-16 bg-red-100 text-admin-danger rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-gray-900 mb-2 uppercase tracking-tighter">ยืนยันการลบโครงการ?</h3>
              <p className="text-xs text-admin-gray font-bold mb-6">
                การลบโครงการจะลบข้อมูลแผนผังวัสดุทั้งหมดที่เกี่ยวข้อง<br/>แต่จะไม่ลบประวัติการเบิกสินค้าในระบบ
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 bg-gray-100 text-admin-gray font-black text-xs rounded uppercase tracking-widest hover:bg-gray-200 transition-all"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={() => handleDeleteProject(showDeleteConfirm)}
                  className="flex-1 px-4 py-2 bg-admin-danger text-white font-black text-xs rounded uppercase tracking-widest hover:bg-red-700 transition-all shadow-lg shadow-red-200"
                >
                  ลบออก
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
