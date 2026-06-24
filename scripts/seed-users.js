// 创建种子用户脚本 - 用于漂流机制测试
// 运行: node scripts/seed-users.js
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://cewqldnscctofserzppf.supabase.co';
const SUPABASE_KEY = 'sb_publishable_thXZuOCWQDO0LRswa0nd8g_gnPbSCJi';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const seedUsers = [
  { device_id: 'seed_001', nickname: 'Maya', avatar: '🌙', language: 'en' },
  { device_id: 'seed_002', nickname: 'Kofi', avatar: '🦁', language: 'en' },
  { device_id: 'seed_003', nickname: '小雨', avatar: '🌸', language: 'zh' },
  { device_id: 'seed_004', nickname: 'Anna', avatar: '⭐', language: 'en' },
  { device_id: 'seed_005', nickname: '阿杰', avatar: '🎯', language: 'zh' },
  { device_id: 'seed_006', nickname: 'Lucas', avatar: '🌊', language: 'en' },
];

async function seed() {
  console.log('Creating seed users...');
  for (const u of seedUsers) {
    const { data, error } = await supabase
      .from('users')
      .upsert(u, { onConflict: 'device_id' })
      .select()
      .single();
    if (error) {
      console.error(`Failed: ${u.nickname}`, error.message);
    } else {
      console.log(`OK: ${u.nickname} (${data.id})`);
    }
  }
  console.log('Done!');
}

seed();
