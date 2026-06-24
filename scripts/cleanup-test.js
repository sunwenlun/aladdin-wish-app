// 清理测试数据
const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://cewqldnscctofserzppf.supabase.co', 'sb_publishable_thXZuOCWQDO0LRswa0nd8g_gnPbSCJi');

async function cleanup() {
  // 删除测试愿望的漂流记录
  const { data: testWishes } = await s.from('wishes').select('id').ilike('content', '%测试漂流%');
  if (testWishes && testWishes.length > 0) {
    const ids = testWishes.map(w => w.id);
    await s.from('wish_drifts').delete().in('wish_id', ids);
    await s.from('wishes').delete().in('id', ids);
    console.log('Cleaned up', ids.length, 'test wishes');
  } else {
    console.log('No test wishes to clean');
  }
}

cleanup().catch(console.error);
