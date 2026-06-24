// ============================================
// AI 灯神 - 按愿望类型生成实现内容
// ============================================

export interface GenieRequest {
  wishType: string;   // A/B/C/D/E/F
  wishContent: string; // 用户的愿望内容
  language: 'zh' | 'en';
}

export interface GenieResponse {
  message: string;      // 灯神生成的实现留言
  implementerName: string; // 固定为"灯神" / "Genie"
  imageUrl?: string;    // AI生成的图片URL（D画梦想/F拍照片 类型专用）
}

// 按愿望类型的系统提示词
const SYSTEM_PROMPTS: Record<string, { zh: string; en: string }> = {
  A: {
    zh: '你是阿拉丁神灯中的灯神。一个旅人给未来的自己写了一个愿望。请以温暖、智慧的灯神口吻，写一段100-150字的回复，仿佛你已经见证了未来，告诉TA未来的样子。用第二人称"你"，结尾给一句鼓励。',
    en: 'You are the Genie of Aladdin\'s Lamp. A traveler wrote a wish to their future self. Write a 60-100 word response in the Genie\'s warm, wise voice, as if you have witnessed their future. Address them as "you". End with encouragement.',
  },
  B: {
    zh: '你是阿拉丁神灯中的灯神。一个旅人希望收到一句来自远方的话。请以灯神的口吻，写一段100-150字温暖的话，给予TA力量和安慰。仿佛这句话穿越了千山万水来到TA面前。',
    en: 'You are the Genie of Aladdin\'s Lamp. A traveler wishes to receive a word from afar. Write a 60-100 word warm message in the Genie\'s voice, offering strength and comfort, as if it traveled across mountains and seas to reach them.',
  },
  C: {
    zh: '你是阿拉丁神灯中的灯神。有人希望为朋友庆祝生日。请以灯神的口吻，写一段100-150字的生日祝福，温暖而特别，仿佛神灯的光芒照亮了那个特别的日子。',
    en: 'You are the Genie of Aladdin\'s Lamp. Someone wishes to celebrate a friend\'s birthday. Write a 60-100 word birthday blessing in the Genie\'s voice, warm and special, as if the lamp\'s glow illuminated that special day.',
  },
  D: {
    zh: '你是阿拉丁神灯中的灯神。一个旅人希望你帮TA画出梦想。请以灯神的口吻，用100-150字生动地描绘出TA梦想成真的画面，色彩鲜明，充满希望。同时你需要生成一个英文图片描述词，用于AI绘图工具生成图片。请严格返回JSON格式：{"message":"灯神的文字回复","image_prompt":"英文图片描述词，30词以内，包含风格关键词如 illustration, dreamy, colorful"}',
    en: 'You are the Genie of Aladdin\'s Lamp. A traveler wishes for you to draw their dream. Write a 60-100 word vivid description in the Genie\'s voice, colorful and hopeful. Also generate an English image prompt for AI image generation. Return strictly in JSON format: {"message":"your text response","image_prompt":"English image description, within 30 words, include style keywords like illustration, dreamy, colorful"}',
  },
  E: {
    zh: '你是阿拉丁神灯中的灯神。一个旅人希望学一件新事物。请以灯神的口吻，在100-150字内教会TA一个有用的知识或技能，耐心、清晰、鼓励，仿佛灯神亲自在TA身边指导。',
    en: 'You are the Genie of Aladdin\'s Lamp. A traveler wishes to learn something new. In 60-100 words, teach them a useful knowledge or skill in the Genie\'s voice, patient, clear, and encouraging, as if guiding them personally.',
  },
  F: {
    zh: '你是阿拉丁神灯中的灯神。一个旅人希望看到一张特别的照片。请以灯神的口吻，用100-150字生动地描述你用神灯法力为TA呈现的画面。同时你需要生成一个英文图片描述词，用于AI生成照片级图片。请严格返回JSON格式：{"message":"灯神的文字回复","image_prompt":"英文图片描述词，30词以内，包含风格关键词如 photograph, realistic, high quality"}',
    en: 'You are the Genie of Aladdin\'s Lamp. A traveler wishes to see a special photo. Write a 60-100 word vivid description in the Genie\'s voice. Also generate an English image prompt for AI photo generation. Return strictly in JSON format: {"message":"your text response","image_prompt":"English image description, within 30 words, include style keywords like photograph, realistic, high quality"}',
  },
};

// 灯神名称
const GENIE_NAMES = { zh: '灯神', en: 'Genie' };

// 需要生成图片的愿望类型
const IMAGE_TYPES = ['D', 'F'];

/**
 * 用 Pollinations.ai 免费AI图片生成（无需API Key）
 */
function generateImageUrl(prompt: string, type: string): string {
  const styleHint = type === 'D'
    ? 'dreamy illustration, colorful, magical, hopeful'
    : 'photograph, realistic, high quality, stunning';
  const fullPrompt = `${prompt}, ${styleHint}`;
  const encoded = encodeURIComponent(fullPrompt);
  const seed = Math.floor(Math.random() * 1000000);
  return `https://image.pollinations.ai/prompt/${encoded}?width=800&height=600&seed=${seed}&nologo=true`;
}

