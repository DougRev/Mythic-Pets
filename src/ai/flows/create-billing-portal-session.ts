'use server';

/**
 * @fileOverview Creates a Stripe Billing Portal session for a user.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import { stripe } from '@/lib/stripe';

const CreateBillingPortalSessionInputSchema = z.object({
  customerId: z.string().describe('The Stripe Customer ID of the user.'),
  returnUrl: z.string().url().describe('The URL to redirect the user to after they are done.'),
});
export type CreateBillingPortalSessionInput = z.infer<typeof CreateBillingPortalSessionInputSchema>;

const CreateBillingPortalSessionOutputSchema = z.object({
  url: z.string().describe('The URL for the Billing Portal session.'),
});
export type CreateBillingPortalSessionOutput = z.infer<typeof CreateBillingPortalSessionOutputSchema>;

export async function createBillingPortalSession(input: CreateBillingPortalSessionInput): Promise<CreateBillingPortalSessionOutput> {
    return createBillingPortalSessionFlow(input);
}

const createBillingPortalSessionFlow = ai.defineFlow(
  {
    name: 'createBillingPortalSessionFlow',
    inputSchema: CreateBillingPortalSessionInputSchema,
    outputSchema: CreateBillingPortalSessionOutputSchema,
  },
  async ({ customerId, returnUrl }) => {

    try {
        const portalSession = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });

        return {
            url: portalSession.url,
        };

    } catch (e: any) {
        console.error("Stripe billing portal session creation failed:", e);
        throw new Error(`Stripe error: ${e.message}`);
    }
  }
);
