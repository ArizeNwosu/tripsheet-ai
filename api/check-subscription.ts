import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end('Method not allowed');

  const customerId = req.query.customer_id as string;
  if (!customerId) return res.status(400).json({ error: 'customer_id required' });

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1,
    });
    res.json({ isActive: subscriptions.data.length > 0 });
  } catch (err: any) {
    console.error('Stripe subscription check error:', err);
    res.status(500).json({ error: err.message });
  }
}
