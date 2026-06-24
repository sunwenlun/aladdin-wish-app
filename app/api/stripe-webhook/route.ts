import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    return NextResponse.json(
      { error: 'Stripe not configured' },
      { status: 503 }
    );
  }

  const stripe = new Stripe(stripeSecretKey);
  const body = await request.text();
  const signature = request.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id || session.metadata?.user_id;
      const oilAmount = parseInt(session.metadata?.oil_amount || '0', 10);

      if (userId && oilAmount > 0) {
        // 1. 增加用户愿望次数
        const { data: user } = await supabase
          .from('users')
          .select('wish_chances')
          .eq('id', userId)
          .single();

        if (user) {
          await supabase
            .from('users')
            .update({
              wish_chances: user.wish_chances + oilAmount,
              updated_at: new Date().toISOString(),
            })
            .eq('id', userId);
        }

        // 2. 更新购买记录状态
        await supabase
          .from('oil_purchases')
          .update({
            status: 'paid',
            stripe_payment_intent: session.payment_intent as string,
            paid_at: new Date().toISOString(),
          })
          .eq('stripe_session_id', session.id);
      }
      break;
    }

    case 'checkout.session.expired':
    case 'charge.failed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.id) {
        await supabase
          .from('oil_purchases')
          .update({ status: 'failed' })
          .eq('stripe_session_id', session.id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
