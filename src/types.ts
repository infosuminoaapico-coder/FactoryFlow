export interface User {
  id: number;
  username: string;
  name: string;
  role: 'admin' | 'staff';
}

export interface SubUnit {
  name: string;
  multiplier: number; // multiplier to base unit
}

export interface Product {
  id: number;
  name: string;
  category: string;
  unit: string;
  cost_price: number;
  stock_qty: number;
  min_alert: number;
  qr_code: string;
  sub_units?: string; // JSON string
}

export interface Project {
  id: number;
  name: string;
  customer: string;
  start_date: string;
  end_date: string;
  status: string;
  budget?: number;
}

export interface PlanItem {
  id: number;
  project_id: number;
  product_id: number;
  planned_qty: number;
  product_name: string;
  unit: string;
  used_qty: number | null;
  stock_qty: number;
}

export interface Transaction {
  id: number;
  type: 'RECEIVE' | 'ISSUE' | 'RETURN' | 'ADJUST';
  product_id: number;
  product_name?: string;
  qty: number;
  unit_price: number;
  total_price: number;
  project_id: number | null;
  project_name?: string;
  user_id: number;
  user_name?: string;
  requester_name: string | null;
  vendor_name: string | null;
  note: string | null;
  datetime: string;
  unit?: string;
  selected_unit?: string;
  selected_qty?: number;
}
