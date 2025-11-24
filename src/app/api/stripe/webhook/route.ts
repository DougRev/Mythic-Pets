import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { headers } from 'next/headers';
import { initializeApp, getApp, getApps, ServiceAccount, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Stripe
const stripeSecretKey = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY as string;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;

const stripe = new Stripe(stripeSecretKey);

// Securely parse the service account key from the environment variable
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT as string);

// Initialize Firebase Admin SDK
// This ensures that we're not re-initializing the app on every hot-reload
if (!getApps().length) {
    initializeApp({
        credential: cert(serviceAccount)
    });
}
const db = getFirestore();

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get('Stripe-Signature') as string;

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

      if (!userId) {
        console.error('Missing userId from checkout session metadata');
        return NextResponse.json({ error: 'Missing user ID' }, { status: 400 });
      }

      try {
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
          planType: 'pro',
          regenerationCredits: -1, // unlimited
          stripeCustomerId: stripeCustomerId || null,
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
