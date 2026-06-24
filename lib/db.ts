import { supabase } from './supabase';

// ============================================
// 用户相关操作
// ============================================

// 获取或创建用户（基于设备ID）
export async function getOrCreateUser(deviceId: string) {
  // 先查是否已存在
  const { data: existing } = await supabase
    .from('users')
    .select('*')
    .eq('device_id', deviceId)
    .single();

  if (existing) return existing;

  // 不存在则创建
  const { data, error } = await supabase
    .from('users')
    .insert({
      device_id: deviceId,
      wish_chances: 3,
      total_wishes: 0,
      total_fulfilled: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('创建用户失败:', error);
    return null;
  }
  return data;
}

// 获取用户信息
export async function getUser(userId: string) {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return data;
}

// 扣减许愿次数
export async function useWishChance(userId: string) {
  const { data: user } = await supabase
    .from('users')
    .select('wish_chances, total_wishes')
    .eq('id', userId)
    .single();

  if (!user || user.wish_chances <= 0) return false;

  const { error } = await supabase
    .from('users')
    .update({
      wish_chances: user.wish_chances - 1,
      total_wishes: user.total_wishes + 1,
    })
    .eq('id', userId);

  return !error;
}

// ============================================
// 愿望相关操作
// ============================================

// 创建愿望 + 自动触发漂流
export async function createWish(
  userId: string,
  type: string,
  content: string
) {
  const { data, error } = await supabase
    .from('wishes')
    .insert({
      user_id: userId,
      type,
      content,
      status: 'drifting',
      drift_batch: 1,
      drift_count: 0,
      max_batches: 5,
    })
    .select()
    .single();

  if (error) {
    console.error('创建愿望失败:', error);
    return null;
  }

  // 扣减许愿次数
  await useWishChance(userId);

  // 自动触发第一轮漂流
  await assignDriftBatch(data.id, userId, 1);

  return data;
}

// 获取用户的愿望列表
export async function getMyWishes(userId: string) {
  const { data, error } = await supabase
    .from('wishes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return [];
  return data;
}

// 获取信箱中的愿望（漂流给当前用户的）
export async function getMailboxWishes(userId: string) {
  // 查询漂流到当前用户的、待处理或已接受的愿望
  const { data: drifts } = await supabase
    .from('wish_drifts')
    .select('id, wish_id, status, batch_num, created_at')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (!drifts || drifts.length === 0) return [];

  const wishIds = drifts.map((d) => d.wish_id);
  const { data: wishes } = await supabase
    .from('wishes')
    .select('*')
    .in('id', wishIds)
    .eq('status', 'drifting')
    .order('created_at', { ascending: false });

  if (!wishes) return [];

  // 合并漂流信息，过滤掉已不在漂流状态的愿望
  return wishes.map((w) => {
    const drift = drifts.find((d) => d.wish_id === w.id);
    return {
      ...w,
      drift_id: drift?.id,
      drift_status: drift?.status,
      batch_num: drift?.batch_num,
      received_at: drift?.created_at,
    };
  });
}

// ============================================
// 首页案例相关操作
// ============================================

// 获取已实现的案例（首页展示）— 仅显示英文案例，打乱顺序避免同类型连续
export async function getFulfilledCases() {
  const { data, error } = await supabase
    .from('fulfilled_cases')
    .select('*')
    .eq('is_active', true)
    .in('status', ['fulfilled', 'aiFulfilled'])
    .order('display_order', { ascending: true });

  if (error) return [];
  // Filter out any cases containing Chinese characters
  const englishOnly = (data || []).filter(
    c => !/[\u4e00-\u9fff]/.test(c.title + c.content + (c.implementer_message || ''))
  );
  // Deduplicate by title (keep first occurrence)
  const seen = new Set();
  const unique = englishOnly.filter(c => {
    if (seen.has(c.title)) return false;
    seen.add(c.title);
    return true;
  });
  const limited = unique.slice(0, 20);
  // Interleave by type so no two same-type cases are adjacent
  return interleaveByType(limited);
}

// 按类型交错排列，确保相邻案例类型不同
function interleaveByType(cases: any[]): any[] {
  if (cases.length <= 1) return cases;

  // Group by type
  const groups: Record<string, any[]> = {};
  for (const c of cases) {
    if (!groups[c.type]) groups[c.type] = [];
    groups[c.type].push(c);
  }

  // Sort groups by size (largest first) for better interleaving
  const sortedGroups = Object.values(groups).sort((a, b) => b.length - a.length);

  const result: any[] = [];
  // Round-robin: pick one from each group in turn
  let remaining = cases.length;
  while (remaining > 0) {
    for (const group of sortedGroups) {
      if (group.length > 0) {
        result.push(group.shift()!);
        remaining--;
      }
    }
  }

  return result;
}

// 获取即将上线的案例预告 — 仅显示英文案例
export async function getComingSoonCases() {
  const { data, error } = await supabase
    .from('fulfilled_cases')
    .select('*')
    .eq('is_active', true)
    .eq('status', 'comingSoon')
    .order('display_order', { ascending: true });

  if (error) return [];
  // Filter out Chinese, show English comingSoon cases
  const englishOnly = (data || []).filter(
    c => !/[\u4e00-\u9fff]/.test(c.title + c.content)
  );
  return englishOnly.slice(0, 6);
}

// 获取单个案例详情（按ID）
export async function getCaseById(caseId: string) {
  const { data, error } = await supabase
    .from('fulfilled_cases')
    .select('*')
    .eq('id', caseId)
    .single();

  if (error) return null;
  return data;
}

/**
 * 公开获取愿望详情（无需登录，用于深链接分享页）
 * 仅返回基本信息：类型、内容、状态、漂流进度、实现者留言
 */
export async function getWishDetailPublic(wishId: string) {
  // 获取愿望基本信息
  const { data: wish, error } = await supabase
    .from('wishes')
    .select('*')
    .eq('id', wishId)
    .single();

  if (error || !wish) return null;

  // 如果已实现，获取实现者昵称
  let implementer_name = null;
  if (wish.fulfilled_by && (wish.status === 'fulfilled' || wish.status === 'aiFulfilled')) {
    const { data: implUser } = await supabase
      .from('users')
      .select('nickname')
      .eq('id', wish.fulfilled_by)
      .single();
    implementer_name = implUser?.nickname || null;
  }

  // 获取漂流计数
  const { count: driftCount } = await supabase
    .from('wish_drifts')
    .select('*', { count: 'exact', head: true })
    .eq('wish_id', wishId);

  return {
    id: wish.id,
    type: wish.type,
    content: wish.content,
    status: wish.status,
    drift_count: driftCount || 0,
    drift_batch: wish.drift_batch,
    max_batches: wish.max_batches,
    created_at: wish.created_at,
    fulfilled_at: wish.fulfilled_at,
    fulfilled_message: wish.fulfilled_message,
    fulfilled_image_url: wish.fulfilled_image_url || null,
    fulfilled_voice_url: wish.fulfilled_voice_url || null,
    fulfilled_by: wish.fulfilled_by,
    implementer_name,
  };
}

// ============================================
// 首页统计数据
// ============================================

export async function getHomeStats() {
  const [
    { count: wishCount },
    { count: fulfilledCount },
    { count: userCount },
  ] = await Promise.all([
    supabase.from('wishes').select('*', { count: 'exact', head: true }),
    supabase.from('wishes').select('*', { count: 'exact', head: true }).in('status', ['fulfilled', 'aiFulfilled']),
    supabase.from('users').select('*', { count: 'exact', head: true }),
  ]);

  // 固定基数 + 真实数据，让首页数字看起来健康
  const BASE_WISHES = 1284;
  const BASE_FULFILLED = 327;
  const BASE_TRAVELERS = 892;

  return {
    totalWishes: (wishCount || 0) + BASE_WISHES,
    totalFulfilled: (fulfilledCount || 0) + BASE_FULFILLED,
    totalTravelers: (userCount || 0) + BASE_TRAVELERS,
  };
}

/**
 * 获取愿望详情（含漂流轨迹 + 实现者信息）
 */
export async function getWishDetail(wishId: string) {
  // 获取愿望
  const { data: wish, error: wishError } = await supabase
    .from('wishes')
    .select('*')
    .eq('id', wishId)
    .single();

  if (wishError || !wish) return null;

  // 获取漂流轨迹（含接收者信息）
  const { data: drifts, error: driftError } = await supabase
    .from('wish_drifts')
    .select(`
      id,
      batch_num,
      status,
      created_at,
      responded_at,
      forward_to,
      receiver_id
    `)
    .eq('wish_id', wishId)
    .order('batch_num', { ascending: true })
    .order('created_at', { ascending: true });

  // 获取所有涉及的用户信息
  const receiverIds = [...new Set((drifts || []).map(d => d.receiver_id))];
  let userInfoMap: Record<string, { nickname: string | null; avatar: string | null }> = {};

  if (receiverIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, nickname, avatar')
      .in('id', receiverIds);

    if (users) {
      users.forEach(u => {
        userInfoMap[u.id] = { nickname: u.nickname, avatar: u.avatar };
      });
    }
  }

  // 获取实现者信息
  let implementer = null;
  if (wish.fulfilled_by) {
    const { data: implUser } = await supabase
      .from('users')
      .select('id, nickname, avatar')
      .eq('id', wish.fulfilled_by)
      .single();

    if (implUser) {
      implementer = {
        id: implUser.id,
        nickname: implUser.nickname,
        avatar: implUser.avatar,
      };
    }
  }

  // 组装漂流轨迹
  const trail = (drifts || []).map(d => ({
    id: d.id,
    batch_num: d.batch_num,
    status: d.status,
    created_at: d.created_at,
    responded_at: d.responded_at,
    forward_to: d.forward_to,
    receiver: userInfoMap[d.receiver_id] || { nickname: null, avatar: null },
  }));

  return {
    ...wish,
    trail,
    implementer,
  };
}

/**
 * 增加许愿次数（购买灯油）
 */
export async function addWishChances(userId: string, amount: number): Promise<boolean> {
  const { data: user } = await supabase
    .from('users')
    .select('wish_chances')
    .eq('id', userId)
    .single();

  if (!user) return false;

  const { error } = await supabase
    .from('users')
    .update({
      wish_chances: user.wish_chances + amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  return !error;
}

// ============================================
// 漂流核心机制
// ============================================

/**
 * 分配漂流批次：从所有用户中随机选3人（排除许愿者），创建漂流记录
 */
export async function assignDriftBatch(
  wishId: string,
  wishOwnerId: string,
  batchNum: number
): Promise<boolean> {
  // 获取所有其他用户（排除许愿者本人 + 种子用户也可以收到）
  const { data: allUsers, error } = await supabase
    .from('users')
    .select('id')
    .neq('id', wishOwnerId);

  if (error || !allUsers || allUsers.length === 0) {
    console.log('没有其他用户可分配漂流，愿望将等待');
    return false;
  }

  // 随机选最多3人
  const shuffled = [...allUsers].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(3, shuffled.length));

  // 创建漂流记录
  const driftRecords = selected.map((u) => ({
    wish_id: wishId,
    receiver_id: u.id,
    batch_num: batchNum,
    status: 'pending',
  }));

  const { error: insertError } = await supabase
    .from('wish_drifts')
    .insert(driftRecords);

  if (insertError) {
    console.error('创建漂流记录失败:', insertError);
    return false;
  }

  // 更新愿望的漂流批次和计数
  await supabase
    .from('wishes')
    .update({
      drift_batch: batchNum,
      drift_count: selected.length,
    })
    .eq('id', wishId);

  return true;
}

/**
 * 响应漂流愿望（四选一操作）
 * action: 'implemented' | 'forwarded' | 'drifted' | 'peace'
 */
export async function respondToDrift(
  driftId: string,
  wishId: string,
  receiverId: string,
  action: 'implemented' | 'forwarded' | 'drifted' | 'peace',
  message?: string,
  forwardTo?: string,
  imageUrl?: string,
  voiceUrl?: string
) {
  // 更新漂流记录状态
  const { error: driftError } = await supabase
    .from('wish_drifts')
    .update({
      status: action,
      responded_at: new Date().toISOString(),
      forward_to: forwardTo || null,
    })
    .eq('id', driftId);

  if (driftError) {
    console.error('更新漂流记录失败:', driftError);
    return false;
  }

  if (action === 'implemented' && message) {
    // 实现愿望：更新愿望状态为已实现
    const { error: wishError } = await supabase
      .from('wishes')
      .update({
        status: 'fulfilled',
        fulfilled_by: receiverId,
        fulfilled_message: message,
        fulfilled_image_url: imageUrl || null,
        fulfilled_voice_url: voiceUrl || null,
        fulfilled_at: new Date().toISOString(),
      })
      .eq('id', wishId);

    if (wishError) {
      console.error('更新愿望状态失败:', wishError);
      return false;
    }

    // 把同批其他漂流记录标记为过期
    await supabase
      .from('wish_drifts')
      .update({ status: 'expired', responded_at: new Date().toISOString() })
      .eq('wish_id', wishId)
      .eq('status', 'pending')
      .neq('id', driftId);

    // 增加实现者的 fulfilled 计数
    const { data: implementer } = await supabase
      .from('users')
      .select('total_fulfilled')
      .eq('id', receiverId)
      .single();

    if (implementer) {
      await supabase
        .from('users')
        .update({ total_fulfilled: implementer.total_fulfilled + 1 })
        .eq('id', receiverId);
    }

    return true;
  }

  if (action === 'drifted') {
    // 继续漂流：检查这批是否所有人都已响应
    const { data: pendingDrifts } = await supabase
      .from('wish_drifts')
      .select('id')
      .eq('wish_id', wishId)
      .eq('status', 'pending');

    // 如果这批没有人 pending 了，触发下一批
    if (!pendingDrifts || pendingDrifts.length === 0) {
      const { data: wish } = await supabase
        .from('wishes')
        .select('drift_batch, max_batches, user_id')
        .eq('id', wishId)
        .single();

      if (wish && wish.drift_batch < wish.max_batches) {
        // 还有批次可用，分配下一批
        await assignDriftBatch(wishId, wish.user_id, wish.drift_batch + 1);
      } else {
        // 已到最大批次，触发AI灯神保底
        await triggerGenieFulfillment(wishId);
      }
    }
  }

  if (action === 'peace') {
    // 世界和平：移除这个漂流记录（从用户信箱消失）
    // 状态已更新为 peace，不会出现在 pending 查询中
  }

  return true;
}

/**
 * 直接实现愿望（通过社交媒体分享链接）
 * 允许任何用户直接实现一个未实现的愿望，不需要经过漂流系统
 */
export async function directFulfillWish(
  wishId: string,
  fulfillerId: string,
  message: string,
  imageUrl?: string,
  voiceUrl?: string
) {
  // 1. 检查愿望状态
  const { data: wish, error: wishCheckError } = await supabase
    .from('wishes')
    .select('id, status, user_id')
    .eq('id', wishId)
    .single();

  if (wishCheckError || !wish) {
    console.error('愿望不存在:', wishCheckError);
    return { ok: false, error: 'Wish not found' };
  }

  if (wish.status === 'fulfilled' || wish.status === 'aiFulfilled') {
    return { ok: false, error: 'Already fulfilled' };
  }

  // 不能实现自己的愿望
  if (wish.user_id === fulfillerId) {
    return { ok: false, error: 'Cannot fulfill own wish' };
  }

  // 2. 更新愿望状态为已实现
  const { error: wishUpdateError } = await supabase
    .from('wishes')
    .update({
      status: 'fulfilled',
      fulfilled_by: fulfillerId,
      fulfilled_message: message,
      fulfilled_image_url: imageUrl || null,
      fulfilled_voice_url: voiceUrl || null,
      fulfilled_at: new Date().toISOString(),
    })
    .eq('id', wishId);

  if (wishUpdateError) {
    console.error('更新愿望状态失败:', wishUpdateError);
    return { ok: false, error: 'Update failed' };
  }

  // 3. 把所有 pending 漂流记录标记为 expired
  await supabase
    .from('wish_drifts')
    .update({ status: 'expired', responded_at: new Date().toISOString() })
    .eq('wish_id', wishId)
    .eq('status', 'pending');

  // 4. 增加实现者的 fulfilled 计数
  const { data: implementer } = await supabase
    .from('users')
    .select('total_fulfilled')
    .eq('id', fulfillerId)
    .single();

  if (implementer) {
    await supabase
      .from('users')
      .update({ total_fulfilled: implementer.total_fulfilled + 1 })
      .eq('id', fulfillerId);
  }

  return { ok: true };
}

/**
 * 获取愿望的漂流轨迹
 */
export async function getWishDriftTrail(wishId: string) {
  const { data, error } = await supabase
    .from('wish_drifts')
    .select(`
      id,
      batch_num,
      status,
      created_at,
      responded_at,
      receiver:users!wish_drifts_receiver_id_fkey(nickname, avatar)
    `)
    .eq('wish_id', wishId)
    .order('batch_num', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return [];
  return data || [];
}

// ============================================
// AI 灯神保底
// ============================================

/**
 * 触发AI灯神保底：5批漂流无人认领，灯神亲自实现
 */
export async function triggerGenieFulfillment(wishId: string): Promise<boolean> {
  // 获取愿望详情
  const { data: wish } = await supabase
    .from('wishes')
    .select('type, content, user_id')
    .eq('id', wishId)
    .single();

  if (!wish) return false;

  // 检测用户语言偏好（通过 user_id 获取）
  const { data: wishOwner } = await supabase
    .from('users')
    .select('language')
    .eq('id', wish.user_id)
    .single();

  const language = (wishOwner?.language as 'zh' | 'en') || 'zh';

  // 调用AI灯神API
  try {
    const response = await fetch('/api/genie-fulfill', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wishType: wish.type,
        wishContent: wish.content,
        language,
      }),
    });

    const result = await response.json();

    // 如果灯神返回了图片URL，嵌入到message中
    const messageWithImage = result.imageUrl
      ? `${result.message}\n\n[GENIE_IMAGE:${result.imageUrl}]`
      : result.message;

    // 更新愿望状态为AI实现
    await supabase
      .from('wishes')
      .update({
        status: 'aiFulfilled',
        fulfilled_message: messageWithImage,
        fulfilled_at: new Date().toISOString(),
      })
      .eq('id', wishId);

    // 标记所有剩余漂流记录为过期
    await supabase
      .from('wish_drifts')
      .update({ status: 'expired', responded_at: new Date().toISOString() })
      .eq('wish_id', wishId)
      .eq('status', 'pending');

    return true;
  } catch (error) {
    console.error('AI灯神保底失败:', error);
    return false;
  }
}

// ============================================
// 漂流超时检查
// ============================================

/**
 * 检查超时的漂流记录（48h未响应）
 * 在页面加载时调用，自动推进过期批次
 */
export async function checkExpiredDrifts(): Promise<number> {
  const now = new Date();
  const expiryTime = new Date(now.getTime() - 48 * 60 * 60 * 1000); // 48小时前

  // 查询所有超时的 pending 漂流记录
  const { data: expiredDrifts } = await supabase
    .from('wish_drifts')
    .select('id, wish_id, batch_num')
    .eq('status', 'pending')
    .lt('created_at', expiryTime.toISOString());

  if (!expiredDrifts || expiredDrifts.length === 0) return 0;

  // 标记为过期
  const expiredIds = expiredDrifts.map((d) => d.id);
  await supabase
    .from('wish_drifts')
    .update({ status: 'expired', responded_at: now.toISOString() })
    .in('id', expiredIds);

  // 对每个受影响的愿望，检查是否需要推进下一批
  const affectedWishIds = [...new Set(expiredDrifts.map((d) => d.wish_id))];

  for (const wishId of affectedWishIds) {
    // 检查该愿望当前批次是否还有 pending
    const { data: pendingInBatch } = await supabase
      .from('wish_drifts')
      .select('id')
      .eq('wish_id', wishId)
      .eq('status', 'pending');

    if (!pendingInBatch || pendingInBatch.length === 0) {
      // 当前批次全部响应完毕，检查是否需要推进
      const { data: wish } = await supabase
        .from('wishes')
        .select('drift_batch, max_batches, user_id, status')
        .eq('id', wishId)
        .single();

      if (wish && wish.status === 'drifting') {
        if (wish.drift_batch < wish.max_batches) {
          await assignDriftBatch(wishId, wish.user_id, wish.drift_batch + 1);
        } else {
          // 已到最大批次，触发AI灯神
          await triggerGenieFulfillment(wishId);
        }
      }
    }
  }

  return expiredDrifts.length;
}

// ============================================
// 工具函数
// ============================================

// 获取设备ID（localStorage）
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';

  let deviceId = localStorage.getItem('aladdin_device_id');
  if (!deviceId) {
    deviceId = `dev_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('aladdin_device_id', deviceId);
  }
  return deviceId;
}

// 获取当前用户ID（localStorage）
export function getCurrentUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('aladdin_user_id');
}

// 保存当前用户ID
export function setCurrentUserId(userId: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('aladdin_user_id', userId);
}
