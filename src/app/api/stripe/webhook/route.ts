import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { stripe } from '@/lib/stripe';

// Initialize Firebase Admin SDK
// This is safe to run on every request, as it checks if an app is already initialized.
try {
  if (!getApps().length) {
    console.log("Initializing Firebase Admin SDK...");
    initializeApp();
    console.log("Firebase Admin SDK initialized successfully.");
  }
} catch (error: any) {
  console.error("CRITICAL: Firebase Admin SDK initialization failed:", error.message);
}


export async function POST(req: NextRequest) {
  console.log("Stripe webhook POST request received.");

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
      console.error('CRITICAL: STRIPE_WEBHOOK_SECRET is not set.');
      return NextResponse.json({ error: "Server configuration error: Missing webhook secret." }, { status: 500 });
  }
  console.log("Stripe webhook secret is set.");


  // Check if Firebase was initialized
  if (!getApps().length) {
    console.error("Firebase Admin SDK is not initialized. Check server logs for initialization errors.");
    return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const db = getFirestore();
  const body = await req.text();
  const signature = req.headers.get('Stripe-Signature') as string;
  console.log("Received Stripe-Signature header.");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    console.log(`Stripe event constructed successfully. Type: ${event.type}`);
  } catch (err: any) {
    console.error(`Webhook signature verification failed.`, err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    console.log("Handling checkout.session.completed event.");
    
    const userId = session.client_reference_id;
    const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

    if (!userId) {
      console.error('CRITICAL: Missing userId (client_reference_id) from checkout session.');
      return NextResponse.json({ error: 'Missing user ID from checkout session' }, { status: 400 });
    }
    console.log(`User ID found: ${userId}`);

    if (!stripeCustomerId) {
      console.error('CRITICAL: Missing stripeCustomerId from checkout session.');
      return NextResponse.json({ error: 'Missing customer ID from checkout session' }, { status: 400 });
    }
    console.log(`Stripe Customer ID found: ${stripeCustomerId}`);

    try {
      const userRef = db.collection('users').doc(userId);
      console.log(`Attempting to update user profile in Firestore for user: ${userId}`);
      
      const updateData = {
        planType: 'pro',
        regenerationCredits: -1,
        stripeCustomerId: stripeCustomerId,
      };

      await userRef.update(updateData);

      console.log(`SUCCESS: User ${userId} successfully upgraded to Pro plan in Firestore.`);
    } catch (error: any)      {
      console.error(`FIRESTORE ERROR: Failed to update user profile for ${userId}.`, error);
      console.error(`Error code: ${error.code}, Message: ${error.message}`);
      return NextResponse.json({ error: 'Database update failed' }, { status: 500 });
    }
  } else {
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  console.log("Webhook processed successfully. Sending 200 response to Stripe.");
  return NextResponse.json({ received: true });
}
