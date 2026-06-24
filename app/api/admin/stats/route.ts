import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 简单管理员验证
function checkAdmin(request: NextRequest): boolean {
  const adminKey = request.headers.get('x-admin-key');
  return adminKey === process.env.ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  if (!checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // 并行查询所有统计
    const [
      { count: totalUsers },
      { count: totalWishes },
      { count: fulfilledWishes },
      { count: driftingWishes },
      { count: totalCases },
      { count: totalDrifts },
      { count: totalPurchases },
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('wishes').select('*', { count: 'exact', head: true }),
      supabase.from('wishes').select('*', { count: 'exact', head: true }).in('status', ['fulfilled', 'aiFulfilled']),
      supabase.from('wishes').select('*', { count: 'exact', head: true }).eq('status', 'drifting'),
      supabase.from('fulfilled_cases').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('wish_drifts').select('*', { count: 'exact', head: true }),
      supabase.from('oil_purchases').select('*', { count: 'exact', head: true }),
    ]);

    // 今日活跃用户（今天有过愿望或漂流记录的用户）
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [{ data: todayWishes }, { data: todayDrifts }] = await Promise.all([
      supabase.from('wishes').select('user_id').gte('created_at', todayStart.toISOString()),
      supabase.from('wish_drifts').select('receiver_id').gte('created_at', todayStart.toISOString()),
    ]);

    const todayActiveUsers = new Set<string>();
    (todayWishes || []).forEach((w: any) => w.user_id && todayActiveUsers.add(w.user_id));
    (todayDrifts || []).forEach((d: any) => d.receiver_id && todayActiveUsers.add(d.receiver_id));

    // 昨日活跃（计算留存率用）
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayEnd = new Date(todayStart);

    const [{ data: yesterdayWishes }, { data: yesterdayDrifts }] = await Promise.all([
      supabase.from('wishes').select('user_id').gte('created_at', yesterdayStart.toISOString()).lt('created_at', yesterdayEnd.toISOString()),
      supabase.from('wish_drifts').select('receiver_id').gte('created_at', yesterdayStart.toISOString()).lt('created_at', yesterdayEnd.toISOString()),
    ]);

    const yesterdayActiveUsers = new Set<string>();
    (yesterdayWishes || []).forEach((w: any) => w.user_id && yesterdayActiveUsers.add(w.user_id));
    (yesterdayDrifts || []).forEach((d: any) => d.receiver_id && yesterdayActiveUsers.add(d.receiver_id));

    // AI保底触发次数
    const { count: aiFulfilledCount } = await supabase
      .from('wishes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'aiFulfilled');

    // 最近7天每日许愿趋势
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { data: recentWishes } = await supabase
      .from('wishes')
      .select('created_at, status')
      .gte('created_at', sevenDaysAgo.toISOString())
      .order('created_at', { ascending: true });

    // 按天聚合
    const dailyStats: Record<string, { wishes: number; fulfilled: number }> = {};
    (recentWishes || []).forEach((w: any) => {
      const day = w.created_at.split('T')[0];
      if (!dailyStats[day]) dailyStats[day] = { wishes: 0, fulfilled: 0 };
      dailyStats[day].wishes++;
      if (w.status === 'fulfilled' || w.status === 'aiFulfilled') {
        dailyStats[day].fulfilled++;
      }
    });

    // 按愿望类型分布
    const { data: typeData } = await supabase
      .from('wishes')
      .select('type');

    const typeDist: Record<string, number> = {};
    (typeData || []).forEach((w: any) => {
      typeDist[w.type] = (typeDist[w.type] || 0) + 1;
    });

    // 收入统计
    const { data: paidPurchases } = await supabase
      .from('oil_purchases')
      .select('price_usd, amount')
      .eq('status', 'paid');

    const totalRevenue = (paidPurchases || []).reduce((sum: number, p: any) => sum + Number(p.price_usd), 0);
    const totalOilSold = (paidPurchases || []).reduce((sum: number, p: any) => sum + p.amount, 0);

    const fulfilledRate = (totalWishes || 0) > 0 ? (((fulfilledWishes || 0) / (totalWishes || 0)) * 100).toFixed(1) : '0';

    return NextResponse.json({
      overview: {
        totalUsers: totalUsers || 0,
        totalWishes: totalWishes || 0,
        fulfilledWishes: fulfilledWishes || 0,
        fulfilledRate: `${fulfilledRate}%`,
        driftingWishes: driftingWishes || 0,
        aiFulfilledCount: aiFulfilledCount || 0,
        todayActiveUsers: todayActiveUsers.size,
        yesterdayActiveUsers: yesterdayActiveUsers.size,
        totalCases: totalCases || 0,
        totalDrifts: totalDrifts || 0,
        totalPurchases: totalPurchases || 0,
        totalRevenue: `$${totalRevenue.toFixed(2)}`,
        totalOilSold,
      },
      dailyTrend: Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        wishes: stats.wishes,
        fulfilled: stats.fulfilled,
      })),
      typeDistribution: Object.entries(typeDist).map(([type, count]) => ({ type, count })),
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
