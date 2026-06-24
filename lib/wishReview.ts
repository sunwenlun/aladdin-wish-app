// ============================================
// 愿望AI审核 - 使用DeepSeek判断愿望是否合规
// ============================================

export interface WishReviewResult {
  approved: boolean;
  reason?: string;
}

const SYSTEM_PROMPT = `You are a wish content moderator for Aladdin's Wish Lamp app. Review the user's wish and determine if it is appropriate.

REJECT if the wish contains any of the following:
- Hate speech, racism, discrimination, or attacks on any group
- Violence, threats, or harm to self/others
- Sexual or explicit content
- Illegal activities (drugs, weapons, fraud, etc.)
- Political attacks on specific countries, leaders, or systems
- Spam, advertising, or promotional content
- Personal attacks, bullying, or harassment of specific individuals
- Scams or deceptive content
- Excessively negative or harmful content that could distress others

APPROVE if the wish is:
- A genuine personal wish, hope, or dream
- Emotional, heartfelt, or vulnerable
- Asking for help, comfort, or connection
- Creative, fun, or lighthearted
- About learning, sharing, or giving
- Any normal human wish that doesn't violate the above

Return strictly in JSON format: {"approved": true/false, "reason": "brief explanation in the same language as the wish"}`;

/**
 * 调用DeepSeek API审核愿望内容
 */
export async function reviewWish(content: string): Promise<WishReviewResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  // 没有 API Key，直接通过（开发环境降级）
  if (!apiKey) {
    // 基础关键词过滤
    const blocked = ['广告', '加微信', '加QQ', 'advertising', 'buy now', 'click here', 'http://', 'https://', '推广'];
    const lower = content.toLowerCase();
    for (const kw of blocked) {
      if (lower.includes(kw.toLowerCase())) {
        return { approved: false, reason: 'Contains promotional or spam content' };
      }
    }
    return { approved: true };
  }

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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: content },
        ],
        max_tokens: 100,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content?.trim();

    if (!rawContent) {
      throw new Error('Empty response');
    }

    // 解析JSON
    let jsonStr = rawContent;
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const result = JSON.parse(jsonStr);
    return {
      approved: !!result.approved,
      reason: result.reason || '',
    };
  } catch (error) {
    console.error('Wish review error, defaulting to approve:', error);
    // 审核出错时默认通过，避免阻塞用户
    return { approved: true };
  }
}
