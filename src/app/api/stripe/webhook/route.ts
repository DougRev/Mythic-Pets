import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { initializeApp, getApp, getApps, ServiceAccount, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Stripe
const stripeSecretKey = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY as string;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET as string;
const stripe = new Stripe(stripeSecretKey);

// Initialize Firebase Admin SDK
try {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountString) {
        throw new Error("FIREBASE_SERVICE_ACCOUNT environment variable is not set.");
    }
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountString);

    if (!getApps().length) {
        initializeApp({
            credential: cert(serviceAccount)
        });
    }
} catch (error: any) {
    console.error("Failed to initialize Firebase Admin SDK:", error.message);
    // We can't proceed without Firebase Admin, so we'll respond with an error if a request comes in.
}


export async function POST(req: NextRequest) {
  // Check if Firebase was initialized
  if (!getApps().length) {
      console.error("Firebase Admin SDK is not initialized. Check server logs for details.");
      return NextResponse.json({ error: "Server configuration error." }, { status: 500 });
  }

  const db = getFirestore();
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
      
      const userId = session.client_reference_id;
      const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;


      if (!userId) {
        console.error('Missing userId (client_reference_id) from checkout session.');
        return NextResponse.json({ error: 'Missing user ID from checkout session' }, { status: 400 });
      }

      if (!stripeCustomerId) {
        console.error('Missing stripeCustomerId from checkout session.');
        return NextResponse.json({ error: 'Missing customer ID from checkout session' }, { status: 400 });
      }

      try {
        const userRef = db.collection('users').doc(userId);
        await userRef.update({
          planType: 'pro',
          regenerationCredits: -1, // -1 signifies unlimited
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
