// ============================================
// 实现愿望内容AI审核 - 图片描述+文字留言+语音转写
// ============================================

export interface FulfillmentReviewResult {
  approved: boolean;
  reason?: string;
}

const SYSTEM_PROMPT = `You are a content moderator for Aladdin's Wish Lamp app. A user is fulfilling someone's wish by sending a message, an image, and/or a voice note.

Review ALL provided content and determine if it is appropriate to send to the wish maker.

REJECT if ANY content contains:
- Hate speech, racism, discrimination, or attacks on any group
- Violence, threats, or harm to self/others
- Sexual, explicit, or suggestive content
- Illegal activities (drugs, weapons, fraud, etc.)
- Political attacks on specific countries, leaders, or systems
- Spam, advertising, or promotional content
- Personal attacks, bullying, or harassment
- Scams or deceptive content
- Inappropriate images (described below)
- Excessively negative content that could distress the wish maker

APPROVE if the content is:
- A genuine, heartfelt fulfillment of the wish
- Warm, kind, encouraging, or helpful
- An appropriate image that matches the wish context
- A kind voice message (transcribed below)

Return strictly in JSON format: {"approved": true/false, "reason": "brief explanation"}`;

/**
 * 审核实现愿望的内容（文字+图片描述+语音转写）
 */
export async function reviewFulfillment(
  message: string,
  imageDescription?: string,
  voiceTranscript?: string
): Promise<FulfillmentReviewResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  // 没有 API Key，基础关键词过滤
  if (!apiKey) {
    const blocked = ['广告', '加微信', '加QQ', 'advertising', 'buy now', 'click here', 'http://', 'https://', '推广', 'fuck', 'shit', '色情', '赌博'];
    const allText = `${message} ${imageDescription || ''} ${voiceTranscript || ''}`.toLowerCase();
    for (const kw of blocked) {
      if (allText.includes(kw.toLowerCase())) {
        return { approved: false, reason: 'Contains inappropriate or promotional content' };
      }
    }
    return { approved: true };
  }

  try {
    // 组装审核内容
    let userContent = `Message: ${message}`;
    if (imageDescription) {
      userContent += `\nImage description: ${imageDescription}`;
    }
    if (voiceTranscript) {
      userContent += `\nVoice transcript: ${voiceTranscript}`;
    }

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
          { role: 'user', content: userContent },
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

    let jsonStr = rawContent;
    const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const result = JSON.parse(jsonStr);
    return {
      approved: !!result.approved,
      reason: result.reason || '',
    };
  } catch (error) {
    console.error('Fulfillment review error, defaulting to approve:', error);
    return { approved: true };
  }
}
