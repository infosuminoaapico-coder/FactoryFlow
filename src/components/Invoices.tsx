import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  Printer, 
  Trash2, 
  Download,
  Calendar,
  User,
  Package,
  ChevronRight,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../types';

interface InvoiceItem {
  product_id: string;
  name: string;
  qty: number;
  unit: string;
  price: number;
  total: number;
}

interface Invoice {
  id: string;
  invoice_no: string;
  customer_name: string;
  customer_address: string;
  date: string;
  items: InvoiceItem[];
  subtotal: number;
  vat: number;
  grand_total: number;
  status: 'PENDING' | 'PAID' | 'CANCELLED';
  type: 'RECEIPT' | 'DELIVERY';
}

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // New Invoice State
  const [newInvoice, setNewInvoice] = useState<Partial<Invoice>>({
    invoice_no: `INV-${Date.now().toString().slice(-6)}`,
    customer_name: '',
    customer_address: '',
    date: new Date().toISOString().split('T')[0],
    items: [],
    status: 'PENDING',
    type: 'DELIVERY'
  });

  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [itemQty, setItemQty] = useState(1);
  const [itemPrice, setItemPrice] = useState(0);

  useEffect(() => {
    // Mock fetch for now, can be connected to Supabase later
    try {
      const saved = localStorage.getItem('app_invoices');
      if (saved) setInvoices(JSON.parse(saved));
    } catch (e) {
      console.error('Failed to parse saved invoices', e);
    }

    fetch('/api/products')
      .then(res => res.ok ? res.json() : [])
      .then(data => setProducts(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error('Failed to fetch products for invoices', err);
        setProducts([]);
      });
  }, []);

  const saveInvoice = () => {
    if (!newInvoice.customer_name || (newInvoice.items?.length || 0) === 0) {
      alert('กรุณากรอกชื่อลูกค้าและเพิ่มรายการสินค้า');
      return;
    }

    const subtotal = newInvoice.items?.reduce((sum, item) => sum + item.total, 0) || 0;
    const vat = subtotal * 0.07;
    const grand_total = subtotal + vat;

    const fullInvoice: Invoice = {
      ...(newInvoice as Invoice),
      id: Date.now().toString(),
      subtotal,
      vat,
      grand_total
    };

    const updated = [fullInvoice, ...invoices];
    setInvoices(updated);
    localStorage.setItem('app_invoices', JSON.stringify(updated));
    setIsModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNewInvoice({
      invoice_no: `INV-${Date.now().toString().slice(-6)}`,
      customer_name: '',
      customer_address: '',
      date: new Date().toISOString().split('T')[0],
      items: [],
      status: 'PENDING',
      type: 'DELIVERY'
    });
  };

  const addItem = () => {
    const prod = (products || []).find(p => String(p.id) === selectedProduct);
    if (!prod) return;

    const newItem: InvoiceItem = {
      product_id: String(prod.id),
      name: prod.name,
      qty: itemQty,
      unit: prod.unit,
      price: itemPrice || prod.cost_price || 0,
      total: (itemPrice || prod.cost_price || 0) * itemQty
    };

    setNewInvoice({
      ...newInvoice,
      items: [...(newInvoice.items || []), newItem]
    });
    setSelectedProduct('');
    setItemQty(1);
    setItemPrice(0);
  };

  const removeItem = (index: number) => {
    const items = [...(newInvoice.items || [])];
    items.splice(index, 1);
    setNewInvoice({ ...newInvoice, items });
  };

  const printInvoice = (inv: Invoice) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const itemsHtml = inv.items.map((item, idx) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${item.name}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.qty.toLocaleString()}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${item.unit}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>${inv.type === 'RECEIPT' ? 'ใบเสร็จรับเงิน' : 'ใบส่งของ'} - ${inv.invoice_no}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;700&display=swap');
            body { font-family: 'Sarabun', sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .company-info h1 { margin: 0; font-size: 24px; color: #1e3a8a; }
            .company-info p { margin: 4px 0; font-size: 14px; }
            .invoice-title { text-align: right; }
            .invoice-title h2 { margin: 0; color: #1e3a8a; }
            .details { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .details div { width: 48%; }
            .details h4 { margin-bottom: 8px; border-bottom: 1px solid #ddd; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #f8fafc; border: 1px solid #ddd; padding: 10px; font-size: 14px; }
            .totals { display: flex; flex-direction: column; align-items: flex-end; }
            .total-row { display: flex; width: 300px; justify-content: space-between; padding: 5px 0; }
            .grand-total { border-top: 2px solid #333; margin-top: 10px; font-weight: bold; font-size: 18px; color: #1e3a8a; }
            .footer { margin-top: 60px; display: flex; justify-content: space-around; }
            .sign-box { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 10px; font-size: 14px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="company-info">
              <h1>บริษัท แรบบิทเฟอร์นิเจอร์ จำกัด (สำนักงานใหญ่)</h1>
              <p>เลขที่ 2 ซอยนนทบุรี 8 แยก 6 ต.บางกระสอ อ.เมืองนนทบุรี จ.นนทบุรี 11000</p>
              <p>เลขประจำตัวผู้เสียภาษี 0125560019967</p>
              <p>โทร: 02-XXX-XXXX</p>
            </div>
            <div class="invoice-title">
              <h2>${inv.type === 'RECEIPT' ? 'ใบเสร็จรับเงิน' : 'ใบส่งของ / ใบกำกับภาษี'}</h2>
              <p>เลขที่เอกสาร: <strong>${inv.invoice_no}</strong></p>
              <p>วันที่: ${new Date(inv.date).toLocaleDateString('th-TH')}</p>
            </div>
          </div>

          <div class="details">
            <div>
              <h4>ข้อมูลลูกค้า</h4>
              <p><strong>ชื่อ:</strong> ${inv.customer_name}</p>
              <p><strong>ที่อยู่:</strong> ${inv.customer_address || '-'}</p>
            </div>
            <div>
              <h4>ข้อมูลผู้ขาย</h4>
              <p>บริษัท แรบบิทเฟอร์นิเจอร์ จำกัด</p>
              <p>คลังสินค้าหลัก</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th width="50">ลำดับ</th>
                <th>รายการสินค้า</th>
                <th width="80">จำนวน</th>
                <th width="80">หน่วย</th>
                <th width="120">ราคา/หน่วย</th>
                <th width="120">ยอดรวม</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>รวมเงินสุทธิ (Subtotal):</span>
              <span>${inv.subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="total-row">
              <span>ภาษีมูลค่าเพิ่ม (VAT 7%):</span>
              <span>${inv.vat.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div class="total-row grand-total">
              <span>จำนวนเงินทั้งสิ้น:</span>
              <span>${inv.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          </div>

          <div class="footer">
            <div class="sign-box">
              <br/><br/>
              _______________________<br/>
              ผู้รับสินค้า
            </div>
            <div class="sign-box">
              <br/><br/>
              _______________________<br/>
              ผู้ส่งสินค้า / ผู้รับเงิน
            </div>
          </div>
          
          <script>
            window.print();
            // window.close();
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const deleteInvoice = (id: string) => {
    if (!confirm('ยืนยันการลบเอกสารนี้?')) return;
    const updated = invoices.filter(inv => inv.id !== id);
    setInvoices(updated);
    localStorage.setItem('app_invoices', JSON.stringify(updated));
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 border-l-4 border-admin-blue pl-4">ระบบใบสำคัญ (Bills & Invoices)</h1>
          <p className="text-sm text-gray-500 mt-1">จัดการใบส่งของและใบเสร็จรับเงิน A4</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-admin-blue text-white rounded-lg text-sm font-bold shadow-lg shadow-admin-blue/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus className="w-4 h-4" /> สร้างใบสำคัญใหม่
        </button>
      </div>

      {/* States */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">ทั้งหมด</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{invoices.length} <span className="text-sm font-normal text-gray-400">ใบ</span></p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">รอชำระเงิน</p>
          <p className="text-2xl font-black text-gray-900 mt-1">{invoices.filter(i => i.status === 'PENDING').length} <span className="text-sm font-normal text-gray-400">ใบ</span></p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <p className="text-[10px] font-bold text-green-500 uppercase tracking-wider">ยอดรวมรายได้</p>
          <p className="text-2xl font-black text-gray-900 mt-1">฿{invoices.reduce((sum, i) => sum + i.grand_total, 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="ค้นหาตามชื่อลูกค้า หรือ เลขที่ใบสำคัญ..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-lg text-sm focus:ring-2 focus:ring-admin-blue/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">เลขที่ / วันที่</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">ลูกค้า</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">ยอดรวม</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">สถานะ</th>
                <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices
                .filter(inv => 
                  (inv.customer_name || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                  (inv.invoice_no || '').toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((inv) => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-gray-900">{inv.invoice_no}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{inv.date}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-medium text-gray-700">{inv.customer_name}</p>
                    <p className="text-[10px] text-gray-400 truncate max-w-[200px]">{inv.customer_address}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs font-bold text-admin-blue">฿{inv.grand_total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                    <p className="text-[10px] text-gray-400">{inv.items.length} รายการ</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      inv.status === 'PAID' ? 'bg-green-100 text-green-600' : 
                      inv.status === 'CANCELLED' ? 'bg-red-100 text-red-600' : 
                      'bg-orange-100 text-orange-600'
                    }`}>
                      {inv.status === 'PAID' ? 'ชำระแล้ว' : inv.status === 'CANCELLED' ? 'ยกเลิก' : 'รอชำระ'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                       <button 
                        onClick={() => printInvoice(inv)}
                        className="p-1.5 text-gray-400 hover:text-admin-blue hover:bg-admin-blue/10 rounded-lg transition-colors"
                        title="พิมพ์เอกสาร A4"
                       >
                        <Printer className="w-4 h-4" />
                       </button>
                       <button 
                        onClick={() => deleteInvoice(inv.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                       >
                        <Trash2 className="w-4 h-4" />
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                 <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 italic text-sm">
                    ยังไม่มีข้อมูลใบสำคัญ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Invoice Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
            >
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-admin-blue" />
                  สร้างใบสำคัญใหม่ (Bill Creation)
                </h2>
                <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-200 rounded-full">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Basic Info */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">ข้อมูลเอกสาร</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">เลขที่ใบสำคัญ</label>
                      <input 
                        className="w-full border border-gray-200 rounded-lg p-2 text-sm font-bold focus:ring-1 focus:ring-admin-blue outline-none"
                        value={newInvoice.invoice_no}
                        onChange={(e) => setNewInvoice({ ...newInvoice, invoice_no: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">วันที่</label>
                      <input 
                        type="date"
                        className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-admin-blue outline-none"
                        value={newInvoice.date}
                        onChange={(e) => setNewInvoice({ ...newInvoice, date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">ประเภทเอกสาร</label>
                    <select 
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-admin-blue outline-none"
                      value={newInvoice.type || ''}
                      onChange={(e) => setNewInvoice({ ...newInvoice, type: e.target.value as any })}
                    >
                      <option value="DELIVERY">ใบส่งของ (Delivery Note)</option>
                      <option value="RECEIPT">ใบเสร็จรับเงิน (Receipt)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">ชื่อลูกค้า</label>
                    <input 
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-admin-blue outline-none"
                      placeholder="ระบุชื่อลูกค้า..."
                      value={newInvoice.customer_name}
                      onChange={(e) => setNewInvoice({ ...newInvoice, customer_name: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">ที่อยู่ลูกค้า</label>
                    <textarea 
                      className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-admin-blue outline-none h-20"
                      placeholder="ระบุที่อยู่จัดส่ง..."
                      value={newInvoice.customer_address}
                      onChange={(e) => setNewInvoice({ ...newInvoice, customer_address: e.target.value })}
                    />
                  </div>
                </div>

                {/* Items Selection */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-2">รายการสินค้า</h3>
                  
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 mb-1">เลือกสินค้าจากสต๊อก</label>
                      <select 
                        className="w-full border border-gray-200 rounded-lg p-2 text-xs focus:ring-1 focus:ring-admin-blue outline-none"
                        value={selectedProduct || ''}
                        onChange={(e) => {
                          const pId = e.target.value;
                          setSelectedProduct(pId);
                          const p = products.find(x => x.id === pId);
                          if (p) setItemPrice(p.cost_price || 0);
                        }}
                      >
                        <option value="">-- เลือกรายการสินค้า --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (สต๊อก: {p.stock_qty})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">จำนวน</label>
                        <input 
                          type="number"
                          className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-admin-blue outline-none"
                          value={itemQty}
                          onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-1">ราคา/หน่วย</label>
                        <input 
                          type="number"
                          className="w-full border border-gray-200 rounded-lg p-2 text-sm focus:ring-1 focus:ring-admin-blue outline-none"
                          value={itemPrice}
                          onChange={(e) => setItemPrice(parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>

                    <button 
                      onClick={addItem}
                      disabled={!selectedProduct}
                      className="w-full flex items-center justify-center gap-2 py-2 bg-admin-blue text-white rounded-lg text-xs font-bold hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Plus className="w-3 h-3" /> เพิ่มเข้าใบสำคัญ
                    </button>
                  </div>

                  {/* Added Items List */}
                  <div className="border border-gray-100 rounded-xl max-h-[200px] overflow-y-auto">
                    {newInvoice.items?.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-gray-800 truncate">{item.name}</p>
                          <p className="text-[10px] text-gray-400">{item.qty} {item.unit} x ฿{item.price.toLocaleString()} = <span className="text-admin-blue">฿{item.total.toLocaleString()}</span></p>
                        </div>
                        <button 
                          onClick={() => removeItem(idx)}
                          className="p-1 text-gray-300 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    {(newInvoice.items?.length || 0) === 0 && (
                      <p className="p-8 text-center text-gray-300 italic text-[10px]">ยังไม่มีรายการสินค้า</p>
                    )}
                  </div>

                  <div className="pt-2">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>ยอดรวมสินค้า (Subtotal):</span>
                      <span className="font-bold">฿{(newInvoice.items?.reduce((sum, i) => sum + i.total, 0) || 0).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-bold text-admin-blue mt-2 pt-2 border-t border-gray-100">
                      <span>จำนวนเงินทั้งสิ้น (+VAT 7%):</span>
                      <span>฿{((newInvoice.items?.reduce((sum, i) => sum + i.total, 0) || 0) * 1.07).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded-lg transition-all"
                >
                  ยกเลิก
                </button>
                <button 
                  onClick={saveInvoice}
                  className="px-6 py-2 bg-admin-blue text-white rounded-lg text-xs font-bold shadow-lg shadow-admin-blue/20 hover:bg-blue-700"
                >
                  บันทึกใบสำคัญ
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
