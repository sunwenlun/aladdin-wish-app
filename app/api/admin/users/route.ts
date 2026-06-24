import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function checkAdmin(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  return adminKey === process.env.ADMIN_PASSWORD;
}

// 获取所有用户
export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const search = searchParams.get('search');
  const offset = (page - 1) * limit;

  let query = supabase
    .from('users')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (search) {
    query = query.or(`nickname.ilike.%${search}%,email.ilike.%${search}%,device_id.ilike.%${search}%`);
  }

  const { data: users, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    users: users || [],
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

// 手动给用户加灯油
export async function POST(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { userId, amount, reason } = body;

  if (!userId || !amount || amount <= 0) {
    return NextResponse.json({ error: 'Missing userId or invalid amount' }, { status: 400 });
  }

  // 获取当前灯油数
  const { data: user } = await supabase
    .from('users')
    .select('wish_chances, nickname, email')
    .eq('id', userId)
    .single();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // 增加灯油
  const newChances = (user.wish_chances || 0) + amount;
  const { error } = await supabase
    .from('users')
    .update({ wish_chances: newChances })
    .eq('id', userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 记录到 oil_purchases（标记为 admin_gift）
  await supabase.from('oil_purchases').insert({
    user_id: userId,
    amount,
    price_usd: 0,
    status: 'paid',
    stripe_session_id: `admin_gift_${Date.now()}`,
  });

  return NextResponse.json({
    success: true,
    message: `Added ${amount} oil to user ${user.nickname || user.email || userId}`,
    newBalance: newChances,
  });
}
