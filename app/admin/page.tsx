'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Trash2, Search, Droplet, BarChart3, Users, Sparkles, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';

// ============================================
// Admin Dashboard 页面
// ============================================

const WISH_TYPES: Record<string, string> = {
  A: '给未来的我',
  B: '一句来自远方的话',
  C: '生日快乐',
  D: '画出我的梦想',
  E: '教我一件事',
  F: '拍一张照片',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  drifting: { label: '漂流中', color: 'text-blue-400' },
  received: { label: '已接收', color: 'text-yellow-400' },
  implementing: { label: '实现中', color: 'text-orange-400' },
  fulfilled: { label: '已实现', color: 'text-green-400' },
  aiFulfilled: { label: '灯神实现', color: 'text-purple-400' },
};

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [tab, setTab] = useState<'dashboard' | 'wishes' | 'users'>('dashboard');

  // ===== 登录 =====
  const handleLogin = () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || password === 'aladdin2026') {
      setAuthed(true);
      localStorage.setItem('aladdin_admin_key', password);
    } else {
      setAuthError('密码错误');
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('aladdin_admin_key');
    if (saved) {
      setPassword(saved);
      setAuthed(true);
    }
  }, []);

  // ===== 未登录界面 =====
  if (!authed) {
    return (
      <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🪔</div>
            <h1 className="text-2xl font-bold text-amber-400">Admin Console</h1>
            <p className="text-sm text-gray-500 mt-2">阿拉丁许愿灯 · 运营后台</p>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setAuthError(''); }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="输入管理员密码"
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
          />
          {authError && <p className="text-red-400 text-sm mt-2">{authError}</p>}
          <button
            onClick={handleLogin}
            className="w-full mt-4 px-4 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold hover:scale-[1.02] transition-all"
          >
            进入后台
          </button>
          <p className="text-xs text-gray-600 text-center mt-4">默认密码: aladdin2026（可在 .env.local 中修改）</p>
        </div>
      </div>
    );
  }

  // ===== 已登录界面 =====
  return (
    <div className="min-h-screen bg-[#0a0a1a] text-white pb-20">
      {/* 顶部 */}
      <header className="sticky top-0 z-30 bg-[#0a0a1a]/90 backdrop-blur-lg border-b border-white/10 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🪔</span>
            <div>
              <h1 className="text-lg font-bold text-amber-400">运营后台</h1>
              <p className="text-[10px] text-gray-500">Aladdin Admin Console</p>
            </div>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('aladdin_admin_key');
              setAuthed(false);
              setPassword('');
            }}
            className="text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            退出
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex gap-2 mt-3">
          {[
            { key: 'dashboard', label: '仪表盘', icon: BarChart3 },
            { key: 'wishes', label: '愿望管理', icon: Sparkles },
            { key: 'users', label: '用户管理', icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key as any)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === key
                  ? 'bg-amber-400/20 text-amber-400 border border-amber-400/30'
                  : 'bg-white/5 text-gray-400 hover:text-gray-300'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 pt-4">
        {tab === 'dashboard' && <DashboardTab password={password} />}
        {tab === 'wishes' && <WishesTab password={password} />}
        {tab === 'users' && <UsersTab password={password} />}
      </div>
    </div>
  );
}

