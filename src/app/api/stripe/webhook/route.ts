
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeApp, getApps, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { stripe } from '@/lib/stripe';

// Initialize Firebase Admin SDK
try {
  if (!getApps().length) {
    console.log("Initializing Firebase Admin SDK...");
    initializeApp({ credential: applicationDefault() });
    console.log("Firebase Admin SDK initialized successfully.");
  }
} catch (error: any) {
  console.error("CRITICAL: Firebase Admin SDK initialization failed:", error.message);
}


async function updateUserSubscriptionState(db: FirebaseFirestore.Firestore, stripeCustomerId: string, subscription: Stripe.Subscription, userId?: string | null) {
    console.log(`[updateUserSubscriptionState] Called with customerId: ${stripeCustomerId}, userId: ${userId}`);
    
    let userRef: FirebaseFirestore.DocumentReference | null = null;
    let userDoc: FirebaseFirestore.DocumentSnapshot | null = null;

    if (userId) {
        // Preferred method: direct lookup by UID
        console.log(`[updateUserSubscriptionState] Attempting direct lookup with userId: ${userId}`);
        userRef = db.collection('users').doc(userId);
        userDoc = await userRef.get();
        if (!userDoc.exists) {
            console.warn(`[updateUserSubscriptionState] No user found with direct userId: ${userId}. Falling back to customerId lookup.`);
            userRef = null; // Reset userRef to allow fallback
        } else {
             console.log(`[updateUserSubscriptionState] Found user ${userDoc.id} via direct userId.`);
        }
    }

    if (!userRef) {
        // Fallback method: query by stripeCustomerId
        console.log(`[updateUserSubscriptionState] Attempting fallback lookup with stripeCustomerId: ${stripeCustomerId}`);
        const usersCol = db.collection('users');
        const q = usersCol.where('stripeCustomerId', '==', stripeCustomerId);
        const querySnapshot = await q.get();

        if (querySnapshot.empty) {
            console.error(`Webhook Error: No user found with Stripe Customer ID: ${stripeCustomerId} and no fallback userId was provided.`);
            return;
        }
        
        userDoc = querySnapshot.docs[0];
        userRef = userDoc.ref;
        console.log(`[updateUserSubscriptionState] Found user ${userDoc.id} via stripeCustomerId.`);
    }

    if (!userRef || !userDoc) {
        console.error(`[updateUserSubscriptionState] CRITICAL: Could not find user document to update.`);
        return;
    }
    
    // Determine the plan type based on subscription status
    const planType = (subscription.status === 'active' || subscription.status === 'trialing' || (subscription.status === 'canceled' && subscription.cancel_at_period_end)) ? 'pro' : 'free';
    
    const updateData: any = {
        planType: planType,
        subscriptionStatus: subscription.status,
        subscriptionPeriodEnd: subscription.current_period_end, // Unix timestamp
        stripeCustomerId: stripeCustomerId,
    };
    
    // Reset credits only under specific conditions
    if (planType === 'pro' && userDoc.data()?.planType !== 'pro') {
      updateData.generationCredits = -1; // -1 for unlimited
      console.log(`[updateUserSubscriptionState] User ${userDoc.id} upgraded to Pro. Setting unlimited credits.`);
    } else if (planType === 'free' && userDoc.data()?.planType === 'pro') {
      updateData.generationCredits = 5; // Reset to 5 for free plan
      console.log(`[updateUserSubscriptionState] User ${userDoc.id} downgraded to Free. Resetting credits to 5.`);
    }


    console.log(`[updateUserSubscriptionState] Updating user ${userDoc.id} with subscription data:`, updateData);
    await userRef.update(updateData);
    console.log(`[updateUserSubscriptionState] SUCCESS: User ${userDoc.id} subscription status updated.`);
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
    
    // IMPORTANT: client_reference_id is our Firebase UID
    const userId = checkoutSession.client_reference_id;
    const stripeCustomerId = typeof checkoutSession.customer === 'string' ? checkoutSession.customer : checkoutSession.customer?.id;
    const subscriptionId = typeof checkoutSession.subscription === 'string' ? checkoutSession.subscription : checkoutSession.subscription?.id;


    if (!userId || !stripeCustomerId || !subscriptionId) {
      console.error('CRITICAL: Missing required IDs from checkout session.', { userId, stripeCustomerId, subscriptionId });
      return NextResponse.json({ error: 'Missing user, customer, or subscription ID from checkout session' }, { status: 400 });
    }
    console.log(`User ID: ${userId}, Customer ID: ${stripeCustomerId}, Subscription ID: ${subscriptionId}`);

    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        // Pass all IDs to the update function
        await updateUserSubscriptionState(db, stripeCustomerId, subscription, userId);
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
        // We don't have the userId here, so we pass null and rely on the customerId lookup
        await updateUserSubscriptionState(db, stripeCustomerId, subscription, null);
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
