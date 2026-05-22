import dotenv from "dotenv";
dotenv.config({ override: true });

import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { supabase } from "./src/lib/supabase.ts";
import QRCode from "qrcode";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Supabase Connection Log (Server-side)
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://glkuxiseyxvwtduydxkp.supabase.co';
console.log(`[Supabase] Initializing connection to: ${supabaseUrl.substring(0, 20)}...`);

// API Routes
app.get("/api/health", (req, res) => res.json({ status: "ok", timestamp: new Date() }));

// Helper to update stock (Try RPC first, fallback to direct update)
async function updateStockAtomic(product_id: number, stockUpdate: number) {
  const { error: rpcError } = await supabase.rpc("increment_stock", { p_id: product_id, p_qty: stockUpdate });
  
  if (rpcError) {
    // Silence common errors where we have a working fallback
    const isSilenced = 
      rpcError.message?.toLowerCase().includes("not found") || 
      rpcError.message?.toLowerCase().includes("best candidate") || // Ambiguity error
      rpcError.code === 'P0001' || // Custom raiserror
      rpcError.code === '42883' || // Undefined function
      rpcError.code === '42725';   // Ambiguous function
    
    if (!isSilenced) {
      console.warn(`[Supabase] RPC increment_stock failed for product ${product_id}:`, rpcError.message);
    }
    
    // Fallback: Fetch current stock and update manually
    const { data: p, error: fetchErr } = await supabase
      .from('products')
      .select('stock_qty')
      .eq('id', product_id)
      .single();
    
    if (fetchErr) {
      console.error(`[Supabase] Fallback fetch failed for product ${product_id}:`, fetchErr);
      return;
    }
    
    if (p) {
      const newQty = (Number(p.stock_qty) || 0) + stockUpdate;
      const { error: updateErr } = await supabase
        .from('products')
        .update({ stock_qty: newQty })
        .eq('id', product_id);
      
      if (updateErr) {
        console.error(`[Supabase] Fallback update failed for product ${product_id}:`, updateErr);
      } else {
        console.log(`[Supabase] Successfully updated stock via fallback for product ${product_id} (+${stockUpdate} -> ${newQty})`);
      }
    }
  }
}

// Auth
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    // 1. Hardcoded Admin
    if (username === 'admin' && password === '123456') {
      return res.json({ 
        id: 1, 
        name: 'ผู้ดูแลระบบ (Admin)', 
        username: 'admin', 
        role: 'admin' 
      });
    }

    // 2. Hardcoded Staff members
    const staffMembers = ['staff1', 'staff2', 'staff3', 'staff4', 'staff5'];
    if (staffMembers.includes(username) && password === '123456') {
      return res.json({ 
        id: 100 + staffMembers.indexOf(username), 
        name: `ผู้ใช้งาน (${username})`, 
        username: username, 
        role: 'staff' 
      });
    }

    // 3. Optional: DB lookup for other users
    const { data: user } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .eq("password", password)
      .single();

    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      return res.json(userWithoutPassword);
    }

    res.status(401).json({ message: "Username หรือ Password ไม่ถูกต้อง" });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Products
app.get("/api/products", async (req, res) => {
  try {
    const { data: products, error } = await supabase.from("products").select("*").order("name", { ascending: true });
    if (error) {
      console.error('Error fetching products:', error);
      return res.status(500).json({ message: "Error fetching data from Supabase", detail: error.message });
    }
    res.json(products || []);
  } catch (error: any) {
    console.error('API Error /api/products:', error);
    res.status(500).json({ message: error.message });
  }
});

