import { NextRequest, NextResponse } from 'next/server';
import { reviewWish } from '@/lib/wishReview';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content } = body;

    if (!content || typeof content !== 'string') {
      return NextResponse.json(
        { error: 'Missing content' },
        { status: 400 }
      );
    }

    const result = await reviewWish(content);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Wish review API error:', error);
    return NextResponse.json(
      { approved: true, error: 'Review service unavailable' },
      { status: 200 }
    );
  }
}
