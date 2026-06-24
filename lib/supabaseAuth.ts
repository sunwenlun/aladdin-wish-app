'use client';

// 统一使用 lib/supabase.ts 的客户端，避免双实例 session 不同步
export { supabase as supabaseAuth } from './supabase';
