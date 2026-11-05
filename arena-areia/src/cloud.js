import { createClient } from "@supabase/supabase-js";
export const SUPABASE_URL = "https://djtrecfikuaxgkyfbqny.supabase.co";
export const SUPABASE_KEY = "sb_publishable_VRnTamKi5S-m4WcAmt72lw_x20bjSri";
export const client = createClient(SUPABASE_URL, SUPABASE_KEY);
export async function rpc(name, args = {}) {
  const { data, error } = await client.rpc("arena_areia_" + name, args);
  if (error) throw new Error(error.message);
  return data;
}