app.get("/api/products/low-stock", async (req, res) => {
  try {
    const { data: products } = await supabase.from("products").select("*");
    const lowStock = products?.filter(p => Number(p.stock_qty) <= Number(p.min_alert));
    res.json(lowStock || []);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/products/bulk", async (req, res) => {
  try {
    const productsData = req.body;
    if (!Array.isArray(productsData)) return res.status(400).json({ error: "Invalid data" });

    // Clean data: Ensure numeric fields are numbers
    const cleaned = productsData.map(p => ({
      ...p,
      stock_qty: Number(p.stock_qty) || 0,
      cost_price: Number(p.cost_price) || 0,
      min_alert: Number(p.min_alert) || 0
    }));

    // 1. Group by QR Code and merge stock
    const groupedMap = new Map();
    const itemsWithoutQR: any[] = [];

    cleaned.forEach(p => {
      const qr = p.qr_code?.trim();
      if (!qr) {
        itemsWithoutQR.push(p);
        return;
      }
      
      if (groupedMap.has(qr)) {
        const existing = groupedMap.get(qr);
        existing.stock_qty += p.stock_qty;
        // Update other fields to latest info from Excel
        existing.name = p.name;
        existing.category = p.category;
        existing.unit = p.unit;
        existing.cost_price = p.cost_price;
        existing.min_alert = p.min_alert;
      } else {
        groupedMap.set(qr, { ...p, qr_code: qr });
      }
    });

    const itemsWithQR = Array.from(groupedMap.values());
    const allToProcess = [...itemsWithQR, ...itemsWithoutQR];

    // 2. Fetch existing products for those with QR codes to additive-update stock
    const qrCodes = itemsWithQR.map(p => p.qr_code);
    let existingMap = new Map();
    
    if (qrCodes.length > 0) {
      // Use case-insensitive search if possible, or at least handle basic trim
      const { data: existingProducts, error: fetchError } = await supabase
        .from("products")
        .select("id, qr_code, stock_qty")
        .in("qr_code", qrCodes);
      
      if (fetchError) {
        console.error('Fetch existing products error:', fetchError);
      } else {
        // Map by QR code to find the ID and current stock
        existingProducts?.forEach(p => {
          if (p.qr_code) existingMap.set(p.qr_code.trim(), p);
        });
      }
    }

    const finalDataWithQR = allToProcess
      .filter(p => p.qr_code?.trim())
      .map(p => {
        const trimmedQR = p.qr_code.trim();
        const existing = existingMap.get(trimmedQR);
        
        return {
          qr_code: trimmedQR,
          name: p.name,
          category: p.category,
          stock_qty: (Number(existing?.stock_qty) || 0) + Number(p.stock_qty),
          unit: p.unit,
          cost_price: Number(p.cost_price),
          min_alert: Number(p.min_alert)
        };
      });

    const finalDataWithoutQR = allToProcess
      .filter(p => !p.qr_code?.trim())
      .map(p => ({
        name: p.name,
        category: p.category,
        stock_qty: Number(p.stock_qty),
        unit: p.unit,
        cost_price: Number(p.cost_price),
        min_alert: Number(p.min_alert)
      }));

    // 3. Perform Upsert for QR items and Insert for non-QR items
    let results: any[] = [];
    
    if (finalDataWithQR.length > 0) {
      const { data, error } = await supabase
        .from("products")
        .upsert(finalDataWithQR, { onConflict: 'qr_code' }) 
        .select();
      
      if (error) {
        console.error('Bulk upsert (QR) error:', JSON.stringify(error));
        return res.status(500).json({ 
          message: "ไม่สามารถนำเข้าข้อมูลสินค้าที่มี QR Code ได้ (ตรวจสอบว่า QR Code ในระบบต้องไม่ซ้ำกัน)", 
          details: error.message || error 
        });
      }
      if (data) results = [...results, ...data];
    }

    if (finalDataWithoutQR.length > 0) {
      const { data, error } = await supabase
        .from("products")
        .insert(finalDataWithoutQR) 
        .select();
      
      if (error) {
        console.error('Bulk insert (non-QR) error:', JSON.stringify(error));
        return res.status(500).json({ 
          message: "ไม่สามารถนำเข้าข้อมูลสินค้าที่ไม่มี QR Code ได้", 
          details: error.message || error 
        });
      }
      if (data) results = [...results, ...data];
    }

    res.json(results);
  } catch (err: any) {
    console.error('Unexpected bulk import error:', err);
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/products/:id/qr", async (req, res) => {
  const { data: product } = await supabase.from("products").select("*").eq("id", req.params.id).single();
  if (!product) return res.status(404).json({ message: "ไม่พบสินค้า" });
  try {
    const qrDataUrl = await QRCode.toDataURL(product.qr_code || product.id);
    res.json({ qrDataUrl });
  } catch (err) {
    res.status(500).json({ message: "Error" });
  }
});

app.put("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, category, cost_price, min_alert, unit, sub_units } = req.body;
  const { error } = await supabase
    .from('products')
    .update({ name, category, cost_price, min_alert, unit, sub_units: sub_units || null })
    .eq('id', id);
  if (error) return res.status(500).json({ message: error.message });
  res.json({ success: true });
});

app.post("/api/products", async (req, res) => {
  try {
    const { qr_code, name, category, stock_qty, unit, cost_price, min_alert, sub_units } = req.body;
    
    // Check if QR code already exists
    if (qr_code) {
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("qr_code", qr_code.trim())
        .single();
        
      if (existing) {
        return res.status(400).json({ message: "รหัสสินค้า (QR Code) นี้มีอยู่ในระบบแล้ว" });
      }
    }

    const { data, error } = await supabase
      .from("products")
      .insert([{
        qr_code: qr_code?.trim() || null,
        name: name?.trim(),
        category: category?.trim() || "GENERAL",
        stock_qty: Number(stock_qty) || 0,
        unit: unit?.trim() || "ชิ้น",
        cost_price: Number(cost_price) || 0,
        min_alert: Number(min_alert) || 5,
        sub_units: sub_units || null
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return res.status(500).json({ message: error.message });
    }

    res.json(data);
  } catch (error: any) {
    console.error('API Error /api/products POST:', error);
    res.status(500).json({ message: error.message });
  }
});

// Vendors
app.get("/api/vendors", async (req, res) => {
  try {
    const { data: txns } = await supabase
      .from("stock_transactions")
      .select("vendor_name")
      .not("vendor_name", "is", null)
      .neq("vendor_name", "");
    
    // Extract unique names
    const vendors = Array.from(new Set((txns || []).map(t => t.vendor_name))).sort();
    res.json(vendors);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

// Projects
app.get("/api/projects", async (req, res) => {
  try {
    const { data: projects } = await supabase.from("projects").select("*").order("id", { ascending: false });
    res.json(projects || []);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/projects", async (req, res) => {
  const { name, customer, start_date, end_date, budget } = req.body;
  const { data, error } = await supabase
    .from("projects")
    .insert([{ name, customer, start_date, end_date, status: "in-progress", budget: budget || 0 }])
    .select()
    .single();
  if (error) return res.status(500).json({ message: error.message });
  res.json({ success: true, id: data.id });
});

app.put("/api/projects/:id", async (req, res) => {
  const { id } = req.params;
  const { name, customer, start_date, end_date, budget, status } = req.body;
  const { error } = await supabase
    .from("projects")
    .update({ name, customer, start_date, end_date, budget, status })
    .eq("id", id);
  if (error) return res.status(500).json({ message: error.message });
  res.json({ success: true });
});

app.delete("/api/projects/:id", async (req, res) => {
  const { id } = req.params;
  
  // 1. Remove material plans first (if any)
  const { error: planError } = await supabase
    .from("project_material_plan")
    .delete()
    .eq("project_id", id);
  
  if (planError) console.error("Error deleting material plan:", planError);

  // 2. We keep transactions but set project_id to NULL so we don't lose history
  // This helps if the foreign key in DB is not SET NULL on delete
  await supabase
    .from("stock_transactions")
    .update({ project_id: null })
    .eq("project_id", id);

  // 3. Delete the project
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id);
    
  if (error) return res.status(500).json({ message: error.message });
  res.json({ success: true });
});

app.get("/api/projects/:id/plan", async (req, res) => {
  const { id } = req.params;
  
  // 1. Get the plan items
  const { data: plan } = await supabase
    .from('project_material_plan')
    .select(`*, products (name, unit, stock_qty)`)
    .eq('project_id', id);
    
  if (!plan) return res.json([]);

  // 2. Get approved issues for this project
  const { data: txns } = await supabase
    .from('stock_transactions')
    .select('product_id, qty')
    .eq('project_id', id)
    .eq('status', 'APPROVED')
    .eq('type', 'ISSUE');

  // 3. Aggregate used quantities
  const usedMap: Record<number, number> = {};
  txns?.forEach(t => {
    usedMap[t.product_id] = (usedMap[t.product_id] || 0) + Number(t.qty);
  });

  // 4. Merge data
  const result = plan.map((item: any) => ({
    ...item,
    product_name: item.products?.name,
    unit: item.products?.unit,
    used_qty: usedMap[item.product_id] || 0
  }));

  res.json(result);
});

app.post("/api/projects/:id/plan", async (req, res) => {
  const { id } = req.params;
  const { product_id, planned_qty } = req.body;
  
  // Update if exists, else insert
  const { data: existing } = await supabase
    .from('project_material_plan')
    .select('id')
    .eq('project_id', id)
    .eq('product_id', product_id)
    .single();

  if (existing) {
    const { error } = await supabase
      .from('project_material_plan')
      .update({ planned_qty })
      .eq('id', existing.id);
    if (error) return res.status(500).json({ message: error.message });
  } else {
    const { error } = await supabase
      .from('project_material_plan')
      .insert([{ project_id: id, product_id, planned_qty }]);
    if (error) return res.status(500).json({ message: error.message });
  }
  
  res.json({ success: true });
});

app.get("/api/projects/:id/summary", async (req, res) => {
  const { data: txns } = await supabase
    .from('stock_transactions')
    .select('qty, total_price')
    .eq('project_id', req.params.id)
    .eq('status', 'APPROVED')
    .eq('type', 'ISSUE');
  
  const total_cost = txns?.reduce((sum, t) => sum + Number(t.total_price), 0) || 0;
  const issue_count = txns?.length || 0;
  res.json({ total_cost, issue_count });
});

app.get("/api/projects/:id/issues", async (req, res) => {
  const { data: issues } = await supabase
    .from('stock_transactions')
    .select(`*, products (name, unit)`)
    .eq('project_id', req.params.id)
    .eq('type', 'ISSUE')
    .order('datetime', { ascending: false });
  
  const flatIssues = issues?.map((i: any) => ({
    ...i,
    product_name: i.products?.name,
    unit: i.products?.unit
  }));
  res.json(flatIssues || []);
});

// Transactions
app.get("/api/transactions", async (req, res) => {
  const { projectId } = req.query;
  let query = supabase.from("stock_transactions").select(`*, products (name, unit), users (name), projects (name)`);
  if (projectId && projectId !== "ALL") query = query.eq("project_id", projectId);
  const { data: transactions } = await query.order("datetime", { ascending: false }).limit(150);
  const flatTx = transactions?.map((st: any) => ({
    ...st,
    product_name: st.products?.name,
    unit: st.products?.unit,
    user_name: st.users?.name,
    project_name: st.projects?.name
  }));
  res.json(flatTx || []);
});

app.get("/api/transactions/pending/count", async (req, res) => {
  try {
    const { count } = await supabase.from('stock_transactions').select('*', { count: 'exact', head: true }).eq('status', 'PENDING');
    res.json({ count: count || 0 });
  } catch (err: any) {
    res.status(500).json({ count: 0, message: err.message });
  }
});

app.post("/api/transactions", async (req, res) => {
  const { type, product_id, selected_qty, selected_unit, multiplier, user_id, project_id, requester_name, vendor_name, note, role } = req.body;
  const qty = Number(selected_qty) * (Number(multiplier) || 1);
  const { data: product } = await supabase.from("products").select("*").eq("id", product_id).single();
  if (!product) return res.status(404).json({ message: "No product" });
  
  const totalPrice = Number(product.cost_price) * qty;
  const datetime = new Date().toLocaleString("sv-SE", { timeZone: "Asia/Bangkok" }).substring(0, 19);
  
  // All withdrawals (ISSUE) must be PENDING regardless of role.
  // Other types (RECEIVE, RETURN, ADJUST) can be APPROVED immediately.
  const status = (type === "ISSUE") ? "PENDING" : "APPROVED";

  // Safely handle user_id. If it's a hardcoded ID (1 or 100-105 from our login logic),
  // we treat it as null in the DB to avoid Foreign Key constraint errors if the users
  // table doesn't have these specific IDs.
  const isHardcodedUser = user_id === 1 || (user_id >= 100 && user_id <= 110);
  const dbUserId = isHardcodedUser ? null : user_id;

  const { data: newTx, error } = await supabase
    .from("stock_transactions")
    .insert([{ 
      type, product_id, qty, selected_unit, selected_qty, 
      unit_price: product.cost_price, total_price: totalPrice, 
      project_id: project_id || null, 
      user_id: dbUserId, 
      requester_name, 
      vendor_name: vendor_name || null,
      status, 
      datetime, note 
    }])
    .select()
    .single();

  if (error) return res.status(500).json({ message: error.message });

  if (status === "APPROVED") {
    let stockUpdate = 0;
    if (type === "RECEIVE" || type === "RETURN" || type === "ADJUST") {
      stockUpdate = qty;
    } else if (type === "ISSUE") {
      stockUpdate = -qty;
    }
    await updateStockAtomic(product_id, stockUpdate);
  }

  // Simplified Line Notify (optional)
  if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      const project = project_id ? (await supabase.from("projects").select("name, customer").eq("id", project_id).single()).data : null;
      sendLineFlex({
          type,
          productName: product.name,
          qty: selected_qty,
          unit: selected_unit,
          projectName: project?.name || "ไม่ระบุ",
          requesterName: requester_name || "ไม่ระบุ",
          vendorName: vendor_name || "ไม่ระบุ",
          userName: (await supabase.from("users").select("name").eq("id", user_id).single()).data?.name || "ไม่ระบุ",
          unitPrice: product.cost_price,
          totalPrice: totalPrice,
          location: project?.customer || "",
          note: note || "ไม่ได้ระบุ",
          refId: `REQ-${newTx.id.toString().padStart(6, '0')}`
      });
  }

  res.json({ success: true, id: newTx.id, status: newTx.status });
});

app.post("/api/transactions/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;
    const { data: txn } = await supabase.from('stock_transactions').select(`*, products(name), projects(name), vendor_name`).eq('id', id).single();
    if (!txn || txn.status !== 'PENDING') return res.status(400).json({ message: "Invalid transaction" });
    
    await supabase.from('stock_transactions').update({ status: 'APPROVED' }).eq('id', id);
    if (txn.type === 'ISSUE') {
      await updateStockAtomic(txn.product_id, -Number(txn.qty));
    }

    // Notify approval
    if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
        sendLineFlex({
            type: txn.type,
            productName: txn.products?.name || "ไม่ระบุ",
            qty: txn.selected_qty || txn.qty,
            unit: txn.selected_unit || "ชิ้น",
            projectName: txn.projects?.name || "ไม่ระบุ",
            requesterName: txn.requester_name || "ไม่ระบุ",
            vendorName: txn.vendor_name || "ไม่ระบุ",
            userName: "ระบบ (อนุมัติแล้ว)",
            status: "APPROVED",
            unitPrice: txn.unit_price,
            totalPrice: txn.total_price,
            note: txn.note || "ไม่ได้ระบุ",
            refId: `REQ-${txn.id.toString().padStart(6, '0')}`
        });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

app.post("/api/transactions/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { data: txn } = await supabase.from('stock_transactions').select(`*, products(name), projects(name), vendor_name`).eq('id', id).single();
    if (!txn || txn.status !== 'PENDING') return res.status(400).json({ message: "Invalid transaction" });
    
    await supabase.from('stock_transactions').update({ status: 'REJECTED' }).eq('id', id);

    // Notify rejection
    if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
        sendLineFlex({
            type: txn.type,
            productName: txn.products?.name || "ไม่ระบุ",
            qty: txn.selected_qty || txn.qty,
            unit: txn.selected_unit || "ชิ้น",
            projectName: txn.projects?.name || "ไม่ระบุ",
            requesterName: txn.requester_name || "ไม่ระบุ",
            vendorName: txn.vendor_name || "ไม่ระบุ",
            userName: "ระบบ (ปฏิเสธแล้ว)",
            status: "REJECTED",
            unitPrice: txn.unit_price,
            totalPrice: txn.total_price,
            note: txn.note || "ไม่ได้ระบุ",
            refId: `REQ-${txn.id.toString().padStart(6, '0')}`
        });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// LINE Bot Helper
app.get("/api/line-bot-info", async (req, res) => {
  try {
    const rawToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
    const token = rawToken.trim();
    
    if (!token) return res.status(401).json({ message: "ไม่ได้กำหนด Channel Access Token ในระบบ" });
    
    const lineRes = await fetch("https://api.line.me/v2/bot/info", {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!lineRes.ok) {
      const errorData = await lineRes.json().catch(() => ({}));
      return res.status(lineRes.status).json({ 
        message: "LINE API Error", 
        status: lineRes.status,
        details: errorData,
        tokenPrefix: token.substring(0, 10) + "...",
        hasWhitespace: rawToken !== token
      });
    }
    
    const data = await lineRes.json();
    res.json(data);
  } catch (err: any) {
    console.error('LINE Bot Info failed:', err);
    res.status(500).json({ message: err.message });
  }
});

app.post("/api/test-line", async (req, res) => {
  try {
    const { groupId } = req.body;
    const rawToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
    const token = rawToken.trim();
    
    if (!token) return res.status(401).json({ message: "No token" });
    
    const result = await sendLineFlex({
        type: 'RECEIVE',
        productName: 'รายการทดสอบ (Test Product)',
        qty: 1,
        unit: 'ชิ้น',
        projectName: 'WoodCraft IMS Test',
        requesterName: 'ระบบทดสอบ',
        userName: 'Admin',
        status: 'PENDING'
    });
    
    if (result.success) {
      res.json({ success: true, message: "Flex Message sent" });
    } else {
      res.status(result.status || 500).json({ 
        message: result.error || "Failed to send Flex Message", 
        details: result.details 
      });
    }
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
});

app.get("/api/dashboard", async (req, res) => {
  try {
    const { count: projectCount, error: err1 } = await supabase.from("projects").select("*", { count: "exact", head: true });
    const { data: products, error: err2 } = await supabase.from("products").select("stock_qty, cost_price, min_alert");
    const { data: txns, error: err3 } = await supabase.from("stock_transactions").select("type, total_price, status, project_id, projects(name, budget)");
    const { count: pendingCount, error: err4 } = await supabase.from("stock_transactions").select("*", { count: "exact", head: true }).eq("status", "PENDING");

    if (err1 || err2 || err3 || err4) {
      console.error('Dashboard Data Error:', { err1, err2, err3, err4 });
      return res.status(500).json({ message: "Error loading dashboard data", details: { err1, err2, err3, err4 } });
    }

    const stockValue = products?.reduce((sum, p) => sum + (Number(p.stock_qty) * Number(p.cost_price)), 0) || 0;
    const alertCount = products?.filter(p => Number(p.stock_qty) <= Number(p.min_alert)).length || 0;
    
    const approvedIssues = txns?.filter(t => t.type === 'ISSUE' && t.status === 'APPROVED') || [];
    const totalSpent = approvedIssues.reduce((sum, t) => sum + Number(t.total_price), 0);
    
    const issuedCount = txns?.filter(t => t.type === 'ISSUE').length || 0;
    const approvedCount = txns?.filter(t => t.status === 'APPROVED').length || 0;
    const rejectedCount = txns?.filter(t => t.status === 'REJECTED').length || 0;

    // Group by project
    const projectStatsMap: Record<string, any> = {};
    txns?.forEach(t => {
      if (!t.project_id) return;
      const pid = t.project_id;
      if (!projectStatsMap[pid]) {
        const pData = Array.isArray(t.projects) ? t.projects[0] : t.projects;
        projectStatsMap[pid] = {
          name: pData?.name || 'Unknown',
          budget: pData?.budget || 0,
          total_cost: 0,
          pending_cost: 0,
          issue_count: 0
        };
      }
      if (t.type === 'ISSUE') {
        if (t.status === 'APPROVED') {
          projectStatsMap[pid].total_cost += Number(t.total_price);
          projectStatsMap[pid].issue_count += 1;
        } else if (t.status === 'PENDING') {
          projectStatsMap[pid].pending_cost += Number(t.total_price);
        }
      }
    });

    const costsByProject = Object.values(projectStatsMap);

    res.json({ 
      projectCount: projectCount || 0, 
      stockValue, 
      alertCount, 
      totalSpent, 
      costsByProject,
      pendingCount: pendingCount || 0,
      issuedCount,
      approvedCount,
      rejectedCount
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

async function sendLineFlex(data: { 
  type: string, 
  productName: string, 
  qty: any, 
  unit: string, 
  projectName: string, 
  requesterName: string, 
  userName: string, 
  vendorName?: string,
  status?: string,
  refId?: string,
  unitPrice?: number,
  totalPrice?: number,
  location?: string,
  note?: string
}) {
  // Robust token cleaning
  const rawToken = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
  const token = rawToken.trim().replace(/^["']|["']$/g, '');
  const groupId = (process.env.LINE_GROUP_ID || "Cd597a0c0fec4e516bc97c3d3d8d71a09").trim().replace(/^["']|["']$/g, '');
  
  // Validate token (must be non-empty and ASCII-only to prevent ByteString error)
  const isAscii = (str: string) => /^[\x00-\x7F]*$/.test(str);
  
  if (!token || token.includes("YOUR_") || token.includes("ใส่_") || !isAscii(token)) {
    if (token) {
        if (!isAscii(token)) console.warn("❌ [LINE] Token contains non-ASCII characters. Check Netlify Environment Variables.");
        else console.warn("❌ [LINE] Placeholder token detected. Notifications disabled.");
    } else {
        console.warn("❌ [LINE] Missing LINE_CHANNEL_ACCESS_TOKEN. Notifications disabled.");
    }
    return { success: false, error: "Invalid/Missing LINE Token" };
  }

  const isIssue = data.type === 'ISSUE';
  const isReceive = data.type === 'RECEIVE';
  const isReturn = data.type === 'RETURN';
  const isAdjust = data.type === 'ADJUST';
  const isApproved = data.status === 'APPROVED';
  const isRejected = data.status === 'REJECTED';
  
  let headerColor = '#dc3545'; // Default red for ISSUE
  let typeText = isIssue ? 'เบิกสินค้า' : (isReceive ? 'รับเข้าสินค้า' : (isReturn ? 'คืนสินค้า' : (isAdjust ? 'ปรับปรุงยอดสต็อก' : 'รายการเดินคลัง')));
  
  if (isApproved && !isReceive && !isAdjust) {
    headerColor = '#28a745'; // Green for approved
    typeText += ' (อนุมัติแล้ว ✅)';
  } else if (isRejected) {
    headerColor = '#dc3545'; // Red for rejected
    typeText += ' (ปฏิเสธแล้ว ❌)';
  } else if (isReceive) {
    headerColor = '#007bff'; // Blue for receive
  } else if (isReturn) {
    headerColor = '#28a745'; // Green for return
  } else if (isAdjust) {
    headerColor = '#f39c12'; // Orange/Amber for adjust
  } else if (isIssue) {
    typeText += ' (รออนุมัติ ⏳)';
  } else {
    headerColor = '#6c757d'; // Gray for others
  }

  const now = new Date();
  const dateStr = now.toLocaleDateString("th-TH", { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: "Asia/Bangkok" });
  const timeStr = now.toLocaleTimeString("th-TH", { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: "Asia/Bangkok" });
  const refId = data.refId || `REQ-${now.getTime().toString().substring(7)}`;

  const flexMessage = {
    type: "bubble",
    size: "mega",
    header: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "text",
          text: typeText.toUpperCase(),
          weight: "bold",
          color: "#ffffff",
          size: "xl",
          wrap: true
        }
      ],
      backgroundColor: headerColor,
      paddingAll: "20px"
    },
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            { type: "text", text: "เลขที่เบิก", size: "xs", color: "#aaaaaa", flex: 1 },
            { type: "text", text: refId, size: "xs", color: "#aaaaaa", align: "end", flex: 2 }
          ]
        },
        { type: "separator", margin: "md" },
        {
          type: "box",
          layout: "vertical",
          margin: "md",
          spacing: "sm",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: "วันที่บันทึก", size: "sm", color: "#555555", flex: 2 },
                { type: "text", text: dateStr, size: "sm", color: "#111111", align: "end", flex: 3 }
              ]
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: "เวลาที่บันทึก", size: "sm", color: "#555555", flex: 2 },
                { type: "text", text: timeStr, size: "sm", color: "#111111", align: "end", flex: 3 }
              ]
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: isAdjust ? "ผู้ปรับยอด" : "ชื่อคนเบิก/รับ", size: "sm", color: "#555555", flex: 2 },
                { type: "text", text: data.requesterName || data.userName, size: "sm", color: "#111111", align: "end", flex: 3, weight: "bold" }
              ]
            },
            {
              type: "box",
              layout: "vertical",
              margin: "md",
              backgroundColor: "#fffdf0",
              paddingAll: "8px",
              cornerRadius: "sm",
              contents: [
                { type: "text", text: "หมายเหตุ / เหตุผล:", size: "xxs", color: "#8b8000", weight: "bold" },
                { type: "text", text: data.note || "ไม่มีระบุ", size: "xs", color: "#333333", wrap: true }
              ]
            }
          ]
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          contents: [
            {
              type: "text",
              text: isReceive ? `ซัพพลายเออร์: ${data.vendorName || "ไม่ระบุ"}` : `โปรเจ็ค: ${data.projectName}`,
              weight: "bold",
              size: "md",
              color: "#000000",
              wrap: true
            },
            {
              type: "text",
              text: data.location ? `สถานที่: ${data.location}` : "รายละเอียดการสต็อก",
              size: "xs",
              color: "#aaaaaa",
              margin: "xs"
            }
          ]
        },
        {
          type: "box",
          layout: "vertical",
          margin: "lg",
          backgroundColor: "#f8f9fa",
          paddingAll: "15px",
          cornerRadius: "md",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: "รายละเอียดรายการ", size: "xs", color: "#888888", weight: "bold" },
                { type: "text", text: "จำนวน", size: "xs", color: "#888888", align: "end", weight: "bold" }
              ]
            },
            {
              type: "box",
              layout: "horizontal",
              margin: "sm",
              contents: [
                { type: "text", text: `1. ${data.productName}`, size: "sm", color: "#111111", weight: "bold", flex: 3, wrap: true },
                { 
                  type: "text", 
                  text: (isAdjust && parseFloat(data.qty as string) > 0) ? `+${data.qty} ${data.unit}` : `${data.qty} ${data.unit}`, 
                  size: "sm", color: "#111111", align: "end", weight: "bold", flex: 2 
                }
              ]
            },
            {
              type: "text",
              text: data.unitPrice ? `@ ${data.unitPrice.toLocaleString()} บาท/${data.unit}` : "@ ระบบจัดการพัสดุ WoodCraft",
              size: "xxs",
              color: "#bbbbbb",
              margin: "xs"
            }
          ]
        },
        {
          type: "box",
          layout: "horizontal",
          margin: "lg",
          contents: [
            { type: "text", text: "รวมจำนวนเงินทั้งสิ้น", size: "md", color: headerColor, weight: "bold", flex: 3 },
            { 
              type: "text", 
              text: data.totalPrice ? `${Math.abs(data.totalPrice).toLocaleString()} บาท` : "ตรวจสอบในระบบ", 
              size: "md", 
              color: headerColor, 
              align: "end", 
              weight: "bold", 
              flex: 3 
            }
          ]
        },
        {
          type: "box",
          layout: "vertical",
          margin: "xl",
          spacing: "xs",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: "ลงชื่อผู้เบิก....................................", size: "xxs", color: "#bcbcbc", flex: 1 },
                { type: "text", text: `วันที่ ${dateStr}`, size: "xxs", color: "#bcbcbc", align: "end" }
              ]
            },
            {
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: "ผู้จ่าย/อนุมัติ ....................................", size: "xxs", color: "#bcbcbc", flex: 1 },
                { type: "text", text: `วันที่ ${dateStr}`, size: "xxs", color: "#bcbcbc", align: "end" }
              ]
            }
          ]
        }
      ]
    }
  };

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({
        to: groupId,
        messages: [{
          type: "flex",
          altText: `แจ้งเตือน: ${data.productName}`,
          contents: flexMessage
        }]
      })
    });
    
    if (!response.ok) {
        const errorData = await response.json();
        console.error('LINE Push API Error:', {
            status: response.status,
            data: errorData,
            groupId: groupId.substring(0, 10) + "..."
        });
        return { success: false, status: response.status, details: errorData };
    } else {
        console.log(`LINE Notification sent successfully to group: ${groupId.substring(0, 10)}...`);
        return { success: true };
    }
  } catch (err: any) {
    console.error('Line Flex Network/Fetch failed:', err);
    return { success: false, error: err.message };
  }
}

