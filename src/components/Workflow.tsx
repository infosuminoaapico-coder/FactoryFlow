import React from 'react';
import { motion } from 'motion/react';
import { 
  Package, 
  Settings, 
  ArrowRightLeft, 
  BarChart3, 
  MessageSquare,
  ClipboardList
} from 'lucide-react';

export default function Workflow() {
  const steps = [
    {
      title: '1. จัดการคลังสินค้า',
      desc: 'นำเข้าวัสดุ กำหนดจุดแจ้งเตือน (Min Stock) และพิมพ์รหัส QR Code',
      icon: Package,
      color: 'bg-admin-blue',
    },
    {
      title: '2. วางแผนโครงการ',
      desc: 'สร้างโปรเจคและกำหนดงบประมาณวัสดุที่ต้องใช้ (Material Budget)',
      icon: ClipboardList,
      color: 'bg-admin-dark',
    },
    {
      title: '3. การเบิกจ่ายวัสดุ',
      desc: 'ช่างสแกน QR Code หน้างานเพื่อเบิกวัสดุเข้าระบบ ช่วยลดเอกสาร',
      icon: ArrowRightLeft,
      color: 'bg-admin-success',
    },
    {
      title: '4. ติดตามต้นทุน Real-time',
      desc: 'ระบบคำนวณต้นทุนสะสมเทียบกับแผนงานทันทีเมื่อมีการเบิก',
      icon: BarChart3,
      color: 'bg-admin-warning',
    },
    {
      title: '5. ระบบแจ้งเตือน LINE',
      desc: 'แจ้งเตือนผู้บริหารเมื่อเบิกเกินงบ หรือพัสดุใกล้หมดผ่าน LINE Notify',
      icon: MessageSquare,
      color: 'bg-[#00c300]',
    }
  ];

  return (
    <div className="space-y-[15px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-800">กระบวนการทำงาน (System Workflow)</h1>
        <div className="text-[12px] text-admin-gray uppercase font-bold tracking-wider">WoodCraft IMS Guide</div>
      </div>

      <div className="admin-card border-t-admin-blue p-6">
        <div className="relative">
          {/* Vertical line for desktop */}
          <div className="hidden md:block absolute left-[30px] top-4 bottom-4 w-0.5 bg-gray-200"></div>

          <div className="space-y-8">
            {steps.map((step, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative flex items-start gap-6 group"
              >
                <div className={`relative z-10 w-[60px] h-[60px] ${step.color} rounded-full flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                  <step.icon className="w-8 h-8" />
                </div>
                
                <div className="flex-1 bg-gray-50 border border-gray-100 p-4 rounded-lg shadow-sm hover:bg-white transition-colors">
                  <h3 className="text-base font-bold text-gray-800 mb-1">{step.title}</h3>
                  <p className="text-sm text-admin-gray font-semibold uppercase leading-relaxed">{step.desc}</p>
                </div>

                {idx < steps.length - 1 && (
                  <div className="md:hidden absolute left-[28px] top-[60px] h-8 w-0.5 bg-gray-200"></div>
                )}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-10 bg-admin-blue/5 border border-admin-blue/10 rounded p-4 flex gap-4 items-center">
            <div className="bg-admin-blue p-2 rounded text-white italic font-black">AI</div>
            <div>
                <h4 className="text-xs font-bold text-admin-blue leading-none mb-1">PRO-TIP: การจัดการต้นทุน</h4>
                <p className="text-[11px] text-admin-gray font-bold uppercase leading-tight">
                    การสแกน QR Code ทันทีที่เบิก จะช่วยให้ "ยอดส่วนต่างงบประมาณ" (Variance) ในแดชบอร์ดแม่นยำที่สุด 
                    ช่วยให้หยุดงานได้ทันทีก่อนที่ต้นทุนจะบานปลายเกินกำไรที่คาดการณ์ไว้
                </p>
            </div>
        </div>
      </div>
    </div>
  );
}
