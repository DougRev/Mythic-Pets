import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { getFirebaseAdmin } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object as Stripe.Checkout.Session;
      
      if (session.metadata?.userId) {
        try {
            const admin = getFirebaseAdmin();
            const firestore = admin.firestore();
            const userRef = firestore.collection('users').doc(session.metadata.userId);
            
            await userRef.update({
                planType: 'pro',
                stripeCustomerId: session.customer, // Save customer ID for future billing management
            });
            console.log(`Successfully upgraded user ${session.metadata.userId} to Pro plan.`);

        } catch (error) {
            console.error('Error updating user profile in Firestore:', error);
            return NextResponse.json({ error: 'Error updating user profile' }, { status: 500 });
        }
      }
      break;
    
    case 'customer.subscription.deleted':
      const subscriptionDeleted = event.data.object as Stripe.Subscription;
      if (subscriptionDeleted.customer) {
        try {
            const admin = getFirebaseAdmin();
            const firestore = admin.firestore();
            const usersRef = firestore.collection('users');
            const query = usersRef.where('stripeCustomerId', '==', subscriptionDeleted.customer);
            const querySnapshot = await query.get();

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                await userDoc.ref.update({
                    planType: 'free',
                });
                console.log(`Successfully downgraded user ${userDoc.id} to Free plan.`);
            }
        } catch (error) {
            console.error('Error updating user profile in Firestore:', error);
            return NextResponse.json({ error: 'Error updating user profile' }, { status: 500 });
        }
      }
      break;

    case 'customer.subscription.updated':
        const subscriptionUpdated = event.data.object as Stripe.Subscription;
        if (subscriptionUpdated.customer) {
          try {
              const admin = getFirebaseAdmin();
              const firestore = admin.firestore();
              const usersRef = firestore.collection('users');
              const query = usersRef.where('stripeCustomerId', '==', subscriptionUpdated.customer);
              const querySnapshot = await query.get();

              if (!querySnapshot.empty) {
                  const userDoc = querySnapshot.docs[0];
                  const planType = subscriptionUpdated.status === 'active' ? 'pro' : 'free';
                  await userDoc.ref.update({
                      planType: planType,
                  });
                  console.log(`Successfully updated user ${userDoc.id} to ${planType} plan.`);
              }
          } catch (error) {
              console.error('Error updating user profile in Firestore:', error);
              return NextResponse.json({ error: 'Error updating user profile' }, { status: 500 });
          }
        }
        break;

    // Add other event types to handle here (e.g., subscription cancellation)
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
