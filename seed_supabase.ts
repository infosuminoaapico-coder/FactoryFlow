import { supabase } from './src/lib/supabase.js';

async function seed() {
  console.log('--- Starting Seed Process ---');

  // 1. Seed Users
  console.log('Seeding Users...');
  const { data: users, error: userError } = await supabase.from('users').upsert([
    { username: 'admin', password: '123456', name: 'ผู้ดูแลระบบ', role: 'admin' },
    { username: 'staff1', password: '123456', name: 'นายช่าง สมชาย', role: 'staff' },
    { username: 'staff2', password: '123456', name: 'นายดาวเหนือ', role: 'staff' }
  ], { onConflict: 'username' }).select();

  if (userError) {
    console.error('Users error (Check if table exists and RLS allows insert):', userError);
  } else {
    console.log(`Seeded ${users?.length || 0} users.`);
  }

  const adminId = users?.find(u => u.username === 'admin')?.id;
  const staffId = users?.find(u => u.username === 'staff1')?.id;

  // 2. Seed Projects
  console.log('Seeding Projects...');
  const { data: projects, error: projectError } = await supabase.from('projects').upsert([
    { name: 'ตกแต่งภายใน คอนโด A', customer: 'คุณวิชัย', start_date: '2026-05-01', end_date: '2026-06-15', status: 'in-progress', budget: 500000 },
    { name: 'รีโนเวท บ้านจัดสรร B', customer: 'คุณสมศรี', start_date: '2026-05-10', end_date: '2026-07-20', status: 'in-progress', budget: 1200000 },
    { name: 'บูธงานแสดงสินค้า IT', customer: 'บริษัท เทคโซน', start_date: '2026-05-20', end_date: '2026-05-25', status: 'in-progress', budget: 150000 },
    { name: 'ทำเฟอร์นิเจอร์สำนักงาน C', customer: 'บจก. ร่ำรวย', start_date: '2026-04-15', end_date: '2026-05-30', status: 'completed', budget: 350000 },
    { name: 'ติดตั้งระแนงไม้ ร้านกาแฟ', customer: 'Cafe Hopping', start_date: '2026-06-01', end_date: '2026-06-10', status: 'in-progress', budget: 85000 },
    { name: 'ปรับปรุงทางเดิน สวนสาธารณะ', customer: 'เทศบาลเมือง', start_date: '2026-07-01', end_date: '2026-08-30', status: 'in-progress', budget: 2500000 }
  ], { onConflict: 'name' }).select(); // Assuming name is unique for seeding purposes

  if (projectError) {
    console.error('Projects error:', projectError);
  } else {
    console.log(`Seeded ${projects?.length || 0} projects.`);
  }

  // 3. Seed Products
  console.log('Seeding Products...');
  const { data: products, error: productError } = await supabase.from('products').upsert([
    { name: 'ไม้สนนิวซีแลนด์ 1x4', category: 'ไม้โครง', cost_price: 150, min_alert: 20, unit: 'แผ่น', stock_qty: 100, qr_code: 'WOOD-001' },
    { name: 'กาวลาเท็กซ์ TOA', category: 'วัสดุประสาน', cost_price: 85, min_alert: 10, unit: 'กระป๋อง', stock_qty: 50, qr_code: 'GLUE-001' },
    { name: 'ตะปูลม F30', category: 'วัสดุสิ้นเปลือง', cost_price: 120, min_alert: 5, unit: 'กล่อง', stock_qty: 30, qr_code: 'NAIL-001' },
    { name: 'แลคเกอร์เงา TOA', category: 'สีและเคมี', cost_price: 450, min_alert: 5, unit: 'แกลลอน', stock_qty: 15, qr_code: 'PAINT-001' },
    { name: 'ไม้อัดยาง 4มม.', category: 'แผ่นไม้', cost_price: 320, min_alert: 15, unit: 'แผ่น', stock_qty: 40, qr_code: 'PLY-001' },
    { name: 'ไม้อัดยาง 10มม.', category: 'แผ่นไม้', cost_price: 580, min_alert: 10, unit: 'แผ่น', stock_qty: 25, qr_code: 'PLY-002' },
    { name: 'สว่านไร้สาย Makita', category: 'เครื่องมือ', cost_price: 3500, min_alert: 2, unit: 'ตัว', stock_qty: 5, qr_code: 'TOOL-001' },
    { name: 'กระดาษทราย #180', category: 'วัสดุสิ้นเปลือง', cost_price: 15, min_alert: 50, unit: 'แผ่น', stock_qty: 200, qr_code: 'SAND-180' },
    { name: 'ทินเนอร์ AAA', category: 'สีและเคมี', cost_price: 180, min_alert: 10, unit: 'ปี๊บ', stock_qty: 12, qr_code: 'THIN-001' },
    { name: 'บานพับถ้วย Hafele', category: 'อุปกรณ์เฟอร์นิเจอร์', cost_price: 45, min_alert: 40, unit: 'คู่', stock_qty: 80, qr_code: 'HINGE-001' },
    { name: 'รางลิ้นชัก 14นิ้ว', category: 'อุปกรณ์เฟอร์นิเจอร์', cost_price: 120, min_alert: 20, unit: 'ชุด', stock_qty: 30, qr_code: 'DRAWER-001' },
    { name: 'มือจับอลูมิเนียม', category: 'อุปกรณ์เฟอร์นิเจอร์', cost_price: 65, min_alert: 50, unit: 'อัน', stock_qty: 120, qr_code: 'HANDLE-001' }
  ], { onConflict: 'qr_code' }).select();

  if (productError) {
    console.error('Products error:', productError);
  } else {
    console.log(`Seeded ${products?.length || 0} products.`);
  }

  // 4. Seed Transactions
  if (products && projects && users && products.length > 0 && projects.length > 0) {
    console.log('Seeding Transactions...');
    const transactions = [];
    const now = new Date();
    
    for (let i = 0; i < 20; i++) {
        const prod = products[Math.floor(Math.random() * products.length)];
        const proj = projects[Math.floor(Math.random() * projects.length)];
        const isIssue = Math.random() > 0.3;
        const type = isIssue ? 'ISSUE' : 'RECEIVE';
        const qty = Math.floor(Math.random() * 5) + 1;
        const price = prod.cost_price * qty;
        
        const date = new Date(now.getTime() - (Math.random() * 10 * 24 * 60 * 60 * 1000));
        const datetime = date.toISOString().replace('T', ' ').substring(0, 19);

        transactions.push({
            type,
            product_id: prod.id,
            project_id: isIssue ? proj.id : null,
            user_id: staffId || adminId,
            qty,
            selected_unit: prod.unit,
            selected_qty: qty,
            unit_price: prod.cost_price,
            total_price: price,
            requester_name: isIssue ? 'ช่างหน้างาน ' + (i + 1) : null,
            vendor_name: !isIssue ? 'ร้านวัสดุก่อสร้าง ' + (i + 1) : null,
            status: 'APPROVED',
            datetime,
            note: isIssue ? 'เบิกไปใช้ที่ ' + proj.name : 'รับเข้าของใหม่'
        });
    }

    const { error: txError } = await supabase.from('stock_transactions').insert(transactions);
    if (txError) {
      console.error('Transactions error:', txError);
    } else {
      console.log(`Seeded 20 transactions.`);
    }
  } else {
    console.log('Skipping transactions due to missing prerequisite data.');
  }

  console.log('--- Seed Process Completed ---');
}

seed();
