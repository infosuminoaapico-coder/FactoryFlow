import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Search, 
  Filter,
  ArrowUpRight,
  TrendingDown,
  ArrowDownLeft,
  RotateCcw,
  Settings2,
  Calendar,
  User as UserIcon,
  Briefcase,
  Printer
} from 'lucide-react';
import { Transaction } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { COMPANY_INFO } from '../constants';
import * as XLSX from 'xlsx';

// --- Document Generation Helper ---
const generateDocument = (type: 'INVOICE' | 'TAX_INVOICE' | 'DELIVERY', txn: any) => {
  const titleMap = {
    INVOICE: 'ใบแจ้งหนี้ / INVOICE',
    TAX_INVOICE: 'ใบกำกับภาษี / TAX INVOICE',
    DELIVERY: 'ใบส่งของ / DELIVERY ORDER'
  };

  const codeMap = {
    INVOICE: 'IV',
    TAX_INVOICE: 'TAX',
    DELIVERY: 'DO'
  };

  const element = document.createElement('div');
  element.style.padding = '40px';
  element.style.fontFamily = "'Sarabun', 'Inter', sans-serif";
  element.style.color = '#333';
  element.style.backgroundColor = 'white';

  element.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 20px;">
      <div>
        <h2 style="margin: 0; font-size: 18px;">Rabbit Furniture Co., Ltd. (Head Office)</h2>
        <p style="margin: 5px 0 0 0; font-size: 11px; color: #666;">${COMPANY_INFO.address}</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #666;">เลขประจำตัวผู้เสียภาษี: ${COMPANY_INFO.taxId}</p>
      </div>
      <div style="text-align: right;">
        <h1 style="margin: 0; font-size: 20px;">${titleMap[type]}</h1>
        <p style="margin: 10px 0 0 0; font-size: 12px;"><b>Date:</b> ${txn.datetime?.split(' ')[0] || ''}</p>
        <p style="margin: 2px 0 0 0; font-size: 12px;"><b>No:</b> ${codeMap[type]}-${String(txn?.id || '').substring(0, 8).toUpperCase()}</p>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
      <div style="width: 45%;">
        <p style="margin: 0 0 5px 0; font-size: 11px; color: #888; font-weight: bold;">BILL TO:</p>
        <p style="margin: 0; font-size: 14px; font-weight: bold;">${txn.type === 'RECEIVE' ? (txn.vendor_name || 'N/A') : (txn.project_name || 'General Requirement')}</p>
        <p style="margin: 5px 0 0 0; font-size: 12px;">ผู้เบิก/ผู้ติดต่อ: ${txn.requester_name || txn.user_name || 'N/A'}</p>
      </div>
      <div style="width: 45%; text-align: right;">
        <p style="margin: 0 0 5px 0; font-size: 11px; color: #888; font-weight: bold;">REFERENCE:</p>
        <p style="margin: 0; font-size: 12px;">Ref ID: ${String(txn?.id || '').substring(0, 8)}</p>
        <p style="margin: 2px 0 0 0; font-size: 12px;">Status: Approved</p>
      </div>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
      <thead>
        <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
          <th style="padding: 12px 8px; text-align: left; font-size: 11px;">#</th>
          <th style="padding: 12px 8px; text-align: left; font-size: 11px;">รายการ / DESCRIPTION</th>
          <th style="padding: 12px 8px; text-align: right; font-size: 11px;">จำนวน / QTY</th>
          <th style="padding: 12px 8px; text-align: right; font-size: 11px;">ราคาต่อหน่วย / PRICE</th>
          <th style="padding: 12px 8px; text-align: right; font-size: 11px;">รวมเงิน / TOTAL</th>
        </tr>
      </thead>
      <tbody>
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 8px; font-size: 12px;">1</td>
          <td style="padding: 12px 8px; font-size: 12px;">${txn.product_name || 'N/A'}</td>
          <td style="padding: 12px 8px; font-size: 12px; text-align: right;">${txn.qty} ${txn.unit || 'units'}</td>
          <td style="padding: 12px 8px; font-size: 12px; text-align: right;">${(txn.unit_price || 0).toLocaleString()}</td>
          <td style="padding: 12px 8px; font-size: 12px; text-align: right;">${(txn.total_price || 0).toLocaleString()}</td>
        </tr>
      </tbody>
    </table>

    <div style="display: flex; justify-content: flex-end; margin-bottom: 50px;">
      <div style="width: 250px;">
        <div style="display: flex; justify-content: space-between; padding: 10px 0; border-top: 2px solid #333;">
          <span style="font-weight: bold; font-size: 14px;">ยอดรวมสุทธิ / TOTAL</span>
          <span style="font-weight: bold; font-size: 14px;">${(txn.total_price || 0).toLocaleString()} THB</span>
        </div>
      </div>
    </div>

    <div style="display: flex; justify-content: space-around; margin-top: 100px;">
      <div style="border-top: 1px solid #ddd; width: 150px; text-align: center; padding-top: 10px;">
        <p style="font-size: 10px; margin: 0;">ผู้รับของ / Receiver</p>
        <p style="font-size: 9px; color: #999; margin-top: 15px;">วันที่: ..../..../....</p>
      </div>
      <div style="border-top: 1px solid #ddd; width: 150px; text-align: center; padding-top: 10px;">
        <p style="font-size: 10px; margin: 0;">ผู้อนุมัติ / Authorized by</p>
        <p style="font-size: 9px; color: #999; margin-top: 15px;">วันที่: ..../..../....</p>
      </div>
    </div>

    <div style="position: absolute; bottom: 20px; left: 0; right: 0; text-align: center; font-size: 9px; color: #999; font-style: italic;">
      เอกสารนี้ออกโดยระบบคอมพิวเตอร์ ไม่ต้องมีลายเซ็น
    </div>
  `;

  const opt: any = {
    margin: 0,
    filename: `${type}_${String(txn.id).substring(0, 8)}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // @ts-ignore
  import('html2pdf.js').then(html2pdf => {
    html2pdf.default().set(opt).from(element).save();
  });
};

