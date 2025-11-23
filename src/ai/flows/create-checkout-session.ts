'use server';

/**
 * @fileOverview Creates a Stripe Checkout session for a user to upgrade to the Pro plan.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import Stripe from 'stripe';


const CreateCheckoutSessionInputSchema = z.object({
  userId: z.string().describe('The Firebase UID of the user.'),
  userEmail: z.string().email().describe("The user's email address."),
  appUrl: z.string().url().describe('The base URL of the application for redirects.'),
});
export type CreateCheckoutSessionInput = z.infer<typeof CreateCheckoutSessionInputSchema>;

const CreateCheckoutSessionOutputSchema = z.object({
  sessionId: z.string().describe('The ID of the Stripe Checkout session.'),
  url: z.string().nullable().describe('The URL to redirect the user to for payment.'),
});
export type CreateCheckoutSessionOutput = z.infer<typeof CreateCheckoutSessionOutputSchema>;

export async function createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionOutput> {
    return createCheckoutSessionFlow(input);
}

const createCheckoutSessionFlow = ai.defineFlow(
  {
    name: 'createCheckoutSessionFlow',
    inputSchema: CreateCheckoutSessionInputSchema,
    outputSchema: CreateCheckoutSessionOutputSchema,
  },
  async ({ userId, userEmail, appUrl }) => {

    const stripeSecretKey = process.env.NEXT_PUBLIC_STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRO_PRICE_ID;

    if (!stripeSecretKey || !priceId) {
      throw new Error('Stripe environment variables are not set.');
    }
    
    // Initialize Stripe inside the flow to ensure keys are available.
    const stripe = new Stripe(stripeSecretKey);

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${appUrl}/dashboard/account?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/dashboard/account?canceled=true`,
        customer_email: userEmail,
        // Pass the Firebase User ID to the session so we can identify the user in the webhook.
        client_reference_id: userId,
        // We can also pass it in metadata if we want to attach it to the customer object later.
        metadata: {
            firebaseUID: userId,
        }
      });

      return {
        sessionId: session.id,
        url: session.url,
      };

    } catch (e: any) {
      console.error("Stripe session creation failed:", e);
      throw new Error(`Stripe error: ${e.message}`);
    }
  }
);
