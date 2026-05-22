
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

async function seedData() {
  console.log('--- Starting Data Import ---');

  // ข้อมูลวัสดุสิ้นเปลือง (General Supplies) - เพิ่มเติม
  const generalSupplies = [
    { code: 'TOA HP', desc: 'ซิลิโคน สีใส', onHand: 21, unit: 'หลอด', issues: { 5: 12, 6: 24, 7: 17, 8: 12, 9: 5, 10: 6, 12: 15, 13: 4, 14: 9, 15: 7, 16: 8, 19: 13, 20: 13, 22: 8 } },
    { code: 'TOA GP', desc: 'ซิลิโคน สีขาว', onHand: 14, unit: 'หลอด', issues: { 5: 1, 21: 1 } },
    { code: 'SISTA', desc: 'แดป สีโอ๊ค', onHand: 9, unit: 'หลอด', issues: { 15: 1, 18: 1 } },
    { code: 'ALFA', desc: 'แดป น้ำตาล', onHand: 8, unit: 'หลอด', issues: { 15: 4 } },
    { code: 'PRO-GAPS', desc: 'แดป เทา', onHand: 18, unit: 'หลอด', issues: { 12: 3, 13: 2 } },
    { code: 'TEMFLEX', desc: 'เทปพันสายไฟสีดำ', onHand: 16, unit: 'ม้วน', receive: 40, issues: { 5: 2, 7: 3, 12: 4, 13: 4, 15: 7, 18: 1, 21: 5 } },
    { code: 'R-105L', desc: 'ใบคัทเตอร์', onHand: 420, unit: 'ใบ', issues: { 5: 12, 6: 6, 10: 3, 12: 15, 14: 6, 18: 18, 19: 6, 21: 6 } },
    { code: 'INTER 1', desc: 'กระดาษกาวย่น 2 นิ้ว', onHand: 139, unit: 'ม้วน', issues: { 5: 10, 7: 1, 12: 1, 14: 1, 16: 3, 19: 20, 20: 3, 22: 5 } },
    { code: 'BOND-TECH', desc: 'กาวร้อน', onHand: 136, unit: 'ขวด', receive: 100, issues: { 5: 3, 6: 2, 7: 1, 10: 3, 12: 1, 13: 6, 14: 5, 15: 1, 19: 9, 20: 1, 21: 1 } }
  ];

  // ข้อมูลกลุ่มไม้ (Wood Materials) - เพิ่มเติม
  const woodMaterials = [
    { code: '3309-061', desc: 'ไม้ MDF 6 มิล4*8 น้ำตาลเข้ม 3309 เบอร์ 1', onHand: 44, unit: 'แผ่น', issues: {} },
    { code: '3309-062', desc: 'ไม้ MDF 16 มิล4*8 น้ำตาลเข้ม 3309 เบอร์ 1', onHand: 16, unit: 'แผ่น', issues: { 1: 15 } },
    { code: '3309-063', desc: 'ไม้ MDF 25 มิล4*8 น้ำตาลเข้ม 3309 เบอร์ 1', onHand: 13, unit: 'แผ่น', issues: { 1: 13 } },
    { code: '1169-021', desc: 'ไม้ MDF 6 มิล4*8 โอ๊คขาวใหม่ 1169 เบอร์ 2', onHand: 0, unit: 'แผ่น', receive: 25, issues: { 1: 22, 28: 1, 29: 1, 30: 1 } },
    { code: '1169-022', desc: 'ไม้ MDF 16 มิล4*8 โอ๊คขาวใหม่ 1169 เบอร์ 2', onHand: 7, unit: 'แผ่น', receive: 43, issues: { 1: 39, 28: 3, 29: 5, 30: 3 } },
    { code: '101-012', desc: 'ไม้ MDF 16 มิล4*8 ขาว101 เบอร์ 6', onHand: 42, unit: 'แผ่น', receive: 10, issues: { 1: 37, 6: 4, 15: 1, 24: 8, 25: 2 } },
    { code: '101-014', desc: 'ไม้ HMR 18 มิล4*8 ขาว101 เบอร์ 6', onHand: 38, unit: 'แผ่น', receive: 33, issues: { 1: 62, 5: 1, 6: 1, 21: 7 } },
    { code: '3258-102', desc: 'ไม้ MDF 16 มิล4*8 เทาอ่อน 3258 เบอร์ 10', onHand: 20, unit: 'แผ่น', receive: 12, issues: { 1: 23, 10: 4, 15: 1, 16: 3 } },
    { code: 'ES4004-11-16', desc: 'ไม้ MDF 16 มิล4*8 ES4004-11', onHand: 70, unit: 'แผ่น', receive: 15, issues: { 5: 4, 6: 4, 7: 14, 8: 4, 13: 4, 15: 4, 16: 4, 17: 4, 19: 5, 20: 14, 25: 1, 27: 4, 31: 4 } },
    { code: 'ES4004-11-25', desc: 'ไม้ MDF 25 มิล4*8 ES4004-11', onHand: 43, unit: 'แผ่น', issues: { 1: 17, 5: 14, 11: 1, 13: 1, 15: 1, 19: 1, 20: 1, 23: 7 } }
  ];

  // เพิ่มข้อมูลวัสดุสิ้นเปลืองอื่นๆ
  const otherSupplies = [
    { code: 'SONAX', desc: 'SONAX', onHand: 4, unit: 'กระป๋อง', receive: 5, issues: { 15: 1 } },
    { code: 'LAT', desc: 'เทปใส', onHand: 511, unit: 'ม้วน', issues: { 5: 2, 12: 4, 15: 2, 16: 2 } },
    { code: 'KLH-5A', desc: 'หม้อแปลง 5A', onHand: 6, unit: 'อัน', receive: 6, issues: { 5: 3, 7: 3, 8: 1, 9: 1, 12: 3, 18: 1, 21: 8, 22: 1 } },
    { code: 'A-85802', desc: 'ใบจิ๊กซอ', onHand: 15, unit: 'ใบ', receive: 23, issues: { 10: 5, 15: 5 } }
  ];

  const allItems = [
    ...generalSupplies.map(i => ({ ...i, category: 'GENERAL' })),
    ...woodMaterials.map(i => ({ ...i, category: 'WOOD' })),
    ...otherSupplies.map(i => ({ ...i, category: 'ELECTRICAL' }))
  ];

  for (const item of allItems) {
    // 1. Upsert Product
    const { data: p, error: pErr } = await supabase
      .from('products')
      .upsert({
        name: item.desc,
        qr_code: item.code,
        stock_qty: item.onHand,
        unit: item.unit,
        category: 'GENERAL',
        cost_price: 0
      }, { onConflict: 'name' })
      .select()
      .single();

    if (pErr) {
      console.error(`Error upserting ${item.desc}:`, pErr.message);
      continue;
    }

    // 2. Insert Receipts (ถ้ามี)
    if (item.receive && item.receive > 0) {
      await supabase.from('stock_transactions').insert([{
        type: 'RECEIVE',
        product_id: p.id,
        qty: item.receive,
        selected_qty: item.receive,
        selected_unit: item.unit,
        unit_price: 0,
        total_price: 0,
        status: 'APPROVED',
        datetime: '2026-01-01 08:00:00',
        requester_name: 'SYSTEM IMPORT'
      }]);
    }

    // 3. Insert Issues (รายวัน)
    for (const [day, qty] of Object.entries(item.issues)) {
      const dateStr = `2026-01-${day.padStart(2, '0')} 10:00:00`;
      await supabase.from('stock_transactions').insert([{
        type: 'ISSUE',
        product_id: p.id,
        qty: qty,
        selected_qty: qty,
        selected_unit: item.unit,
        unit_price: 0,
        total_price: 0,
        status: 'APPROVED',
        datetime: dateStr,
        requester_name: 'SYSTEM IMPORT'
      }]);
    }
  }

  console.log('--- Data Import Completed ---');
}

seedData();
