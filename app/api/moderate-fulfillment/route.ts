import { NextRequest, NextResponse } from 'next/server';
import { reviewFulfillment } from '@/lib/fulfillModeration';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, imageDescription, voiceTranscript } = body;

    if (!message && !imageDescription && !voiceTranscript) {
      return NextResponse.json(
        { error: 'Missing content to review' },
        { status: 400 }
      );
    }

    const result = await reviewFulfillment(message || '', imageDescription, voiceTranscript);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Fulfillment moderation API error:', error);
    return NextResponse.json(
      { approved: true, error: 'Moderation service unavailable' },
      { status: 200 }
    );
  }
}