async function sendLineSimple(text: string) {
  const token = (process.env.LINE_CHANNEL_ACCESS_TOKEN || "").trim().replace(/^["']|["']$/g, '');
  const groupId = (process.env.LINE_GROUP_ID || "Cd597a0c0fec4e516bc97c3d3d8d71a09").trim().replace(/^["']|["']$/g, '');
  
  const isAscii = (str: string) => /^[\x00-\x7F]*$/.test(str);
  if (!token || !text || !isAscii(token) || token.includes("ใส่_") || token.includes("YOUR_")) return;
  try { 
      const response = await fetch("https://api.line.me/v2/bot/message/push", { 
          method: "POST", 
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }, 
          body: JSON.stringify({ to: groupId, messages: [{ type: "text", text }] }) 
      });
      if (!response.ok) {
          const err = await response.json();
          console.error('Simple LINE Notification Failed:', { status: response.status, err });
      }
  } catch (err) {
      console.error('Simple LINE Notification Error:', err);
  }
}

// Vite Middleware & Server Listen
async function start() {
  const isProduction = process.env.NODE_ENV === "production";
  
  // Test Supabase Connection
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) {
      console.error('❌ Supabase Connection Alert:', error.message);
    } else {
      console.log('✅ Supabase Connected Successfully');
    }
  } catch (err) {
    console.error('❌ Supabase Error during startup:', err);
  }

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
    
    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Dev Server on http://localhost:${PORT}`));
  } else {
    // Serve static files in production (Cloud Run)
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    
    // Fallback to index.html for SPA routing
    app.get("*", (req, res, next) => {
      // Don't intercept API routes
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });

    const PORT = 3000;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Production Server running on port ${PORT}`);
    });
  }
}

if (process.env.NODE_ENV !== "test" && !process.env.NETLIFY && !process.env.LAMBDA_TASK_ROOT) {
  start();
}

export default app;
