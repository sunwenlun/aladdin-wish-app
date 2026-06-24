-- ============================================
-- Aladdin Wish App - COMPLETE SETUP SQL
-- 在 Supabase SQL Editor 中粘贴执行（一次性全部运行）
-- 包含：媒体字段 + Auth字段 + Storage + 灯油表 + Admin权限 + 案例数据
-- ============================================

-- ========================================
-- PART 1: wishes 表新增图片和语音字段
-- ========================================
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS fulfilled_image_url TEXT;
ALTER TABLE wishes ADD COLUMN IF NOT EXISTS fulfilled_voice_url TEXT;

-- ========================================
-- PART 2: users 表新增认证字段
-- ========================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_uid UUID;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_uid ON users(auth_uid) WHERE auth_uid IS NOT NULL;

-- ========================================
-- PART 3: Storage Bucket (图片/语音存储)
-- ========================================
INSERT INTO storage.buckets (id, name, public) 
VALUES ('wish-media', 'wish-media', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Anyone can upload wish-media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read wish-media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete wish-media" ON storage.objects;
CREATE POLICY "Anyone can upload wish-media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'wish-media');
CREATE POLICY "Anyone can read wish-media" ON storage.objects
  FOR SELECT USING (bucket_id = 'wish-media');
CREATE POLICY "Anyone can delete wish-media" ON storage.objects
  FOR DELETE USING (bucket_id = 'wish-media');

-- ========================================
-- PART 4: 灯油购买记录表 (Stripe支付)
-- ========================================
CREATE TABLE IF NOT EXISTS oil_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  price_usd DECIMAL(10,2) NOT NULL,
  stripe_session_id TEXT,
  stripe_payment_intent TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_oil_purchases_user ON oil_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_oil_purchases_stripe ON oil_purchases(stripe_session_id);

ALTER TABLE oil_purchases ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert oil purchases" ON oil_purchases;
DROP POLICY IF EXISTS "Anyone can read oil purchases" ON oil_purchases;
DROP POLICY IF EXISTS "Anyone can update oil purchases" ON oil_purchases;
CREATE POLICY "Anyone can insert oil purchases" ON oil_purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can read oil purchases" ON oil_purchases FOR SELECT USING (true);
CREATE POLICY "Anyone can update oil purchases" ON oil_purchases FOR UPDATE USING (true);

-- ========================================
-- PART 5: Admin 管理权限 (DELETE + INSERT for fulfilled_cases)
-- ========================================

-- fulfilled_cases: 允许插入（种子数据/管理后台添加案例）
DROP POLICY IF EXISTS "Anyone can insert cases" ON fulfilled_cases;
DROP POLICY IF EXISTS "Anyone can update cases" ON fulfilled_cases;
DROP POLICY IF EXISTS "Anyone can delete cases" ON fulfilled_cases;
CREATE POLICY "Anyone can insert cases" ON fulfilled_cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update cases" ON fulfilled_cases FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete cases" ON fulfilled_cases FOR DELETE USING (true);

-- wishes: 允许删除（管理后台删除违规愿望）
DROP POLICY IF EXISTS "Anyone can delete wishes" ON wishes;
CREATE POLICY "Anyone can delete wishes" ON wishes FOR DELETE USING (true);

-- users: 允许删除（管理后台封禁用户）
DROP POLICY IF EXISTS "Anyone can delete users" ON users;
CREATE POLICY "Anyone can delete users" ON users FOR DELETE USING (true);

-- ========================================
-- PART 6: 预填案例数据 (12个基础案例 + 6个预告)
-- 使用 ON CONFLICT 避免重复插入
-- ========================================

-- 先清除旧案例（如果存在），重新插入完整数据
DELETE FROM fulfilled_cases WHERE title IN (
  '一年后的自己', 'Dear Future Me', '度过低谷', 'I Am Enough',
  '巴黎的生日', 'Birthday in Kenya', '流浪猫救助站', 'A School for My Village',
  '红烧肉', 'Thank You in 10 Languages', '西藏的星空', 'Northern Lights',
  '为山区孩子捐书', '梅西签名球衣', '寻找失散多年的同学',
  '帮我写一段代码', '西藏旅行搭子', '自由许愿'
);

INSERT INTO fulfilled_cases (type, title, content, author_name, author_country, status, implementer_name, implementer_message, drift_path, fulfilled_at, display_order) VALUES
-- A - 给未来的我
('A', '一年后的自己', '我希望一年后的自己已经学会了弹吉他，能在朋友聚会上弹一首《故乡》。那时的你，一定比现在的我更勇敢。', '小川', '🇨🇳 中国', 'fulfilled', '林小枫', '一年后的你，已经在公司年会上弹了《故乡》。感谢那个许愿的自己，你没有放弃。', 3, '2026-06-15', 1),
('A', 'Dear Future Me', 'I hope by the time you read this, you''ve finally started that small business you always talked about. You got this!', 'James', '🇬🇭 Ghana', 'fulfilled', 'Maya', 'Future you did it! The shop opened last month. You were braver than you thought.', 5, '2026-06-10', 2),
-- B - 一句来自远方的话
('B', '度过低谷', '最近很难熬，希望收到一句能让我撑下去的话。', '匿名旅人', '🇨🇳 中国', 'fulfilled', '远方的朋友', '黑夜再长，黎明终会到来。你已经很了不起了，别忘了抱抱自己。', 2, '2026-06-18', 3),
('B', 'I Am Enough', 'I need to hear that I''m enough just as I am. It''s been a hard year.', 'Aisha', '🇰🇪 Kenya', 'aiFulfilled', 'Genie', 'You are enough. You always have been. The stars don''t try to shine brighter — they just do. So do you.', 15, '2026-06-12', 4),
-- C - 生日快乐
('C', '巴黎的生日', '我最好的朋友明天生日，她一个人在巴黎交换，希望有人能对她说句生日快乐。', '小雨', '🇨🇳 中国', 'fulfilled', 'Émilie', 'Joyeux anniversaire! 我在塞纳河边给你唱了生日歌，巴黎的晚风也祝你快乐。', 4, '2026-06-14', 5),
('C', 'Birthday in Kenya', 'My twin brother is volunteering in Kenya for his birthday. Can someone sing him happy birthday?', 'Daniel', '🇬🇧 UK', 'fulfilled', 'Kwame', 'We sang for him at the village school! The kids made him a card too. Happy birthday, brother!', 7, '2026-06-08', 6),
-- D - 画出我的梦想
('D', '流浪猫救助站', '我的梦想是开一家流浪猫救助站，让每只猫都有温暖的家。希望有人能帮我画出来。', '猫咪姐姐', '🇨🇳 中国', 'fulfilled', '画师小鱼', '画好了！一间阳光房，猫咪们躺在窗台上晒太阳，门口挂着"流浪猫之家"的木牌。你的梦想很美。', 6, '2026-06-16', 7),
('D', 'A School for My Village', 'I dream of building a school in my village in Ghana. Can someone draw what it could look like?', 'Kofi', '🇬🇭 Ghana', 'fulfilled', 'David', 'Here''s your school — bright blue walls, a big mango tree for shade, and kids laughing everywhere. Let''s build it.', 9, '2026-06-05', 8),
-- E - 教我一件事
('E', '红烧肉', '想学怎么做红烧肉，有人愿意教吗？', '阿杰', '🇨🇳 中国', 'fulfilled', '张大厨', '记住三个关键：冰糖炒糖色、五花肉焯水、小火慢炖四十分钟。详细菜谱已发你信箱！', 3, '2026-06-19', 9),
('E', 'Thank You in 10 Languages', 'Teach me how to say "thank you" in 10 languages. I want to travel the world!', 'Lucas', '🇧🇷 Brazil', 'fulfilled', 'Anna', '谢谢(Xièxie)·Merci·Gracias·Danke·Grazie·Arigatō·Shukran·Spasiba·Kamsahamnida·Obrigado. Now go explore! 🌍', 5, '2026-06-11', 10),
-- F - 拍一张照片
('F', '西藏的星空', '想看西藏的星空，但身体原因去不了。希望有人能拍给我看。', '星语', '🇨🇳 中国', 'fulfilled', '高原行者', '在纳木错拍的，海拔4700米，银河就在头顶。这片星空，替你看了。愿你心中也有星河。', 8, '2026-06-13', 11),
('F', 'Northern Lights', 'Can someone take a photo of the Northern Lights for me? I may never get to see them in person.', 'Emma', '🇺🇸 USA', 'fulfilled', 'NorthernSoul', 'Captured in Tromsø, Norway at -15°C. The sky danced green and purple for you. Some wishes travel further than light.', 11, '2026-06-07', 12),
-- 即将上线预告
('A', '为山区孩子捐书', '希望为云南山区小学建一个图书角，让每个孩子都能读到课外书。', '预告', '🔒', 'comingSoon', NULL, NULL, 0, NULL, 101),
('A', '梅西签名球衣', '爸爸是梅西铁粉，他生病了，希望能有一件梅西签名的球衣。', '预告', '🔒', 'comingSoon', NULL, NULL, 0, NULL, 102),
('A', '寻找失散多年的同学', '想找到小学时最好的朋友，我们已经失联15年了。', '预告', '🔒', 'comingSoon', NULL, NULL, 0, NULL, 103),
('A', '帮我写一段代码', '需要一段自动整理照片的Python脚本，有人能教我吗？', '预告', '🔒', 'comingSoon', NULL, NULL, 0, NULL, 104),
('A', '西藏旅行搭子', '一个人不敢去西藏，想找个旅伴一起走318国道。', '预告', '🔒', 'comingSoon', NULL, NULL, 0, NULL, 105),
('A', '自由许愿', '更多愿望类型，即将解锁...', '预告', '🔒', 'comingSoon', NULL, NULL, 0, NULL, 106);

-- ============================================
-- 执行完毕！
-- 1. wishes 表已有 fulfilled_image_url 和 fulfilled_voice_url
-- 2. users 表已有 email、auth_uid、password_hash
-- 3. Storage bucket "wish-media" 已创建（公开读写删）
-- 4. oil_purchases 表已创建
-- 5. Admin 可以删除违规愿望和管理案例
-- 6. 12个基础案例 + 6个预告案例已预填
-- ============================================
