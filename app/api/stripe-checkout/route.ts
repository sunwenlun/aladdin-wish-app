import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

// 灯油套餐定义（USD）
const OIL_PACKAGES: Record<string, { amount: number; priceUsd: number; name: string }> = {
  small: { amount: 1, priceUsd: 0.99, name: '1 Oil Refill' },
  medium: { amount: 3, priceUsd: 2.99, name: '3 Oil Refills (Most Popular)' },
  large: { amount: 10, priceUsd: 6.99, name: '10 Oil Refills' },
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { packageId, userId } = body;

    if (!packageId || !userId) {
      return NextResponse.json(
        { error: 'Missing packageId or userId' },
        { status: 400 }
      );
    }

    const pkg = OIL_PACKAGES[packageId];
    if (!pkg) {
      return NextResponse.json(
        { error: 'Invalid package' },
        { status: 400 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    // 没有 Stripe Key → 降级为直接增加次数（开发模式）
    if (!stripeSecretKey) {
      // 直接给用户加次数
      const { data: user } = await supabase
        .from('users')
        .select('wish_chances')
        .eq('id', userId)
        .single();

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      await supabase
        .from('users')
        .update({ wish_chances: user.wish_chances + pkg.amount })
        .eq('id', userId);

      // 记录购买（无Stripe信息）
      await supabase
        .from('oil_purchases')
        .insert({
          user_id: userId,
          amount: pkg.amount,
          price_usd: pkg.priceUsd,
          status: 'paid',
        });

      return NextResponse.json({
        success: true,
        mode: 'dev',
        message: 'Oil refilled (dev mode - no Stripe)',
      });
    }

    // 正式 Stripe 流程
    const stripe = new Stripe(stripeSecretKey);
    const origin = request.headers.get('origin') || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `🪔 Aladdin's Wish Lamp - ${pkg.name}`,
              description: `${pkg.amount} wish chances for Aladdin's Wish Lamp app`,
              images: [`${origin}/genie-lamp-icon.png`],
            },
            unit_amount: Math.round(pkg.priceUsd * 100), // cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/wish?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/wish?payment=cancelled`,
      client_reference_id: userId,
      metadata: {
        package_id: packageId,
        oil_amount: String(pkg.amount),
        user_id: userId,
      },
    });

    // 记录购买（pending状态）
    await supabase
      .from('oil_purchases')
      .insert({
        user_id: userId,
        amount: pkg.amount,
        price_usd: pkg.priceUsd,
        stripe_session_id: session.id,
        status: 'pending',
      });

    return NextResponse.json({
      success: true,
      mode: 'stripe',
      sessionId: session.id,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: 'Checkout failed' },
      { status: 500 }
    );
  }
}
