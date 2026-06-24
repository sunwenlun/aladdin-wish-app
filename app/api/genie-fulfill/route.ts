import { NextRequest, NextResponse } from 'next/server';
import { callGenieAI } from '@/lib/genie';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { wishType, wishContent, language } = body;

    if (!wishType || !wishContent) {
      return NextResponse.json(
        { error: 'Missing wishType or wishContent' },
        { status: 400 }
      );
    }

    const result = await callGenieAI({
      wishType,
      wishContent,
      language: language || 'zh',
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Genie fulfill API error:', error);
    return NextResponse.json(
      { error: 'Genie fulfillment failed' },
      { status: 500 }
    );
  }
}
