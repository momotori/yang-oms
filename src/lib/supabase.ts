import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type MasterItem = {
  id: string;
  name: string;
  sort_order: number;
  created_at: string;
};

export type Order = {
  id: string;
  created_at: string;
  delivery_month: number;
  delivery_day: number;
  orderer_name: string;
  model_name: string;
  hose_name: string;
  quantity: string;
  destination: string;
  note: string;
  status: string;
};

export type OrderInsert = Omit<Order, 'id' | 'created_at'>;
