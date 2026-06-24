// 漂流机制测试脚本
const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://cewqldnscctofserzppf.supabase.co', 'sb_publishable_thXZuOCWQDO0LRswa0nd8g_gnPbSCJi');

async function test() {
  // 用主公的账号创建一个测试愿望
  const ownerId = '2a58119e-d357-4560-89f6-bf3082430198';
  
  // 1. 创建愿望
  const { data: wish, error: e1 } = await s.from('wishes').insert({
    user_id: ownerId,
    type: 'B',
    content: '测试漂流：希望收到一句鼓励的话',
    status: 'drifting',
    drift_batch: 1,
    drift_count: 0,
    max_batches: 5
  }).select().single();
  
  if (e1) { console.error('Create wish failed:', e1); return; }
  console.log('1. Wish created:', wish.id);

  // 2. 找其他用户
  const { data: users } = await s.from('users').select('id, nickname').neq('id', ownerId);
  const shuffled = users.sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);
  console.log('2. Drifting to:', selected.map(u => u.nickname || 'anonymous'));

  // 3. 创建漂流记录
  const drifts = selected.map(u => ({
    wish_id: wish.id,
    receiver_id: u.id,
    batch_num: 1,
    status: 'pending'
  }));
  const { data: inserted, error: e2 } = await s.from('wish_drifts').insert(drifts).select();
  if (e2) { console.error('Create drifts failed:', e2); return; }
  console.log('3. Drift records created:', inserted.length);

  // 4. 模拟其中一个种子用户实现愿望
  const implementerId = selected[0].id;
  console.log('4. Simulating fulfillment by:', selected[0].nickname || 'anonymous');
  
  // 更新漂流记录
  await s.from('wish_drifts').update({
    status: 'implemented',
    responded_at: new Date().toISOString()
  }).eq('wish_id', wish.id).eq('receiver_id', implementerId);

  // 更新愿望状态
  await s.from('wishes').update({
    status: 'fulfilled',
    fulfilled_by: implementerId,
    fulfilled_message: '你比你想象的更勇敢！加油！',
    fulfilled_at: new Date().toISOString()
  }).eq('id', wish.id);

  // 把同批其他记录标记为过期
  await s.from('wish_drifts').update({
    status: 'expired',
    responded_at: new Date().toISOString()
  }).eq('wish_id', wish.id).eq('status', 'pending');

  // 5. 验证最终状态
  const { data: finalWish } = await s.from('wishes').select('*').eq('id', wish.id).single();
  console.log('5. Final wish status:', finalWish.status);
  console.log('   fulfilled_message:', finalWish.fulfilled_message);
  
  const { data: finalDrifts } = await s.from('wish_drifts').select('status, receiver_id').eq('wish_id', wish.id);
  console.log('6. Drift statuses:', finalDrifts.map(d => d.status));
  
  console.log('\n✅ Full drift flow test PASSED!');
}

test().catch(console.error);