// ============================================
// Tab 1: 仪表盘
// ============================================
function DashboardTab({ password }: { password: string }) {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stats', {
        headers: { 'x-admin-key': password },
      });
      const data = await res.json();
      setStats(data);
    } catch (e) {
      console.error('Fetch stats error:', e);
    } finally {
      setLoading(false);
    }
  }, [password]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // 30s刷新
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-500 animate-pulse">加载中...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-20 text-gray-500">
        无法获取数据，请确认SQL已执行
        <button onClick={fetchStats} className="block mx-auto mt-4 px-4 py-2 rounded-lg bg-white/5 text-sm">重试</button>
      </div>
    );
  }

  const { overview, dailyTrend, typeDistribution } = stats;

  const metrics = [
    { label: '总用户数', value: overview.totalUsers, icon: Users, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { label: '总愿望数', value: overview.totalWishes, icon: Sparkles, color: 'text-amber-400', bg: 'bg-amber-400/10' },
    { label: '实现率', value: overview.fulfilledRate, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: '今日活跃', value: overview.todayActiveUsers, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10' },
    { label: '漂流中', value: overview.driftingWishes, icon: Sparkles, color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
    { label: 'AI保底', value: overview.aiFulfilledCount, icon: AlertTriangle, color: 'text-orange-400', bg: 'bg-orange-400/10' },
    { label: '灯油收入', value: overview.totalRevenue, icon: DollarSign, color: 'text-green-400', bg: 'bg-green-400/10' },
    { label: '灯油售出', value: `${overview.totalOilSold} 份`, icon: Droplet, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  ];

  const maxDaily = Math.max(...(dailyTrend || []).map((d: any) => d.wishes), 1);

  return (
    <div className="space-y-4">
      {/* 指标卡片 */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((m, i) => {
          const Icon = m.icon;
          return (
            <div key={i} className={`rounded-2xl ${m.bg} border border-white/10 p-4`}>
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${m.color}`} />
              </div>
              <div className={`text-2xl font-bold ${m.color} tabular-nums`}>{m.value}</div>
              <div className="text-xs text-gray-500 mt-1">{m.label}</div>
            </div>
          );
        })}
      </div>

      {/* 7天趋势 */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
        <h3 className="text-sm font-bold text-gray-300 mb-3">最近7天许愿趋势</h3>
        {(dailyTrend && dailyTrend.length > 0) ? (
          <div className="flex items-end gap-2 h-32">
            {dailyTrend.map((d: any, i: number) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="text-[9px] text-amber-400 tabular-nums">{d.wishes}</div>
                <div className="w-full bg-gradient-to-t from-amber-500/50 to-amber-400/80 rounded-t-sm"
                  style={{ height: `${(d.wishes / maxDaily) * 80}%`, minHeight: d.wishes > 0 ? '8px' : '0' }}
                />
                <div className="text-[9px] text-gray-600">{d.date.slice(5)}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600 text-center py-8">暂无趋势数据</p>
        )}
      </div>

      {/* 愿望类型分布 */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
        <h3 className="text-sm font-bold text-gray-300 mb-3">愿望类型分布</h3>
        {(typeDistribution && typeDistribution.length > 0) ? (
          <div className="space-y-2">
            {typeDistribution.map((t: any) => {
              const total = typeDistribution.reduce((s: number, x: any) => s + x.count, 0);
              const pct = total > 0 ? (t.count / total) * 100 : 0;
              return (
                <div key={t.type} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-40 truncate">{WISH_TYPES[t.type] || t.type}</span>
                  <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500/60 to-amber-400/80 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(pct, 5)}%` }}
                    >
                      <span className="text-[10px] text-slate-900 font-bold">{t.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-600 text-center py-4">暂无愿望数据</p>
        )}
      </div>

      <button onClick={fetchStats} className="w-full py-2 rounded-lg bg-white/5 text-sm text-gray-400 hover:bg-white/10 transition-all">
        刷新数据
      </button>
    </div>
  );
}

// ============================================
// Tab 2: 愿望管理
// ============================================
function WishesTab({ password }: { password: string }) {
  const [wishes, setWishes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchWishes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: '15',
        status: filterStatus,
        type: filterType,
      });
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/wishes?${params}`, {
        headers: { 'x-admin-key': password },
      });
      const data = await res.json();
      setWishes(data.wishes || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Fetch wishes error:', e);
    } finally {
      setLoading(false);
    }
  }, [password, page, filterStatus, filterType, search]);

  useEffect(() => {
    fetchWishes();
  }, [fetchWishes]);

  const handleDelete = async (wishId: string) => {
    try {
      await fetch('/api/admin/wishes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': password },
        body: JSON.stringify({ wishId }),
      });
      setDeleteConfirm(null);
      fetchWishes();
    } catch (e) {
      console.error('Delete error:', e);
    }
  };

  return (
    <div className="space-y-3">
      {/* 筛选 */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300"
        >
          <option value="all">全部状态</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300"
        >
          <option value="all">全部类型</option>
          {Object.entries(WISH_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
            placeholder="搜索愿望内容..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 placeholder-gray-600"
          />
        </div>
      </div>

      <div className="text-xs text-gray-500">共 {total} 条愿望</div>

      {/* 愿望列表 */}
      {loading ? (
        <div className="text-center py-10 text-gray-500 animate-pulse">加载中...</div>
      ) : wishes.length === 0 ? (
        <div className="text-center py-10 text-gray-600">暂无愿望数据</div>
      ) : (
        <div className="space-y-2">
          {wishes.map((w) => {
            const status = STATUS_LABELS[w.status] || { label: w.status, color: 'text-gray-400' };
            return (
              <div key={w.id} className="rounded-xl bg-white/5 border border-white/10 p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-gray-600 bg-white/5 px-1.5 py-0.5 rounded">{w.type}</span>
                      <span className={`text-xs font-medium ${status.color}`}>{status.label}</span>
                      <span className="text-xs text-gray-600">漂流 {w.drift_count}人 · 第{w.drift_batch}批</span>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-2">{w.content}</p>
                    <div className="text-[10px] text-gray-600 mt-1">
                      许愿者: {w.wish_owner?.nickname || w.wish_owner?.email || '匿名'}
                      {' · '}
                      {new Date(w.created_at).toLocaleString('zh-CN')}
                    </div>
                    {w.fulfilled_message && (
                      <div className="text-[10px] text-green-600 mt-1 truncate">
                        实现: {w.fulfilled_message.substring(0, 60)}...
                      </div>
                    )}
                  </div>
                  {deleteConfirm === w.id ? (
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => handleDelete(w.id)}
                        className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 border border-red-500/30"
                      >
                        确认删除
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs px-2 py-1 rounded bg-white/5 text-gray-400"
                      >
                        取消
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(w.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-sm text-gray-400 disabled:opacity-30"
          >
            上一页
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-sm text-gray-400 disabled:opacity-30"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Tab 3: 用户管理
// ============================================
function UsersTab({ password }: { password: string }) {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [oilModal, setOilModal] = useState<{ userId: string; name: string } | null>(null);
  const [oilAmount, setOilAmount] = useState(3);
  const [oilMsg, setOilMsg] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: '15' });
      if (search) params.set('search', search);

      const res = await fetch(`/api/admin/users?${params}`, {
        headers: { 'x-admin-key': password },
      });
      const data = await res.json();
      setUsers(data.users || []);
      setTotalPages(data.totalPages || 1);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Fetch users error:', e);
    } finally {
      setLoading(false);
    }
  }, [password, page, search]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAddOil = async () => {
    if (!oilModal) return;
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': password },
        body: JSON.stringify({ userId: oilModal.userId, amount: oilAmount, reason: oilMsg }),
      });
      const data = await res.json();
      if (data.success) {
        setOilModal(null);
        setOilAmount(3);
        setOilMsg('');
        fetchUsers();
        alert(`成功！用户当前灯油余额: ${data.newBalance}`);
      }
    } catch (e) {
      console.error('Add oil error:', e);
    }
  };

  return (
    <div className="space-y-3">
      {/* 搜索 */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
          placeholder="搜索昵称/邮箱/设备ID..."
          className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300 placeholder-gray-600"
        />
      </div>

      <div className="text-xs text-gray-500">共 {total} 位旅人</div>

      {/* 用户列表 */}
      {loading ? (
        <div className="text-center py-10 text-gray-500 animate-pulse">加载中...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-10 text-gray-600">暂无用户数据</div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div key={u.id} className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{u.avatar || '🧭'}</span>
                    <span className="text-sm font-medium text-gray-300 truncate">
                      {u.nickname || '匿名旅人'}
                    </span>
                    {u.email && (
                      <span className="text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">已注册</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>🪔 {u.wish_chances}</span>
                    <span>✨ {u.total_wishes}</span>
                    <span>❤️ {u.total_fulfilled}</span>
                    <span className="text-gray-600">{new Date(u.created_at).toLocaleDateString('zh-CN')}</span>
                  </div>
                  {u.email && <div className="text-[10px] text-gray-600 mt-0.5 truncate">{u.email}</div>}
                </div>
                <button
                  onClick={() => setOilModal({ userId: u.id, name: u.nickname || u.email || '匿名' })}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-400/10 text-amber-400 border border-amber-400/20 text-xs font-medium hover:bg-amber-400/20 transition-all"
                >
                  <Droplet className="w-3.5 h-3.5" />
                  加灯油
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-sm text-gray-400 disabled:opacity-30"
          >
            上一页
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-lg bg-white/5 text-sm text-gray-400 disabled:opacity-30"
          >
            下一页
          </button>
        </div>
      )}

      {/* 加灯油弹窗 */}
      {oilModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6" onClick={() => setOilModal(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-[#12122a] border border-white/10 p-6" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">🪔</div>
              <h3 className="text-lg font-bold text-amber-400">手动加灯油</h3>
              <p className="text-xs text-gray-500 mt-1">用户: {oilModal.name}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400">灯油数量</label>
                <div className="flex gap-2 mt-1">
                  {[1, 3, 5, 10, 20].map(n => (
                    <button
                      key={n}
                      onClick={() => setOilAmount(n)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        oilAmount === n
                          ? 'bg-amber-400 text-slate-900'
                          : 'bg-white/5 text-gray-400'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400">备注（可选）</label>
                <input
                  type="text"
                  value={oilMsg}
                  onChange={e => setOilMsg(e.target.value)}
                  placeholder="如：活动赠送"
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-gray-300"
                />
              </div>
              <button
                onClick={handleAddOil}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold"
              >
                确认加 {oilAmount} 份灯油
              </button>
              <button
                onClick={() => setOilModal(null)}
                className="w-full py-2 text-sm text-gray-500"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
