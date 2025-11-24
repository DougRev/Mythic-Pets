'use server';

/**
 * @fileOverview Creates a Stripe Checkout session for a user to upgrade to the Pro plan.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { stripe } from '@/lib/stripe';


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

    const priceId = process.env.STRIPE_PRO_PRICE_ID;

    if (!priceId) {
      throw new Error('Stripe PRICE_ID environment variable is not set.');
    }
    
    // Log the exact webhook URL that needs to be configured in Stripe.
    console.log(`Stripe Webhook URL to configure: ${appUrl}/api/stripe/webhook`);

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
        client_reference_id: userId,
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