export default function Reports() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterProject, setFilterProject] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchTransactions = () => {
    setLoading(true);
    const url = `/api/transactions?projectId=${filterProject}`;
    fetch(url)
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setTransactions(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch transactions', err);
        setTransactions([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetch('/api/projects')
      .then(res => res.ok ? res.json() : [])
      .then(data => setProjects(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Failed to fetch projects for reports', err);
        setProjects([]);
      });
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [filterProject]);

  const filteredTransactions = (transactions || []).filter(t => {
    const matchesType = filterType === 'ALL' || t.type === filterType;
    const matchesSearch = !searchQuery || 
      t.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.project_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.vendor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.requester_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const totals = filteredTransactions.reduce((acc, t) => {
    acc.totalItems += (t.qty || 0);
    acc.totalValue += (t.total_price || 0);
    if (t.type === 'RECEIVE') acc.receive += 1;
    if (t.type === 'ISSUE') acc.issue += 1;
    if (t.type === 'RETURN') acc.return += 1;
    if (t.type === 'ADJUST') acc.adjust += 1;
    return acc;
  }, { totalItems: 0, totalValue: 0, receive: 0, issue: 0, return: 0, adjust: 0 });

  const getStatusStyle = (type: string) => {
    switch(type) {
      case 'RECEIVE': return 'bg-blue-100 text-blue-700';
      case 'ISSUE': return 'bg-rose-100 text-rose-700';
      case 'RETURN': return 'bg-green-100 text-green-700';
      case 'ADJUST': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getTypeName = (type: string) => {
    switch(type) {
      case 'RECEIVE': return 'รับเข้า';
      case 'ISSUE': return 'เบิกจ่าย';
      case 'RETURN': return 'คืนของ';
      case 'ADJUST': return 'ปรับปรุง';
      default: return type;
    }
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['วันที่-เวลา', 'ประเภท', 'รายการสินค้า', 'จำนวน', 'หน่วย', 'มูลค่า (฿)', 'โปรเจค/ผู้ขาย', 'ผู้เบิก', 'หมายเหตุ', 'ผู้บันทึก'];
    const rows = filteredTransactions.map(t => [
      t.datetime,
      getTypeName(t.type),
      t.product_name,
      t.qty,
      t.unit,
      t.total_price || 0,
      t.type === 'RECEIVE' ? t.vendor_name : t.project_name,
      t.requester_name || '',
      t.note || '',
      t.user_name
    ]);

    // Use BOM for UTF-8 to support Thai in Excel
    const BOM = '\uFEFF';
    const csvContent = BOM + [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `รายงานรายการคลังสินค้า_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (filteredTransactions.length === 0) return;

    const element = document.createElement('div');
    element.style.padding = '20px';
    element.style.fontFamily = "'Sarabun', 'Inter', sans-serif";
    
    element.innerHTML = `
      <h1 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">รายงานรายการคลังสินค้า (Inventory Transaction Report)</h1>
      <p style="font-size: 10px; color: #666; margin-bottom: 5px;">วันที่ออกรายงาน: ${new Date().toLocaleString('th-TH')}</p>
      <p style="font-size: 10px; color: #666; margin-bottom: 20px;">ประเภท: ${filterType}, โปรเจค: ${filterProject === 'ALL' ? 'ทั้งหมด' : filterProject}</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 9px;">
        <thead>
          <tr style="background-color: #1e293b; color: white;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">วันที่-เวลา</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">ประเภท</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">สินค้า</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">จำนวน</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">มูลค่า (฿)</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">โปรเจค/ซัพพลายเออร์</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">ผู้บันทึก</th>
          </tr>
        </thead>
        <tbody>
          ${filteredTransactions.map(t => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${t.datetime}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${getTypeName(t.type)}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${t.product_name}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${t.qty} ${t.unit}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(t.total_price || 0).toLocaleString()}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${t.type === 'RECEIVE' ? (t.vendor_name || '-') : (t.project_name || '-')}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${t.user_name}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const opt: any = {
      margin: 10,
      filename: `Transaction_Report_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // @ts-ignore
    import('html2pdf.js').then(html2pdf => {
      html2pdf.default().set(opt).from(element).save();
    });
  };

  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) return;

    const exportData = filteredTransactions.map(t => ({
      'วันที่-เวลา': t.datetime,
      'ประเภท': getTypeName(t.type),
      'รายการสินค้า': t.product_name,
      'จำนวน': t.qty,
      'หน่วย': t.unit,
      'มูลค่า (฿)': t.total_price || 0,
      'โปรเจค/ผู้ขาย': t.type === 'RECEIVE' ? t.vendor_name : t.project_name,
      'ผู้เบิก': t.requester_name || '',
      'หมายเหตุ': t.note || '',
      'ผู้บันทึก': t.user_name
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reports');
    
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Inventory_Transactions_${date}.xlsx`);
  };

  return (
    <div className="space-y-[15px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">WoodCraft Factory</h1>
          <p className="text-[12px] text-blue-600 uppercase font-black tracking-widest">ประวัติรายการคลังสินค้า (Inventory Audit)</p>
        </div>
        <div className="flex flex-wrap gap-2">
           <button 
            onClick={handleExportPDF}
            className="bg-white border border-gray-200 px-3 py-1.5 rounded text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-gray-50 transition-colors"
           >
              <FileText className="w-3.5 h-3.5" /> PDF Report
           </button>
           <button 
            onClick={handleExportExcel}
            className="bg-green-600 text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-green-700 transition-colors"
           >
              <Download className="w-3.5 h-3.5" /> Excel Export
           </button>
           <button 
            onClick={handleExportCSV}
            className="bg-admin-dark text-white px-3 py-1.5 rounded text-[10px] font-bold uppercase flex items-center gap-2 hover:bg-gray-800 transition-colors"
           >
              <Download className="w-3.5 h-3.5" /> CSV Export
           </button>
        </div>
      </div>

      <div className="admin-card border-t-admin-dark">
         <div className="p-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex gap-1 bg-gray-100 p-1 rounded">
                {['ALL', 'RECEIVE', 'ISSUE', 'RETURN', 'ADJUST'].map(type => (
                    <button 
                      key={type}
                      onClick={() => setFilterType(type)}
                      className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${
                        filterType === type ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      {type === 'ALL' ? 'ทั้งหมด' : getTypeName(type)}
                    </button>
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-admin-gray" />
                <select 
                  className="bg-gray-50 border border-gray-200 px-2 py-1 rounded text-[11px] font-bold outline-none focus:ring-1 focus:ring-admin-blue"
                  value={filterProject || ''}
                  onChange={(e) => setFilterProject(e.target.value)}
                >
                  <option value="ALL">เลือกโปรเจค (ทั้งหมด)</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="relative">
               <Search className="absolute left-2.5 top-1.5 w-3 h-3 text-gray-400" />
               <input 
                 type="text" 
                 placeholder="ค้นหารายการ, โปรเจค, ผู้เบิก..."
                 className="bg-gray-50 border border-gray-200 pl-8 pr-3 py-1.5 rounded text-[11px] font-semibold outline-none focus:ring-1 focus:ring-admin-blue w-full sm:w-64"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
            </div>
         </div>

         {/* Summary Banner */}
         <div className="bg-gray-50 border-b border-gray-100 px-4 py-2 flex items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">โปรเจค:</span>
                    <span className="text-[11px] font-black text-gray-700">
                        {filterProject === 'ALL' ? 'ทั้งหมด' : projects.find(p => p.id === filterProject)?.name || filterProject}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">รายการรวมทั้งสิ้น:</span>
                    <span className="text-[11px] font-black text-admin-blue">{filteredTransactions.length} รายการ</span>
                </div>
            </div>
            <div className="flex items-center gap-6 whitespace-nowrap">
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">จำนวนของ:</span>
                    <span className="text-[11px] font-black text-gray-800">{totals.totalItems.toLocaleString()} ชิ้น</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">ยอดมูลค่าทั้งหมด:</span>
                    <span className="text-[11px] font-black text-green-600">฿ {totals.totalValue.toLocaleString()}</span>
                </div>
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
               <thead>
                  <tr className="bg-gray-50/50 text-[10px] text-admin-gray uppercase font-black tracking-widest border-b border-gray-100">
                     <th className="px-4 py-3">วัน-เวลา</th>
                     <th className="px-4 py-3">ประเภท</th>
                     <th className="px-4 py-3">รายการสินค้า</th>
                     <th className="px-4 py-3 text-right">จำนวน</th>
                     <th className="px-4 py-3 text-right">มูลค่า (฿)</th>
                     <th className="px-4 py-3">ผู้เกี่ยวข้อง / รายละเอียด</th>
                     <th className="px-4 py-3">ผู้ลงบันทึก</th>
                     <th className="px-4 py-3 text-right">เอกสาร</th>
                  </tr>
               </thead>
               <tbody className="text-[11px]">
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400 italic font-medium uppercase tracking-widest">
                         Loading historical data...
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-400 italic font-medium uppercase tracking-widest">
                         No records found
                      </td>
                    </tr>
                  ) : filteredTransactions.map((t) => (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                       <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono italic">
                          {t.datetime?.split(' ')[0] || ''} <span className="text-[9px] opacity-70">{t.datetime?.split(' ')[1] || ''}</span>
                       </td>
                       <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${getStatusStyle(t.type)}`}>
                             {getTypeName(t.type)}
                          </span>
                       </td>
                       <td className="px-4 py-3">
                          <div className="font-bold text-gray-800">{t.product_name}</div>
                          <div className="text-[9px] text-gray-400 uppercase font-bold tracking-tighter">Inventory Item</div>
                       </td>
                       <td className="px-4 py-3 text-right font-bold text-gray-700">
                          {(() => {
                             const displayVal = t.selected_qty || t.qty;
                             if (t.type === 'ADJUST') {
                               return parseFloat(displayVal as any) > 0 ? `+${displayVal}` : displayVal;
                             }
                             return displayVal;
                          })()} {t.unit}
                       </td>
                       <td className="px-4 py-3 text-right font-black text-admin-gray">
                          {(t.total_price || 0).toLocaleString()}
                       </td>
                       <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                             {t.type === 'RECEIVE' && (
                               <div className="text-blue-600 font-bold uppercase truncate max-w-[150px]">🏢 {t.vendor_name}</div>
                             )}
                             {(t.type === 'ISSUE' || t.type === 'RETURN') && (
                               <div>
                                  <div className="text-admin-dark font-bold uppercase truncate max-w-[150px]">📁 {t.project_name}</div>
                                  <div className="text-[9px] text-gray-400 font-bold">👤 {t.requester_name}</div>
                               </div>
                             )}
                             {t.type === 'ADJUST' && (
                               <div className="text-gray-500 italic font-bold">📝 {t.note || 'No reason specified'}</div>
                             )}
                          </div>
                       </td>
                       <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                             <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-[8px] font-bold">
                                {String(t.user_name || '').substring(0, 2)}
                             </div>
                             <div className="text-gray-600 font-bold">{t.user_name}</div>
                          </div>
                       </td>
                       <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                             <button
                               onClick={() => generateDocument('DELIVERY', t)}
                               className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                               title="ใบส่งของ"
                             >
                                <FileText className="w-3.5 h-3.5" />
                             </button>
                             <button
                               onClick={() => generateDocument('INVOICE', t)}
                               className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                               title="ใบแจ้งหนี้"
                             >
                                <Download className="w-3.5 h-3.5" />
                             </button>
                             <button
                               onClick={() => generateDocument('TAX_INVOICE', t)}
                               className="p-1 text-admin-dark hover:bg-gray-100 rounded"
                               title="ใบกำกับภาษี"
                             >
                                <Printer className="w-3.5 h-3.5" />
                             </button>
                          </div>
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
         
         <div className="p-3 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
            <div className="text-[10px] text-gray-400 font-bold uppercase italic font-mono">
               Showing {filteredTransactions.length} recent transactions
            </div>
            <div className="flex gap-1">
               <button className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-400">&lt;</button>
               <button className="w-6 h-6 flex items-center justify-center bg-admin-blue text-white rounded text-[10px] font-bold">1</button>
               <button className="w-6 h-6 flex items-center justify-center bg-white border border-gray-200 rounded text-[10px] font-bold text-gray-400">&gt;</button>
            </div>
         </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-[15px]">
          <div className="admin-card border-t-0 p-4 bg-white border border-gray-200 flex flex-col shadow-sm">
             <div className="flex items-center justify-between mb-2">
                 <p className="text-[10px] font-black text-gray-400 uppercase">จำนวนรับเข้า</p>
                 <ArrowDownLeft className="w-4 h-4 text-blue-500" />
             </div>
             <p className="text-xl font-black text-gray-800">{totals.receive}</p>
             <p className="text-[9px] font-bold text-blue-500 uppercase mt-1">RECEIVE Transactions</p>
          </div>
          <div className="admin-card border-t-0 p-4 bg-white border border-gray-200 flex flex-col shadow-sm">
             <div className="flex items-center justify-between mb-2">
                 <p className="text-[10px] font-black text-gray-400 uppercase">เบิกจ่าย</p>
                 <ArrowUpRight className="w-4 h-4 text-rose-500" />
             </div>
             <p className="text-xl font-black text-gray-800">{totals.issue}</p>
             <p className="text-[9px] font-bold text-rose-500 uppercase mt-1">ISSUE Transactions</p>
          </div>
          <div className="admin-card border-t-0 p-4 bg-white border border-gray-200 flex flex-col shadow-sm">
             <div className="flex items-center justify-between mb-2">
                 <p className="text-[10px] font-black text-gray-400 uppercase">คืนของ</p>
                 <RotateCcw className="w-4 h-4 text-green-500" />
             </div>
             <p className="text-xl font-black text-gray-800">{totals.return}</p>
             <p className="text-[9px] font-bold text-green-500 uppercase mt-1">RETURN Transactions</p>
          </div>
          <div className="admin-card border-t-0 p-4 bg-white border border-gray-200 flex flex-col shadow-sm">
             <div className="flex items-center justify-between mb-2">
                 <p className="text-[10px] font-black text-gray-400 uppercase">ปรับปรุง</p>
                 <Settings2 className="w-4 h-4 text-gray-500" />
             </div>
             <p className="text-xl font-black text-gray-800">{totals.adjust}</p>
             <p className="text-[9px] font-bold text-gray-400 uppercase mt-1">ADJUST Transactions</p>
          </div>
      </div>
    </div>
  );
}
