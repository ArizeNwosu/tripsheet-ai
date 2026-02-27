import Stripe from 'stripe';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).end('Method not allowed');

  const sessionId = req.query.session_id as string;
  if (!sessionId) return res.status(400).json({ error: 'session_id required' });

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return res.status(402).json({ error: 'Payment not completed' });
    }

    res.json({
      userId: session.metadata?.userId,
      customerId: session.customer as string,
    });
  } catch (err: any) {
    console.error('Stripe verify error:', err);
    res.status(500).json({ error: err.message });
  }
}
