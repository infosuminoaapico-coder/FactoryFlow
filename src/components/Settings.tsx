import React, { useState } from 'react';
import { Send, Settings as SettingsIcon, CheckCircle, AlertCircle, Loader2, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean, message: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const [botInfo, setBotInfo] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [testId, setTestId] = useState('');

  const verifyToken = async () => {
    setVerifying(true);
    setResult(null);
    try {
      const res = await fetch('/api/line-bot-info');
      const data = await res.json();
      if (res.ok) {
        setBotInfo(data);
        setResult({ success: true, message: `เชื่อมต่อสำเร็จ: Bot "${data.displayName}" พร้อมใช้งาน` });
      } else {
        const errorMsg = data.message || `Error ${res.status}`;
        const details = data.hasWhitespace ? ' (ตรวจพบช่องว่างใน Token โปรดลบพื้นที่ว่างในไฟล์ .env)' : '';
        setResult({ 
          success: false, 
          message: `Token ไม่ถูกต้อง (${res.status}): ${errorMsg}${details} โปรดตรวจสอบ Channel Access Token อีกครั้ง` 
        });
        setBotInfo(null);
      }
    } catch (err: any) {
      setResult({ success: false, message: 'ไม่สามารถตรวจสอบ Token ได้ (API Error): ' + err.message });
    } finally {
      setVerifying(false);
    }
  };

  const testLineNotify = async () => {
    setLoading(true);
    setResult(null);
    setShowConfirm(false);
    try {
      const res = await fetch('/api/test-line', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: '🔔 [ woodcraft-test ] การเชื่อมต่อระบบแจ้งเตือน LINE สำเร็จ',
          groupId: testId 
        })
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ success: true, message: 'ส่งข้อความทดสอบสำเร็จ! โปรดตรวจสอบใน LINE Group' });
      } else {
        let helpText = '';
        if (data.message === 'Failed to send messages') {
          helpText = ' (สาเหตุที่เป็นไปได้: Bot ไม่ได้อยู่ในกลุ่ม หรือ Group ID ไม่ถูกต้อง)';
        }
        setResult({ success: false, message: `การส่งผิดพลาด: ${data.message}${helpText}` });
      }
    } catch (err: any) {
      setResult({ success: false, message: 'ไม่สามารถติดต่อเซิร์ฟเวอร์ได้: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="bg-admin-dark p-2 rounded-lg text-white">
          <SettingsIcon className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Settings & Configuration</h1>
          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-1">ตั้งค่าระบบและการเชื่อมต่อ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LINE Notification Card */}
        <div className="admin-card overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-800 flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-admin-green" /> LINE Messaging API
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-admin-green/10 text-admin-green text-[9px] font-black uppercase">Connected</span>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-xs text-gray-500 leading-relaxed font-medium">
              ระบบใช้ LINE Messaging API ในการส่งข้อความแจ้งเตือน Flex Message ไปยังกลุ่มเมื่อมีการเบิก หรืออนุมัติสินค้า
            </p>
            
            <div className="bg-admin-blue/5 border border-admin-blue/10 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Send className="w-4 h-4 text-admin-blue mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-black uppercase text-admin-blue mb-1">สถานะและการทดสอบ</p>
                  
                  <div className="flex gap-2 mb-4">
                    <button 
                      disabled={verifying}
                      onClick={verifyToken}
                      className="flex-1 bg-white border border-gray-200 text-gray-700 py-1.5 rounded text-[10px] font-bold uppercase hover:bg-gray-50 transition-all flex items-center justify-center gap-1.5"
                    >
                      {verifying ? <Loader2 className="w-3 h-3 animate-spin" /> : <SettingsIcon className="w-3 h-3" />}
                      ตรวจสอบ Token
                    </button>
                  </div>

                  {botInfo && (
                    <div className="mb-4 p-3 bg-white border border-gray-100 rounded flex items-center gap-3">
                      {botInfo.pictureUrl ? (
                        <img src={botInfo.pictureUrl} alt="Bot" className="w-8 h-8 rounded-full border border-gray-100" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-400">Bot</div>
                      )}
                      <div>
                        <p className="text-[11px] font-bold text-gray-700">{botInfo.displayName}</p>
                        <p className="text-[9px] text-gray-400 font-medium">Channel ID: {botInfo.userId}</p>
                      </div>
                    </div>
                  )}

                  <div className="mb-4">
                    <label className="text-[9px] font-bold text-gray-400 uppercase mb-1 block">ระบุ Group ID เพื่อทดสอบ (ไม่บังคับ)</label>
                    <input 
                      type="text" 
                      placeholder="ใส่ ID เช่น C..."
                      className="w-full bg-white border border-gray-200 rounded p-1.5 text-[10px] font-bold outline-none focus:ring-1 focus:ring-admin-blue"
                      value={testId}
                      onChange={(e) => setTestId(e.target.value)}
                    />
                    <p className="text-[8px] text-gray-400 mt-1 italic leading-tight">
                      * เว้นว่างไว้เพื่อใช้ค่าจาก .env
                    </p>
                  </div>
                  
                  <AnimatePresence mode="wait">
                    {!showConfirm ? (
                      <motion.button 
                        key="send-btn"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        disabled={loading}
                        onClick={() => setShowConfirm(true)}
                        className="w-full bg-admin-blue text-white py-2 rounded text-xs font-black uppercase shadow-lg shadow-admin-blue/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                      >
                        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                        ส่งข้อความทดสอบ
                      </motion.button>
                    ) : (
                      <motion.div 
                        key="confirm-btns"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex gap-2"
                      >
                        <button 
                          onClick={testLineNotify}
                          className="flex-1 bg-admin-success text-white py-2 rounded text-xs font-black uppercase shadow-lg shadow-admin-success/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                          ยืนยันการส่ง
                        </button>
                        <button 
                          onClick={() => setShowConfirm(false)}
                          className="flex-1 bg-gray-200 text-gray-700 py-2 rounded text-xs font-black uppercase hover:bg-gray-300 transition-all"
                        >
                          ยกเลิก
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {result && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 rounded-lg flex items-start gap-3 ${result.success ? 'bg-admin-success/10 border border-admin-success/20 text-admin-success' : 'bg-admin-danger/10 border border-admin-danger/20 text-admin-danger'}`}
              >
                {result.success ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
                <p className="text-[11px] font-bold leading-relaxed">{result.message}</p>
              </motion.div>
            )}
          </div>
        </div>

        {/* System Info Card */}
        <div className="admin-card">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-800">📊 System Information</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {[
                { label: 'Environment', value: 'Production Ready' },
                { label: 'Database', value: 'SQLite 3' },
                { label: 'Frontend', value: 'React + Tailwind + Framer' },
                { label: 'API Version', value: 'v1.0.4' },
              ].map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-[10px] font-black uppercase text-gray-400">{item.label}</span>
                  <span className="text-xs font-bold text-gray-700">{item.value}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-2 text-center underline">Developer Notice</p>
               <p className="text-[10px] text-gray-500 text-center leading-relaxed font-medium">
                 หากไม่ได้รับแจ้งเตือน โปรดตรวจสอบ LINE_CHANNEL_ACCESS_TOKEN และ LINE_GROUP_ID ในไฟล์ .env ให้ถูกต้อง และตรวจสอบว่า Bot ได้เข้าไปอยู่ในกลุ่มนั้นแล้ว
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
