import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { stripe } from '@/lib/stripe';

// Initialize Firebase Admin SDK
try {
  if (!getApps().length) {
    console.log("Initializing Firebase Admin SDK...");
    initializeApp();
    console.log("Firebase Admin SDK initialized successfully.");
  }
} catch (error: any) {
  console.error("CRITICAL: Firebase Admin SDK initialization failed:", error.message);
}


async function updateUserSubscriptionState(db: FirebaseFirestore.Firestore, stripeCustomerId: string, subscription: Stripe.Subscription) {
    const usersRef = db.collection('users');
    const q = usersRef.where('stripeCustomerId', '==', stripeCustomerId);
    const querySnapshot = await q.get();

    if (querySnapshot.empty) {
        console.error(`Webhook Error: No user found with Stripe Customer ID: ${stripeCustomerId}`);
        return;
    }
    
    const userDoc = querySnapshot.docs[0];
    const userRef = userDoc.ref;
    
    const planType = subscription.status === 'active' || subscription.cancel_at_period_end ? 'pro' : 'free';

    const updateData = {
        planType: planType,
        subscriptionStatus: subscription.status,
        subscriptionPeriodEnd: subscription.current_period_end, // Unix timestamp
        stripeCustomerId: stripeCustomerId,
        // If they cancel and then re-subscribe, we might need to reset credits
        generationCredits: planType === 'pro' ? -1 : 5, 
    };

    console.log(`Updating user ${userDoc.id} with subscription data:`, updateData);
    await userRef.update(updateData);
    console.log(`SUCCESS: User ${userDoc.id} subscription status updated.`);
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

  const session = event.data.object as any;

  // Handle the event
  if (event.type === 'checkout.session.completed') {
    const checkoutSession = event.data.object as Stripe.Checkout.Session;
    console.log("Handling checkout.session.completed event.");
    
    const userId = checkoutSession.client_reference_id;
    const stripeCustomerId = typeof checkoutSession.customer === 'string' ? checkoutSession.customer : checkoutSession.customer?.id;
    const subscriptionId = typeof checkoutSession.subscription === 'string' ? checkoutSession.subscription : checkoutSession.subscription?.id;


    if (!userId || !stripeCustomerId || !subscriptionId) {
      console.error('CRITICAL: Missing required IDs from checkout session.');
      return NextResponse.json({ error: 'Missing user, customer, or subscription ID from checkout session' }, { status: 400 });
    }
    console.log(`User ID: ${userId}, Customer ID: ${stripeCustomerId}, Subscription ID: ${subscriptionId}`);

    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        await updateUserSubscriptionState(db, stripeCustomerId, subscription);
    } catch (error: any)      {
      console.error(`STRIPE/FIRESTORE ERROR: Failed to process checkout for user ${userId}.`, error);
      return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }
  } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    console.log(`Handling ${event.type} event.`);
    
    const stripeCustomerId = typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

    if (!stripeCustomerId) {
        console.error('CRITICAL: Missing customer ID from subscription event.');
        return NextResponse.json({ error: 'Missing customer ID' }, { status: 400 });
    }

     try {
        await updateUserSubscriptionState(db, stripeCustomerId, subscription);
    } catch (error: any)      {
      console.error(`STRIPE/FIRESTORE ERROR: Failed to process subscription update for customer ${stripeCustomerId}.`, error);
      return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
    }

  } else {
      console.log(`Unhandled event type: ${event.type}`);
  }

  // Return a 200 response to acknowledge receipt of the event
  console.log("Webhook processed successfully. Sending 200 response to Stripe.");
  return NextResponse.json({ received: true });
}
