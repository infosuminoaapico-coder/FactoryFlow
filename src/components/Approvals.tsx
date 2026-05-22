import React, { useState, useEffect } from 'react';
import { Check, X, Clock, Package, User, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Approvals() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTransactions = () => {
    fetch('/api/transactions')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setTransactions(data.filter((t: any) => t && t.type === 'ISSUE'));
        } else {
          setTransactions([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Approvals fetch failed:', err);
        setTransactions([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const pending = transactions.filter(t => t.status === 'PENDING');
  const approvedCount = transactions.filter(t => t.status === 'APPROVED').length;
  const rejectedCount = transactions.filter(t => t.status === 'REJECTED').length;

  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`/api/transactions/${id}/approve`, { method: 'POST' });
      if (res.ok) fetchTransactions();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReject = async (id: number) => {
    if (!confirm('ยืนยันการปฏิเสธคำขอนี้?')) return;
    try {
      const res = await fetch(`/api/transactions/${id}/reject`, { method: 'POST' });
      if (res.ok) fetchTransactions();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div className="p-8 text-center text-admin-gray font-black uppercase tracking-tighter animate-pulse">Loading Approvals...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Product Approvals</h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">จัดการคำขอเบิกวัสดุอุปกรณ์</p>
        </div>
        
        <div className="flex gap-2">
          <div className="bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
            <p className="text-[8px] font-black uppercase text-gray-400 mb-1">รอดำเนินการ</p>
            <p className="text-sm font-black text-admin-warning">{pending.length}</p>
          </div>
          <div className="bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
            <p className="text-[8px] font-black uppercase text-gray-400 mb-1">อนุมัติแล้ว</p>
            <p className="text-sm font-black text-admin-success">{approvedCount}</p>
          </div>
          <div className="bg-white px-3 py-2 rounded-lg border border-gray-100 shadow-sm">
            <p className="text-[8px] font-black uppercase text-gray-400 mb-1">ปฏิเสธแล้ว</p>
            <p className="text-sm font-black text-admin-danger">{rejectedCount}</p>
          </div>
        </div>
      </div>

      {pending.length === 0 ? (
        <div className="admin-card p-12 text-center">
            <Check className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">ไม่มีคำขอรออนุมัติในขณะนี้</p>
        </div>
      ) : (
        <div className="grid gap-4">
          <AnimatePresence>
            {pending.map((t) => (
              <motion.div 
                key={t.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100 }}
                className="admin-card p-0 overflow-hidden border-l-4 border-l-admin-warning"
              >
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-gray-100">
                  <div className="p-4 md:w-1/4 bg-gray-50/50">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Hash className="w-3 h-3" /> REQ-{t.id}
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="bg-admin-blue/10 p-2 rounded-lg text-admin-blue">
                        <Package className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-black text-gray-800 text-sm">{t.product_name}</p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                          {t.selected_unit ? (
                            <span className="text-admin-blue">{t.selected_qty} {t.selected_unit}</span>
                          ) : (
                            <span>{t.qty} {t.unit}</span>
                          )}
                          {t.selected_unit && t.selected_unit !== t.unit && (
                            <span className="ml-1 text-[8px] text-gray-300 italic">
                              ({t.qty} {t.unit})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 flex-1">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">โปรเจ็ค</label>
                        <p className="text-xs font-bold text-gray-700">{t.project_name || '-'}</p>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-gray-400 block mb-1">ผู้เบิก</label>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-400" />
                          <p className="text-xs font-bold text-gray-700">{t.requester_name || t.user_name}</p>
                        </div>
                      </div>
                    </div>
                    {t.note && (
                      <div className="mt-3 bg-gray-50 p-2 rounded border border-gray-100">
                        <p className="text-[10px] text-gray-500 italic">{t.note}</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-gray-50/30 flex items-center justify-center gap-3 md:w-48">
                    <button 
                      onClick={() => handleReject(t.id)}
                      className="flex-1 md:flex-none p-2 bg-white border border-gray-200 text-admin-danger rounded-lg hover:bg-admin-danger/5 transition-all group"
                    >
                      <X className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                    <button 
                      onClick={() => handleApprove(t.id)}
                      className="flex-[2] md:flex-none px-4 py-2 bg-admin-blue text-white rounded-lg font-black text-[10px] uppercase shadow-lg shadow-admin-blue/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" /> อนุมัติเบิก
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
