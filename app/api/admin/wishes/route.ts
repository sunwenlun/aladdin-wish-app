import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

function checkAdmin(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  return adminKey === process.env.ADMIN_PASSWORD;
}

// 获取所有愿望（带分页和筛选）
export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const search = searchParams.get('search');

  const offset = (page - 1) * limit;

  let query = supabase
    .from('wishes')
    .select(`
      id, type, content, status, drift_batch, drift_count, max_batches,
      created_at, fulfilled_at, fulfilled_message, fulfilled_image_url, fulfilled_voice_url,
      user_id, fulfilled_by
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (type && type !== 'all') {
    query = query.eq('type', type);
  }
  if (search) {
    query = query.ilike('content', `%${search}%`);
  }

  const { data: wishes, count, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 获取相关用户信息
  const userIds = new Set<string>();
  (wishes || []).forEach((w: any) => {
    if (w.user_id) userIds.add(w.user_id);
    if (w.fulfilled_by) userIds.add(w.fulfilled_by);
  });

  let userMap: Record<string, any> = {};
  if (userIds.size > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, nickname, email, device_id')
      .in('id', Array.from(userIds));

    (users || []).forEach((u: any) => {
      userMap[u.id] = u;
    });
  }

  const wishesWithUsers = (wishes || []).map((w: any) => ({
    ...w,
    wish_owner: w.user_id ? userMap[w.user_id] : null,
    fulfiller: w.fulfilled_by ? userMap[w.fulfilled_by] : null,
  }));

  return NextResponse.json({
    wishes: wishesWithUsers,
    total: count || 0,
    page,
    limit,
    totalPages: Math.ceil((count || 0) / limit),
  });
}

// 删除愿望
export async function DELETE(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { wishId } = body;

  if (!wishId) {
    return NextResponse.json({ error: 'Missing wishId' }, { status: 400 });
  }

  // 先删除关联的漂流记录
  await supabase.from('wish_drifts').delete().eq('wish_id', wishId);

  // 删除愿望
  const { error } = await supabase.from('wishes').delete().eq('id', wishId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