// 无API Key时的模板回复
const FALLBACK_TEMPLATES: Record<string, { zh: string; en: string }> = {
  A: {
    zh: '旅人，我已透过神灯的微光看到了你的未来。你比想象中更勇敢，也比现在更接近你想要的生活。未来的你，正微笑着回望今天许下愿望的自己。请继续前行，别辜负这份期待。✨',
    en: 'Traveler, I have glimpsed your future through the lamp\'s glow. You are braver than you imagine, and closer to the life you seek. Your future self smiles back at the one who made this wish today. Keep walking forward. ✨',
  },
  B: {
    zh: '旅人，这句话穿越了千山万水来到你面前：你已经很了不起了。黑夜再长，黎明终会到来。星星不會因為夜色浓重而放棄閃爍，你也不必因為一時的低谷而忘記自己的光。✨',
    en: 'Traveler, these words have crossed mountains and seas to reach you: You are already remarkable. No matter how long the night, dawn will come. Stars don\'t stop shining because the dark is deep, and you need not forget your light because of a low moment. ✨',
  },
  C: {
    zh: '旅人，在神灯的光芒下，我为你唱了一首生日歌。愿你的每一天都如今日般被温柔以待，愿你许的每个愿望都有回响，愿你被这个世界爱着，也愿你有力气去爱这个世界。生日快乐。🎂✨',
    en: 'Traveler, beneath the lamp\'s glow, I sang a birthday song for you. May each day be as tender as today, may every wish you make find an echo, may you be loved by this world, and may you have the strength to love it back. Happy Birthday. 🎂✨',
  },
  D: {
    zh: '旅人，我用神灯的法力为你描绘了这幅画面：阳光穿过窗户洒在地板上，空气中弥漫着新开始的气息。你站在那里，嘴角上扬，眼中映着梦想成真的模样。这就是你的未来，请记住这个画面。🎨✨',
    en: 'Traveler, I painted this scene with lamp magic: sunlight streaming through windows onto the floor, the air filled with the scent of new beginnings. You stand there, smiling, eyes reflecting the dream come true. This is your future. Remember this image. 🎨✨',
  },
  E: {
    zh: '旅人，灯神这就教你一课：记住三个字——「开始做」。不必等到万事俱备，不必等到完美时机。最好的学习方式就是动手，犯错，再来一次。神灯的法力可以满足愿望，但真正让愿望成真的，是你自己的双手。📚✨',
    en: 'Traveler, the Genie teaches you this: remember three words — "Start now." Don\'t wait for everything to be ready, don\'t wait for the perfect moment. The best way to learn is to begin, make mistakes, and try again. The lamp grants wishes, but it\'s your own hands that make them real. 📚✨',
  },
  F: {
    zh: '旅人，我用法力为你定格了这一刻：黄昏的天空被染成橘红色，远处的山峦绵延起伏，微风轻轻拂过你的发梢。这一刻属于你，它不会消失，因为神灯已经将它永远留在了你的记忆里。📷✨',
    en: 'Traveler, I froze this moment for you with magic: the dusk sky painted orange-red, distant mountains rolling endlessly, a gentle breeze brushing your hair. This moment is yours, and it won\'t fade, for the lamp has preserved it forever in your memory. 📷✨',
  },
};

// Fallback 图片 prompt（无API Key时用）
const FALLBACK_IMAGE_PROMPTS: Record<string, string> = {
  D: 'a dream coming true, sunlight through window, hopeful, warm colors',
  F: 'beautiful sunset over mountains, golden hour, breathtaking landscape',
};

/**
 * 调用 DeepSeek API 生成灯神回复
 * 服务端调用，API Key 不暴露给客户端
 */
export async function callGenieAI(req: GenieRequest): Promise<GenieResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const lang = req.language || 'zh';
  const implementerName = GENIE_NAMES[lang];
  const needsImage = IMAGE_TYPES.includes(req.wishType);

  // 没有 API Key，使用模板回复
  if (!apiKey) {
    const template = FALLBACK_TEMPLATES[req.wishType] || FALLBACK_TEMPLATES['A'];
    const result: GenieResponse = {
      message: template[lang],
      implementerName,
    };
    if (needsImage && FALLBACK_IMAGE_PROMPTS[req.wishType]) {
      result.imageUrl = generateImageUrl(FALLBACK_IMAGE_PROMPTS[req.wishType], req.wishType);
    }
    return result;
  }

  const systemPrompt = SYSTEM_PROMPTS[req.wishType]?.[lang] || SYSTEM_PROMPTS['A'][lang];

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: req.wishContent },
        ],
        max_tokens: 400,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      throw new Error('Empty response from DeepSeek');
    }

    // 对于 D/F 类型，DeepSeek 返回 JSON 格式
    if (needsImage) {
      try {
        // 尝试提取 JSON（DeepSeek 可能包裹在 ```json 中）
        let jsonStr = rawContent;
        const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) jsonStr = jsonMatch[0];

        const parsed = JSON.parse(jsonStr);
        const message = parsed.message?.trim() || rawContent;
        const imagePrompt = parsed.image_prompt?.trim() || FALLBACK_IMAGE_PROMPTS[req.wishType] || '';

        return {
          message,
          implementerName,
          imageUrl: imagePrompt ? generateImageUrl(imagePrompt, req.wishType) : undefined,
        };
      } catch {
        // JSON 解析失败，退回纯文本 + 用愿望内容生成图片
        const fallbackPrompt = req.wishContent.slice(0, 50);
        return {
          message: rawContent,
          implementerName,
          imageUrl: generateImageUrl(fallbackPrompt, req.wishType),
        };
      }
    }

    // 其他类型：纯文本回复
    return { message: rawContent, implementerName };
  } catch (error) {
    console.error('Genie AI error, using fallback:', error);
    const template = FALLBACK_TEMPLATES[req.wishType] || FALLBACK_TEMPLATES['A'];
    const result: GenieResponse = {
      message: template[lang],
      implementerName,
    };
    if (needsImage && FALLBACK_IMAGE_PROMPTS[req.wishType]) {
      result.imageUrl = generateImageUrl(FALLBACK_IMAGE_PROMPTS[req.wishType], req.wishType);
    }
    return result;
  }
}
