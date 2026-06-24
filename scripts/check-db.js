// ============================================
// Aladdin DB Diagnostics & Seed Script
// 检查数据库状态，尝试执行可执行的操作
// ============================================

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://cewqldnscctofserzppf.supabase.co';
const supabaseAnonKey = 'sb_publishable_thXZuOCWQDO0LRswa0nd8g_gnPbSCJi';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkDatabase() {
  console.log('====================================');
  console.log('Aladdin DB Diagnostics');
  console.log('====================================\n');

  // 1. 检查 users 表
  console.log('1. Checking users table...');
  const { data: users, error: usersError, count: userCount } = await supabase
    .from('users')
    .select('*', { count: 'exact' })
    .limit(1);
  
  if (usersError) {
    console.log('   ❌ users table error:', usersError.message);
  } else {
    console.log(`   ✅ users table OK - ${userCount} users`);
    if (users && users[0]) {
      console.log('   Fields:', Object.keys(users[0]).join(', '));
      const hasEmail = 'email' in users[0];
      const hasAuthUid = 'auth_uid' in users[0];
      console.log(`   email field: ${hasEmail ? '✅' : '❌ (SQL not executed yet)'}`);
      console.log(`   auth_uid field: ${hasAuthUid ? '✅' : '❌ (SQL not executed yet)'}`);
    }
  }

  // 2. 检查 wishes 表
  console.log('\n2. Checking wishes table...');
  const { data: wishes, error: wishesError, count: wishCount } = await supabase
    .from('wishes')
    .select('*', { count: 'exact' })
    .limit(1);
  
  if (wishesError) {
    console.log('   ❌ wishes table error:', wishesError.message);
  } else {
    console.log(`   ✅ wishes table OK - ${wishCount} wishes`);
    if (wishes && wishes[0]) {
      const hasImage = 'fulfilled_image_url' in wishes[0];
      const hasVoice = 'fulfilled_voice_url' in wishes[0];
      console.log(`   fulfilled_image_url: ${hasImage ? '✅' : '❌ (SQL not executed)'}`);
      console.log(`   fulfilled_voice_url: ${hasVoice ? '✅' : '❌ (SQL not executed)'}`);
    }
  }

  // 3. 检查 fulfilled_cases 表
  console.log('\n3. Checking fulfilled_cases table...');
  const { data: cases, error: casesError, count: caseCount } = await supabase
    .from('fulfilled_cases')
    .select('*', { count: 'exact' })
    .eq('is_active', true);
  
  if (casesError) {
    console.log('   ❌ fulfilled_cases error:', casesError.message);
  } else {
    console.log(`   ✅ fulfilled_cases OK - ${caseCount} cases`);
    if (cases && cases.length > 0) {
      const fulfilled = cases.filter(c => c.status === 'fulfilled' || c.status === 'aiFulfilled').length;
      const comingSoon = cases.filter(c => c.status === 'comingSoon').length;
      console.log(`   - Fulfilled/AI: ${fulfilled}`);
      console.log(`   - Coming Soon: ${comingSoon}`);
    }
  }

  // 4. 检查 oil_purchases 表
  console.log('\n4. Checking oil_purchases table...');
  const { data: purchases, error: purchasesError, count: purchaseCount } = await supabase
    .from('oil_purchases')
    .select('*', { count: 'exact' })
    .limit(1);
  
  if (purchasesError) {
    console.log('   ❌ oil_purchases error:', purchasesError.message);
    console.log('   → SQL not executed yet (table does not exist)');
  } else {
    console.log(`   ✅ oil_purchases OK - ${purchaseCount} purchases`);
  }

  // 5. 检查 wish_drifts 表
  console.log('\n5. Checking wish_drifts table...');
  const { error: driftsError, count: driftCount } = await supabase
    .from('wish_drifts')
    .select('*', { count: 'exact', head: true });
  
  if (driftsError) {
    console.log('   ❌ wish_drifts error:', driftsError.message);
  } else {
    console.log(`   ✅ wish_drifts OK - ${driftCount} drifts`);
  }

  // 6. 汇总诊断
  console.log('\n====================================');
  console.log('Diagnostic Summary');
  console.log('====================================');
  
  const schemaOk = !usersError && !wishesError && !casesError;
  const mediaFieldsOk = wishes && wishes[0] && 'fulfilled_image_url' in wishes[0];
  const authFieldsOk = users && users[0] && 'email' in users[0];
  const oilTableOk = !purchasesError;
  const casesOk = caseCount > 0;

  console.log(`Base schema:        ${schemaOk ? '✅' : '❌'}`);
  console.log(`Media fields:       ${mediaFieldsOk ? '✅' : '❌ (run supabase-complete-setup.sql)'}`);
  console.log(`Auth fields:        ${authFieldsOk ? '✅' : '❌ (run supabase-complete-setup.sql)'}`);
  console.log(`Oil purchases table: ${oilTableOk ? '✅' : '❌ (run supabase-complete-setup.sql)'}`);
  console.log(`Case data:          ${casesOk ? `✅ (${caseCount} cases)` : '❌ (run supabase-complete-setup.sql)'}`);

  if (!mediaFieldsOk || !authFieldsOk || !oilTableOk || !casesOk) {
    console.log('\n⚠️  ACTION NEEDED:');
    console.log('   1. Go to Supabase Dashboard → SQL Editor');
    console.log('   2. Copy & paste the contents of supabase-complete-setup.sql');
    console.log('   3. Click "Run"');
    console.log('   4. Then go to Authentication → Providers → Email → Enable');
    console.log('');
  } else {
    console.log('\n✅ All checks passed! Database is ready.');
  }

  // 7. 如果案例数据不存在，尝试插入
  if (schemaOk && !casesOk) {
    console.log('\nAttempting to seed case data via REST API...');
    const seedCases = [
      { type: 'A', title: 'Dear Future Me', content: 'I hope by the time you read this, you\'ve finally started that small business you always talked about. You got this!', author_name: 'James', author_country: '🇬🇭 Ghana', status: 'fulfilled', implementer_name: 'Maya', implementer_message: 'Future you did it! The shop opened last month.', drift_path: 5, fulfilled_at: '2026-06-10', display_order: 2, is_active: true },
      { type: 'B', title: 'I Am Enough', content: 'I need to hear that I\'m enough just as I am. It\'s been a hard year.', author_name: 'Aisha', author_country: '🇰🇪 Kenya', status: 'aiFulfilled', implementer_name: 'Genie', implementer_message: 'You are enough. You always have been.', drift_path: 15, fulfilled_at: '2026-06-12', display_order: 4, is_active: true },
    ];

    const { error: insertError } = await supabase
      .from('fulfilled_cases')
      .insert(seedCases);

    if (insertError) {
      console.log('   ❌ Insert failed (RLS blocks INSERT):', insertError.message);
      console.log('   → You MUST run supabase-complete-setup.sql in SQL Editor first');
    } else {
      console.log('   ✅ Seed data inserted successfully!');
    }
  }
}

checkDatabase().catch(console.error);
