import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Search, 
  Filter, 
  AlertTriangle, 
  Plus, 
  Download,
  MoreVertical,
  QrCode,
  X,
  Printer,
  Upload,
  FileText
} from 'lucide-react';
import { motion } from 'motion/react';
import { Product } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { User } from '../types';

export default function Inventory({ user }: { user: User }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [filterMode, setFilterMode] = useState<'ALL' | 'LOW'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedQR, setSelectedQR] = useState<{ url: string, name: string } | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txFilter, setTxFilter] = useState<string>('ALL');
  const [txLoading, setTxLoading] = useState(false);
  const [newFormData, setNewFormData] = useState<any>({
    name: '',
    qr_code: '',
    category: 'GENERAL',
    stock_qty: 0,
    unit: 'ชิ้น',
    cost_price: 0,
    min_alert: 5,
    sub_units: []
  });

  const isAdmin = user.role === 'admin';

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchProducts = () => {
    fetch('/api/products')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setProducts(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch products for inventory', err);
        setProducts([]);
        setLoading(false);
      });
  };

  const fetchRecentTransactions = () => {
    setTxLoading(true);
    fetch('/api/transactions')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setTransactions(Array.isArray(data) ? data : []);
        setTxLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch transactions', err);
        setTransactions([]);
        setTxLoading(false);
      });
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result;
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet);

        const errors: string[] = [];
        const validatedProducts: any[] = [];

        data.forEach((row: any, index: number) => {
          const rowNum = index + 2; // Assuming header is at row 1
          
          const name = row['ชื่อสินค้า/วัสดุ'] || row['ชื่อสินค้า'] || row['Description'] || row['name'];
          if (!name) {
            errors.push(`แถวที่ ${rowNum}: ไม่พบชื่อสินค้า`);
            return;
          }

          const stock_qty = row['จำนวนคงเหลือ'] || row['Stock'] || row['stock_qty'];
          if (stock_qty === undefined || isNaN(Number(stock_qty))) {
            errors.push(`แถวที่ ${rowNum}: จำนวนคงเหลือไม่ใช่ตัวเลข (${name})`);
            return;
          }

          const cost_price = row['ราคาต้นทุน'] || row['Price'] || row['cost_price'] || 0;
          if (isNaN(Number(cost_price))) {
            errors.push(`แถวที่ ${rowNum}: ราคาต้นทุนไม่ใช่ตัวเลข (${name})`);
            return;
          }

          const min_alert = row['จุดแจ้งเตือนขั้นต่ำ'] || row['Min'] || row['min_alert'] || 5;
          if (isNaN(Number(min_alert))) {
            errors.push(`แถวที่ ${rowNum}: จุดแจ้งเตือนขั้นต่ำไม่ใช่ตัวเลข (${name})`);
            return;
          }

          validatedProducts.push({
            qr_code: String(row['รหัสสินค้า (QR Code)'] || row['Code'] || row['qr_code'] || '').trim(),
            name: String(name).trim(),
            stock_qty: Number(stock_qty),
            unit: row['หน่วยนับ'] || row['Unit'] || row['unit'] || 'ชิ้น',
            category: row['หมวดหมู่'] || row['Category'] || row['category'] || 'GENERAL',
            cost_price: Number(cost_price),
            min_alert: Number(min_alert)
          });
        });

        if (errors.length > 0) {
          const errorMessage = `พบข้อผิดพลาด ${errors.length} รายการ:\n` + errors.slice(0, 10).join('\n') + (errors.length > 10 ? '\n...' : '');
          alert(errorMessage);
          if (validatedProducts.length === 0) {
            setImporting(false);
            return;
          }
          if (!confirm(`มีข้อมูลที่ถูกต้อง ${validatedProducts.length} รายการ คุณต้องการนำเข้าข้อมูลเฉพาะที่ถูกต้องใช่หรือไม่?`)) {
            setImporting(false);
            return;
          }
        }

        if (validatedProducts.length === 0) {
          alert('ไม่พบข้อมูลที่สามารถนำเข้าได้');
          setImporting(false);
          return;
        }

        const res = await fetch('/api/products/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(validatedProducts)
        });

        if (res.ok) {
          alert(`นำเข้าข้อมูลสำเร็จ ${validatedProducts.length} รายการ`);
          fetchProducts();
        } else {
          const err = await res.json();
          alert('นำเข้าข้อมูลล้มเหลว: ' + err.message);
        }
      } catch (err) {
        console.error(err);
        alert('เกิดข้อผิดพลาดในการประมวลผลไฟล์');
      } finally {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    fetchProducts();
    fetchRecentTransactions();
  }, []);

  const handleEdit = (p: Product) => {
    setEditingProduct(p);
    setEditFormData({ ...p });
  };

  const saveEdit = async () => {
    if (!editingProduct) return;
    if (!confirm(`ยืนยันการแก้ไขข้อมูล ${editingProduct.name}?`)) return;

    try {
      const res = await fetch(`/api/products/${editingProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        setEditingProduct(null);
        fetchProducts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveNew = async () => {
    if (!newFormData.name) {
      alert('กรุณากรอกชื่อสินค้า');
      return;
    }

    try {
      const res = await fetch(`/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFormData)
      });
      if (res.ok) {
        setIsAdding(false);
        setNewFormData({
          name: '',
          qr_code: '',
          category: 'GENERAL',
          stock_qty: 0,
          unit: 'ชิ้น',
          cost_price: 0,
          min_alert: 5,
          sub_units: []
        });
        fetchProducts();
      } else {
        const err = await res.json();
        alert(err.message || 'ไม่สามารถเพิ่มสินค้าได้');
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    }
  };

  const viewQR = async (p: Product) => {
    try {
      const res = await fetch(`/api/products/${p.id}/qr`);
      const data = await res.json();
      setSelectedQR({ url: data.qrDataUrl, name: p.name });
    } catch (err) {
      console.error(err);
    }
  };

  const handleExportExcel = () => {
    if (filtered.length === 0) {
      alert('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    const exportData = filtered.map(p => ({
      'รหัสสินค้า (QR Code)': p.qr_code,
      'ชื่อสินค้า/วัสดุ': p.name,
      'หมวดหมู่': p.category,
      'จำนวนคงเหลือ': p.stock_qty,
      'หน่วยนับ': p.unit,
      'ราคาต้นทุน': p.cost_price,
      'จุดแจ้งเตือนขั้นต่ำ': p.min_alert
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory');
    
    // Generate filename with current date
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Inventory_Export_${date}.xlsx`);
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      alert('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    const exportData = filtered.map(p => ({
      qr_code: p.qr_code,
      name: p.name,
      category: p.category,
      stock_qty: p.stock_qty,
      unit: p.unit,
      cost_price: p.cost_price,
      min_alert: p.min_alert
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const csvContent = XLSX.utils.sheet_to_csv(worksheet);
    
    // Add BOM for Thai support in Excel
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().split('T')[0];
    
    link.setAttribute('href', url);
    link.setAttribute('download', `Inventory_Stock_${date}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    if (filtered.length === 0) return;

    // We use a temporary hidden div to render the table and then use html2pdf
    // This is the most reliable way to support Thai characters in PDF
    const element = document.createElement('div');
    element.style.padding = '20px';
    element.style.fontFamily = "'Sarabun', 'Inter', sans-serif";
    
    element.innerHTML = `
      <h1 style="font-size: 20px; font-weight: bold; margin-bottom: 10px;">รายงานคลังสินค้า (Inventory Report)</h1>
      <p style="font-size: 10px; color: #666; margin-bottom: 20px;">วันที่ออกรายงาน: ${new Date().toLocaleString('th-TH')}</p>
      <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
        <thead>
          <tr style="background-color: #1e293b; color: white;">
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">รหัสสินค้า</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">ชื่อสินค้า/วัสดุ</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">หมวดหมู่</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">จำนวน</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">หน่วย</th>
            <th style="padding: 8px; border: 1px solid #ddd; text-align: right;">ต้นทุน (฿)</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(p => `
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;">${p.qr_code || '-'}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${p.name || ''}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${p.category || ''}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(p.stock_qty || 0).toLocaleString()}</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${p.unit || ''}</td>
              <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${(p.cost_price || 0).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    const opt: any = {
      margin: 10,
      filename: `Inventory_Report_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Need to import html2pdf dynamically or ensure it's in scope
    // Since we installed it, we can use it.
    // @ts-ignore
    import('html2pdf.js').then(html2pdf => {
      html2pdf.default().set(opt).from(element).save();
    });
  };

  const categories = ['ALL', ...new Set(products.map(p => p.category))];

  const filtered = (products || []).filter(p => {
    const name = p.name || '';
    const category = p.category || '';
    const matchesSearch = name.toLowerCase().includes(search.toLowerCase()) || 
                         category.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterMode === 'ALL' || (p.stock_qty || 0) <= (p.min_alert || 0);
    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
    return matchesSearch && matchesFilter && matchesCategory;
  });

  return (
    <div className="space-y-[15px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-800">คลังสินค้าและวัสดุ</h1>
        {isAdmin && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-admin-blue text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm hover:bg-blue-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" /> เพิ่มสินค้าใหม่
          </button>
        )}
      </div>

      <div className="admin-card border-t-0 overflow-hidden">
        {/* Filters */}
        <div className="p-3 border-b border-gray-100 flex flex-col md:flex-row gap-3 bg-gray-50/50">
          <div className="flex gap-1 bg-white p-1 rounded-lg border border-gray-100 h-fit">
            <button 
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all ${filterMode === 'ALL' ? 'bg-admin-dark text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              ทั้งหมด
            </button>
            <button 
              onClick={() => setFilterMode('LOW')}
              className={`px-3 py-1 rounded text-[10px] font-black uppercase transition-all flex items-center gap-1 ${filterMode === 'LOW' ? 'bg-admin-danger text-white' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <AlertTriangle className="w-3 h-3" /> สต๊อกต่ำ
            </button>
          </div>

          <div className="flex items-center gap-2 bg-white px-2 rounded-lg border border-gray-100">
            <Filter className="w-3 h-3 text-gray-400" />
            <select 
              className="bg-transparent border-none text-[10px] font-black uppercase outline-none py-1.5 min-w-[100px]"
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {categories.map(c => (
                <option key={c} value={c}>{c === 'ALL' ? 'All Categories' : c}</option>
              ))}
            </select>
          </div>

          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="ค้นหา..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-gray-200 rounded text-xs focus:ring-1 focus:ring-admin-blue outline-none transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept=".xlsx, .xls"
                  onChange={handleImportExcel}
                />
                <button 
                  onClick={() => {
                    const headers = [['qr_code', 'name', 'stock_qty', 'unit', 'category', 'cost_price', 'min_alert']];
                    const worksheet = XLSX.utils.aoa_to_sheet([
                      ['รหัสสินค้า (QR Code)', 'ชื่อสินค้า/วัสดุ', 'จำนวนคงเหลือ', 'หน่วยนับ', 'หมวดหมู่', 'ราคาต้นทุน', 'จุดแจ้งเตือนขั้นต่ำ'],
                      ['ITEM-001', 'ไม้แผ่นสัก', 10, 'แผ่น', 'WOOD', 550, 5]
                    ]);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory-Template');
                    XLSX.writeFile(workbook, 'Woodcraft_Inventory_Template.xlsx');
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-admin-dark text-white border border-admin-dark rounded text-xs font-bold hover:bg-black transition-colors"
                >
                  <Download className="w-3.5 h-3.5" /> Template
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="flex items-center gap-2 px-3 py-1.5 bg-admin-blue/10 text-admin-blue border border-admin-blue/20 rounded text-xs font-bold hover:bg-admin-blue/20 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" /> 
                  {importing ? 'Importing...' : 'Import Excel'}
                </button>
              </>
            )}
            <button 
              onClick={handleExportPDF}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-bold text-gray-600 hover:bg-gray-50"
            >
              <FileText className="w-3.5 h-3.5" /> PDF
            </button>
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-bold text-gray-600 hover:bg-gray-50"
            >
              <Download className="w-3.5 h-3.5" /> Excel
            </button>
            <button 
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded text-xs font-bold text-gray-600 hover:bg-gray-50"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-100">
                <th className="px-4 py-2 border-b border-gray-200 font-bold text-admin-gray">สินค้า/วัสดุ</th>
                <th className="px-4 py-2 border-b border-gray-200 font-bold text-admin-gray">หมวดหมู่</th>
                <th className="px-4 py-2 border-b border-gray-200 font-bold text-admin-gray">คงเหลือ</th>
                <th className="px-4 py-2 border-b border-gray-200 font-bold text-admin-gray">ต้นทุน (฿)</th>
                <th className="px-4 py-2 border-b border-gray-200 font-bold text-admin-gray text-right">แอคชั่น</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p) => {
                const isLowStock = (p.stock_qty || 0) <= (p.min_alert || 0);
                return (
                  <tr key={p.id} className={`transition-colors ${isLowStock ? 'bg-red-50/70 hover:bg-red-100/70' : 'hover:bg-blue-50/30'}`}>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded ${isLowStock ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                          {isLowStock ? <AlertTriangle className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className={`font-bold uppercase leading-none mb-1 ${isLowStock ? 'text-red-900' : 'text-gray-800'}`}>{p.name}</p>
                          <div className="flex items-center gap-2">
                             <p className={`text-[10px] font-mono ${isLowStock ? 'text-red-400' : 'text-admin-gray'}`}>QR: {p.qr_code}</p>
                               {(() => {
                                 const currentSubs = p.sub_units;
                                 let subsArray = [];
                                 if (Array.isArray(currentSubs)) {
                                   subsArray = currentSubs;
                                 } else if (typeof currentSubs === 'string' && currentSubs.trim() !== '') {
                                   try { subsArray = JSON.parse(currentSubs); } catch(e) { subsArray = []; }
                                 }
                                 
                                 if (subsArray.length === 0) return null;
                                 
                                 return (
                                   <div className="flex gap-1">
                                     {subsArray.map((sub: any, idx: number) => (
                                       <span key={idx} className={`text-[8px] px-1 rounded font-bold uppercase ${isLowStock ? 'bg-red-200 text-red-500' : 'bg-gray-200 text-gray-500'}`} title={`${sub.multiplier} ${p.unit}`}>
                                         {sub.name}
                                       </span>
                                     ))}
                                   </div>
                                 );
                               })()}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={`px-4 py-2 uppercase text-[11px] font-bold ${isLowStock ? 'text-red-700' : 'text-admin-gray'}`}>
                      {p.category}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold ${isLowStock ? 'text-red-600' : 'text-gray-900'}`}>
                          {(p.stock_qty || 0).toLocaleString()} {p.unit}
                        </span>
                        {isLowStock && (
                          <div className="flex items-center gap-1 text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded-full font-black animate-pulse shadow-sm">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            <span>STOCK LOW</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className={`px-4 py-2 font-semibold ${isLowStock ? 'text-red-800' : ''}`}>
                      {isAdmin ? (p.cost_price || 0).toLocaleString() : '***'}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => viewQR(p)}
                          className={`p-1.5 rounded transition-all ${isLowStock ? 'text-red-400 hover:text-red-600 hover:bg-white' : 'text-admin-gray hover:text-admin-blue hover:bg-white'}`}
                        >
                          <QrCode className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button 
                            onClick={() => handleEdit(p)}
                            className={`p-1.5 rounded transition-all ${isLowStock ? 'text-red-400 hover:text-red-900 hover:bg-white' : 'text-admin-gray hover:text-gray-900 hover:bg-white'}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="admin-card border-t-0 p-4 bg-white shadow-sm border border-gray-100 rounded-xl overflow-hidden mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
              <div>
                  <h3 className="text-[13px] font-black uppercase tracking-widest text-gray-800">ประวัติรายการล่าสุด (Recent Activity)</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">10 รายการล่าสุดในระบบ</p>
              </div>
              <div className="flex flex-wrap gap-1 bg-gray-50 p-1 rounded-lg border border-gray-100">
                  {['ALL', 'RECEIVE', 'ISSUE', 'RETURN', 'ADJUST'].map(type => (
                      <button 
                        key={type}
                        onClick={() => setTxFilter(type)}
                        className={`px-3 py-1.5 rounded text-[9px] font-black uppercase transition-all ${txFilter === type ? 'bg-admin-blue text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                      >
                          {type === 'ALL' ? 'ทั้งหมด' : type === 'RECEIVE' ? 'รับเข้า' : type === 'ISSUE' ? 'เบิกของ' : type === 'RETURN' ? 'คืนของ' : 'ปรับยอด'}
                      </button>
                  ))}
              </div>
          </div>
          <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                      <tr className="border-b border-gray-100 text-gray-400 uppercase font-black tracking-tighter bg-gray-50/50">
                          <th className="py-2.5 px-3">วันที่/เวลา</th>
                          <th className="py-2.5 px-3">ประเภท</th>
                          <th className="py-2.5 px-3">สินค้า</th>
                          <th className="py-2.5 px-3">จำนวน</th>
                          <th className="py-2.5 px-3">ผู้ทำรายการ</th>
                          <th className="py-2.5 px-3">หมายเหตุ/เหตุผล</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                      {txLoading ? (
                        <tr><td colSpan={6} className="py-10 text-center text-gray-400 font-bold animate-pulse">กำลังโหลดข้อมูล...</td></tr>
                      ) : transactions.filter(t => txFilter === 'ALL' || t.type === txFilter).length === 0 ? (
                        <tr><td colSpan={6} className="py-10 text-center text-gray-400 font-bold italic">ไม่พบประวัติรายการ {txFilter !== 'ALL' ? `ประเภท ${txFilter}` : ''}</td></tr>
                      ) : transactions.filter(t => txFilter === 'ALL' || t.type === txFilter).slice(0, 10).map(tx => (
                          <tr key={tx.id} className="hover:bg-blue-50/20 transition-colors group">
                              <td className="py-2.5 px-3 font-mono text-gray-400 whitespace-nowrap">{tx.datetime}</td>
                              <td className="py-2.5 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase shadow-sm border ${
                                    tx.type === 'RECEIVE' ? 'bg-blue-100 text-blue-600 border-blue-200' :
                                    tx.type === 'ISSUE' ? 'bg-rose-100 text-rose-600 border-rose-200' :
                                    tx.type === 'RETURN' ? 'bg-emerald-100 text-emerald-600 border-emerald-200' :
                                    'bg-slate-100 text-slate-600 border-slate-200'
                                }`}>
                                    {tx.type === 'RECEIVE' ? 'RECEIVE' : tx.type === 'ISSUE' ? 'ISSUE' : tx.type === 'RETURN' ? 'RETURN' : 'ADJUST'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <p className="font-bold text-gray-700 leading-tight group-hover:text-admin-blue transition-colors">{tx.product_name}</p>
                                <p className="text-[9px] text-gray-400 font-mono tracking-tighter">REF: {String(tx.id).padStart(6, '0')}</p>
                              </td>
                              <td className="py-2.5 px-3 font-black text-gray-900 whitespace-nowrap">
                                {(() => {
                                  const displayVal = tx.selected_qty || tx.qty;
                                  if (tx.type === 'ADJUST') {
                                    return parseFloat(displayVal) > 0 ? `+${displayVal}` : displayVal;
                                  }
                                  return displayVal;
                                })()} {tx.selected_unit || tx.unit}
                              </td>
                              <td className="py-2.5 px-3 font-bold text-gray-600">
                                {tx.requester_name || tx.user_name || 'System'}
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="max-w-[150px] sm:max-w-[250px] truncate italic text-gray-400 group-hover:text-gray-500 transition-colors" title={tx.note}>
                                  {tx.note || '-'}
                                </div>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
      </div>

      {/* Add Product Modal */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">📦 เพิ่มสินค้าใหม่</h3>
                <button onClick={() => setIsAdding(false)}><X className="w-5 h-5 text-gray-400" /></button>
             </div>
             <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-gray-400 px-1">ชื่อสินค้า/วัสดุ *</label>
                   <input 
                     type="text" 
                     className="w-full border border-gray-200 rounded p-2 text-xs font-bold outline-none focus:ring-1 focus:ring-admin-blue"
                     value={newFormData.name}
                     onChange={(e) => setNewFormData({...newFormData, name: e.target.value})}
                     placeholder="ระบุชื่อสินค้า"
                   />
                </div>
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-gray-400 px-1">รหัสสินค้า (QR Code)</label>
                   <input 
                     type="text" 
                     className="w-full border border-gray-200 rounded p-2 text-xs font-bold outline-none focus:ring-1 focus:ring-admin-blue"
                     value={newFormData.qr_code}
                     onChange={(e) => setNewFormData({...newFormData, qr_code: e.target.value})}
                     placeholder="สแกนหรือระบุรหัสสินค้า (ถ้ามี)"
                   />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 px-1">หมวดหมู่</label>
                    <input 
                      type="text" 
                      className="w-full border border-gray-200 rounded p-2 text-xs font-bold outline-none focus:ring-1 focus:ring-admin-blue"
                      value={newFormData.category}
                      onChange={(e) => setNewFormData({...newFormData, category: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 px-1">หน่วยนับ</label>
                    <input 
                      type="text" 
                      className="w-full border border-gray-200 rounded p-2 text-xs font-bold outline-none focus:ring-1 focus:ring-admin-blue"
                      value={newFormData.unit}
                      placeholder="เช่น แผ่น, ม้วน, ชิ้น"
                      onChange={(e) => setNewFormData({...newFormData, unit: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 px-1">จำนวนตั้งต้น</label>
                    <input 
                      type="number" 
                      className="w-full border border-gray-200 rounded p-2 text-xs font-bold outline-none focus:ring-1 focus:ring-admin-blue"
                      value={newFormData.stock_qty}
                      onChange={(e) => setNewFormData({...newFormData, stock_qty: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 px-1">ราคาต้นทุน (฿)</label>
                    <input 
                      type="number" 
                      className="w-full border border-gray-200 rounded p-2 text-xs font-bold outline-none focus:ring-1 focus:ring-admin-blue"
                      value={newFormData.cost_price}
                      onChange={(e) => setNewFormData({...newFormData, cost_price: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 px-1">แจ้งเตือน (Min)</label>
                    <input 
                      type="number" 
                      className="w-full border border-gray-200 rounded p-2 text-xs font-bold outline-none focus:ring-1 focus:ring-admin-blue text-admin-danger"
                      value={newFormData.min_alert}
                      onChange={(e) => setNewFormData({...newFormData, min_alert: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                {/* Sub-units management for NEW product */}
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <label className="text-[10px] font-black uppercase text-gray-800 px-1 flex justify-between items-center">
                    หน่วยย่อยและการแปลงค่า
                    <button 
                      type="button"
                      onClick={() => {
                        const currentSubs = newFormData.sub_units || [];
                        setNewFormData({ ...newFormData, sub_units: [...currentSubs, { name: '', multiplier: 1 }] });
                      }}
                      className="text-admin-blue hover:underline"
                    >
                      + เพิ่มหน่วย
                    </button>
                  </label>
                  
                  <div className="space-y-2">
                    {(newFormData.sub_units || []).map((sub: any, idx: number) => (
                      <div key={idx} className="flex gap-2 items-center">
                         <input 
                           type="text" 
                           placeholder="ชื่อหน่วย (เช่น ม้วนเล็ก 10m)"
                           className="flex-1 border border-gray-200 rounded p-1.5 text-[11px] font-bold outline-none focus:ring-1 focus:ring-admin-blue"
                           value={sub.name}
                           onChange={(e) => {
                             const newSubs = [...newFormData.sub_units];
                             newSubs[idx].name = e.target.value;
                             setNewFormData({ ...newFormData, sub_units: newSubs });
                           }}
                         />
                         <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-400">x</span>
                            <input 
                              type="number" 
                              placeholder="ตัวคูณ"
                              className="w-16 border border-gray-200 rounded p-1.5 text-[11px] font-bold outline-none focus:ring-1 focus:ring-admin-blue"
                              value={sub.multiplier}
                              onChange={(e) => {
                                const newSubs = [...newFormData.sub_units];
                                newSubs[idx].multiplier = parseFloat(e.target.value);
                                setNewFormData({ ...newFormData, sub_units: newSubs });
                              }}
                            />
                         </div>
                         <button 
                           type="button"
                           onClick={() => {
                             const newSubs = [...newFormData.sub_units];
                             newSubs.splice(idx, 1);
                             setNewFormData({ ...newFormData, sub_units: newSubs });
                           }}
                           className="text-admin-danger"
                         >
                           <X className="w-3.5 h-3.5" />
                         </button>
                      </div>
                    ))}
                    {(newFormData.sub_units || []).length === 0 && (
                      <p className="text-[10px] text-gray-400 italic text-center py-2">ไม่มีการกำหนดหน่วยย่อย</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                   <button 
                    onClick={saveNew}
                    className="flex-1 bg-admin-blue text-white py-2 rounded text-xs font-black uppercase shadow-lg shadow-admin-blue/20"
                   >
                     เพิ่มสินค้า
                   </button>
                   <button 
                    onClick={() => setIsAdding(false)}
                    className="px-6 bg-gray-100 text-gray-500 py-2 rounded text-xs font-black uppercase"
                   >
                     ยกเลิก
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black uppercase tracking-widest text-gray-800">🛠 แก้ไขข้อมูลสินค้า</h3>
                <button onClick={() => setEditingProduct(null)}><X className="w-5 h-5 text-gray-400" /></button>
             </div>
             <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[10px] font-black uppercase text-gray-400 px-1">ชื่อสินค้า</label>
                   <input 
                     type="text" 
                     className="w-full border border-gray-200 rounded p-2 text-xs font-bold outline-none focus:ring-1 focus:ring-admin-blue"
                     value={editFormData?.name}
                     onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                   />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 px-1">หมวดหมู่</label>
                    <input 
                      type="text" 
                      className="w-full border border-gray-200 rounded p-2 text-xs font-bold outline-none focus:ring-1 focus:ring-admin-blue"
                      value={editFormData?.category}
                      onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 px-1">หน่วยนับ</label>
                    <input 
                      type="text" 
                      className="w-full border border-gray-200 rounded p-2 text-xs font-bold outline-none focus:ring-1 focus:ring-admin-blue"
                      value={editFormData?.unit}
                      onChange={(e) => setEditFormData({...editFormData, unit: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 px-1">ราคาต้นทุน (฿)</label>
                    <input 
                      type="number" 
                      className="w-full border border-gray-200 rounded p-2 text-xs font-bold outline-none focus:ring-1 focus:ring-admin-blue"
                      value={editFormData?.cost_price}
                      onChange={(e) => setEditFormData({...editFormData, cost_price: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-gray-400 px-1">จุดสั่งซื้อขั้นต่ำ (Min)</label>
                    <input 
                      type="number" 
                      className="w-full border border-gray-200 rounded p-2 text-xs font-bold outline-none focus:ring-1 focus:ring-admin-blue text-admin-danger"
                      value={editFormData?.min_alert}
                      onChange={(e) => setEditFormData({...editFormData, min_alert: parseFloat(e.target.value)})}
                    />
                  </div>
                </div>

                {/* Sub-units management */}
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <label className="text-[10px] font-black uppercase text-gray-800 px-1 flex justify-between items-center">
                    หน่วยย่อยและการแปลงค่า
                    <button 
                      type="button"
                      onClick={() => {
                        const currentSubs = editFormData?.sub_units;
                        let subsArray = [];
                        if (Array.isArray(currentSubs)) {
                          subsArray = currentSubs;
                        } else if (typeof currentSubs === 'string' && currentSubs.trim() !== '') {
                          try { subsArray = JSON.parse(currentSubs); } catch(e) { subsArray = []; }
                        }
                        setEditFormData({ ...editFormData, sub_units: [...subsArray, { name: '', multiplier: 1 }] });
                      }}
                      className="text-admin-blue hover:underline"
                    >
                      + เพิ่มหน่วย
                    </button>
                  </label>
                  
                  <div className="space-y-2">
                    {(() => {
                      const currentSubs = editFormData?.sub_units;
                      let subsArray = [];
                      if (Array.isArray(currentSubs)) {
                        subsArray = currentSubs;
                      } else if (typeof currentSubs === 'string' && currentSubs.trim() !== '') {
                        try { subsArray = JSON.parse(currentSubs); } catch(e) { subsArray = []; }
                      }
                      
                      return subsArray.map((sub: any, idx: number) => (
                        <div key={idx} className="flex gap-2 items-center">
                           <input 
                             type="text" 
                             placeholder="ชื่อหน่วย (เช่น ขวด 1.5L)"
                             className="flex-1 border border-gray-200 rounded p-1.5 text-[11px] font-bold outline-none focus:ring-1 focus:ring-admin-blue"
                             value={sub.name}
                             onChange={(e) => {
                               const newSubs = [...subsArray];
                               newSubs[idx].name = e.target.value;
                               setEditFormData({ ...editFormData, sub_units: newSubs });
                             }}
                           />
                           <div className="flex items-center gap-1">
                              <span className="text-[10px] text-gray-400">x</span>
                              <input 
                                type="number" 
                                placeholder="ตัวคูณ"
                                className="w-16 border border-gray-200 rounded p-1.5 text-[11px] font-bold outline-none focus:ring-1 focus:ring-admin-blue"
                                value={sub.multiplier}
                                onChange={(e) => {
                                  const newSubs = [...subsArray];
                                  newSubs[idx].multiplier = parseFloat(e.target.value);
                                  setEditFormData({ ...editFormData, sub_units: newSubs });
                                }}
                              />
                           </div>
                           <button 
                             type="button"
                             onClick={() => {
                               const newSubs = [...subsArray];
                               newSubs.splice(idx, 1);
                               setEditFormData({ ...editFormData, sub_units: newSubs });
                             }}
                             className="text-admin-danger"
                           >
                             <X className="w-3.5 h-3.5" />
                           </button>
                        </div>
                      ));
                    })()}
                    {(() => {
                      const currentSubs = editFormData?.sub_units;
                      let subsArray = [];
                      if (Array.isArray(currentSubs)) {
                        subsArray = currentSubs;
                      } else if (typeof currentSubs === 'string' && currentSubs.trim() !== '') {
                        try { subsArray = JSON.parse(currentSubs); } catch(e) { subsArray = []; }
                      }
                      if (subsArray.length === 0) {
                        return <p className="text-[10px] text-gray-400 italic text-center py-2">ไม่มีการกำหนดหน่วยย่อย</p>;
                      }
                      return null;
                    })()}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                   <button 
                    onClick={saveEdit}
                    className="flex-1 bg-admin-blue text-white py-2 rounded text-xs font-black uppercase shadow-lg shadow-admin-blue/20"
                   >
                     บันทึกการแก้ไข
                   </button>
                   <button 
                    onClick={() => setEditingProduct(null)}
                    className="px-6 bg-gray-100 text-gray-500 py-2 rounded text-xs font-black uppercase"
                   >
                     ยกเลิก
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {selectedQR && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl relative"
          >
            <button 
              onClick={() => setSelectedQR(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h3 className="font-bold text-lg mb-1 uppercase">{selectedQR.name}</h3>
              <p className="text-xs text-slate-400 mb-6 uppercase tracking-widest font-semibold">พิมพ์เพื่อนำไปติดที่ชั้นวางสินค้า</p>
              
              <div className="bg-white border-2 border-slate-100 p-4 rounded-3xl inline-block mb-6 shadow-sm">
                <img src={selectedQR.url} alt="QR Code" className="w-48 h-48 mx-auto" />
              </div>

              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                <Printer className="w-5 h-5" />
                <span>พิมพ์ QR Code</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
