-- ============================================
-- Aladdin Wish App - Database Schema
-- 在 Supabase SQL Editor 中粘贴执行
-- ============================================

-- 1. 用户表（匿名设备ID注册，每个用户是一个"旅人"）
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_id TEXT UNIQUE NOT NULL,          -- 设备唯一标识
  nickname TEXT,                           -- 旅人昵称（可选）
  avatar TEXT,                             -- 头像emoji
  language TEXT DEFAULT 'en',              -- 偏好语言
  wish_chances INT DEFAULT 3,              -- 剩余许愿次数
  total_wishes INT DEFAULT 0,              -- 累计许愿数
  total_fulfilled INT DEFAULT 0,           -- 累计实现他人愿望数
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 愿望表
CREATE TABLE IF NOT EXISTS wishes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,                      -- A/B/C/D/E/F/Z
  content TEXT NOT NULL,                   -- 愿望内容（≤200字）
  status TEXT DEFAULT 'drifting',          -- drifting/received/implementing/fulfilled/aiFulfilled
  drift_batch INT DEFAULT 0,              -- 当前漂流批次（0-5）
  drift_count INT DEFAULT 0,              -- 累计漂流人数
  max_batches INT DEFAULT 5,              -- 最大漂流批次
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  fulfilled_at TIMESTAMPTZ,               -- 实现时间
  fulfilled_by UUID REFERENCES users(id), -- 实现者ID
  fulfilled_message TEXT                  -- 实现者留言
);

-- 3. 漂流记录表（记录谁收到了哪个愿望、在第几批、做了什么操作）
CREATE TABLE IF NOT EXISTS wish_drifts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  wish_id UUID REFERENCES wishes(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES users(id) ON DELETE CASCADE,
  batch_num INT NOT NULL,                  -- 第几批漂流
  status TEXT DEFAULT 'pending',           -- pending/accepted/implemented/forwarded/drifted/peace/expired
  created_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ,               -- 响应时间
  forward_to TEXT                          -- 转发目标（联系方式/链接等）
);

-- 4. 首页展示案例表（已实现的愿望精选展示）
CREATE TABLE IF NOT EXISTS fulfilled_cases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_country TEXT NOT NULL,
  status TEXT NOT NULL,                    -- fulfilled/aiFulfilled/comingSoon
  implementer_name TEXT,
  implementer_message TEXT,
  drift_path INT DEFAULT 0,
  fulfilled_at DATE,
  display_order INT DEFAULT 0,             -- 展示排序
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 索引
-- ============================================
CREATE INDEX IF NOT EXISTS idx_wishes_user_id ON wishes(user_id);
CREATE INDEX IF NOT EXISTS idx_wishes_status ON wishes(status);
CREATE INDEX IF NOT EXISTS idx_drifts_wish_id ON wish_drifts(wish_id);
CREATE INDEX IF NOT EXISTS idx_drifts_receiver_id ON wish_drifts(receiver_id);
CREATE INDEX IF NOT EXISTS idx_drifts_status ON wish_drifts(status);
CREATE INDEX IF NOT EXISTS idx_cases_active ON fulfilled_cases(is_active, display_order);

-- ============================================
-- Row Level Security (RLS) 策略
-- MVP阶段先用宽松策略，后续收紧
-- ============================================

-- users 表：用户只能读写自己的记录
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (true);
CREATE POLICY "Users can insert own data" ON users FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (true);

-- wishes 表：所有用户可读（漂流需要看到别人的愿望），可创建/更新自己的
ALTER TABLE wishes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read wishes" ON wishes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert wishes" ON wishes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update wishes" ON wishes FOR UPDATE USING (true);

-- wish_drifts 表：所有用户可读（需要看到漂流给自己的愿望），可创建/更新
ALTER TABLE wish_drifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read drifts" ON wish_drifts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert drifts" ON wish_drifts FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update drifts" ON wish_drifts FOR UPDATE USING (true);

-- fulfilled_cases 表：公开可读
ALTER TABLE fulfilled_cases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cases" ON fulfilled_cases FOR SELECT USING (true);

-- ============================================
-- 插入初始展示案例数据
-- ============================================
INSERT INTO fulfilled_cases (type, title, content, author_name, author_country, status, implementer_name, implementer_message, drift_path, fulfilled_at, display_order) VALUES
-- A - 给未来的我
('A', '一年后的自己', '我希望一年后的自己已经学会了弹吉他，能在朋友聚会上弹一首《故乡》。那时的你，一定比现在的我更勇敢。', '小川', '🇨🇳 中国', 'fulfilled', '林小枫', '一年后的你，已经在公司年会上弹了《故乡》。感谢那个许愿的自己，你没有放弃。', 3, '2026-06-15', 1),
('A', 'Dear Future Me', 'I hope by the time you read this, you''ve finally started that small business you always talked about. You got this!', 'James', '🇬🇭 Ghana', 'fulfilled', 'Maya', 'Future you did it! The shop opened last month. You were braver than you thought.', 5, '2026-06-10', 2),
-- B - 一句来自远方的话
('B', '度过低谷', '最近很难熬，希望收到一句能让我撑下去的话。', '匿名旅人', '🇨🇳 中国', 'fulfilled', '远方的朋友', '黑夜再长，黎明终会到来。你已经很了不起了，别忘了抱抱自己。', 2, '2026-06-18', 3),
('B', 'I Am Enough', 'I need to hear that I''m enough just as I am. It''s been a hard year.', 'Aisha', '🇰🇪 Kenya', 'aiFulfilled', '灯神', 'You are enough. You always have been. The stars don''t try to shine brighter — they just do. So do you.', 15, '2026-06-12', 4),
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
-- 自动更新 updated_at 触发器
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_wishes_updated_at BEFORE UPDATE ON wishes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
