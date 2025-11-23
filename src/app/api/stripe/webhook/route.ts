import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { initializeApp, getApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Initialize Firebase Admin SDK
// This ensures that we're not re-initializing the app on every hot-reload
if (!getApps().length) {
    initializeApp();
}
const db = getFirestore();

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = headers().get('Stripe-Signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`??  Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      
      // Fulfill the purchase...
      const userId = session.client_reference_id;
      const stripeCustomerId = session.customer;

      if (!userId || !stripeCustomerId) {
        console.error('Missing userId or stripeCustomerId from checkout session');
        return NextResponse.json({ error: 'Missing user or customer ID' }, { status: 400 });
      }

      try {
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
          planType: 'pro',
          regenerationCredits: -1, // unlimited
          stripeCustomerId: stripeCustomerId,
        });
        console.log(`?? User ${userId} successfully upgraded to Pro plan.`);
      } catch (error) {
        console.error('Failed to update user profile in Firestore:', error);
        return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
      }

      break;
    
    // You can handle other events here, like subscription updates or cancellations
    // case 'customer.subscription.deleted':
    //   // ... handle subscription cancellation
    //   break;

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  return NextResponse.json({ received: true });
}
