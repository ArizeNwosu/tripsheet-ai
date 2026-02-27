import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Zap, Check, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const PRO_FEATURES = [
  'Unlimited PDF exports',
  'All 3 templates (Classic, Executive, Premium)',
  'Full white-label — your brand, no TripSheet footer',
  'Custom logo, colors & contact info saved',
  'Priority AI extraction',
];

export function PaywallModal({ isOpen, onClose }: Props) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpgrade = async () => {
    if (!user) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, userEmail: user.email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to start checkout');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto overflow-hidden">
              {/* Header */}
              <div className="bg-zinc-900 px-6 pt-6 pb-5 relative">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1.5 text-zinc-500 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-zinc-900" />
                  </div>
                  <span className="text-xs font-black text-white uppercase tracking-widest">Upgrade to Pro</span>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  You've used all <span className="text-white font-bold">3 free exports</span>. Upgrade for unlimited exports and full white-label branding.
                </p>
              </div>

              {/* Features */}
              <div className="px-6 py-4 space-y-2.5">
                {PRO_FEATURES.map(f => (
                  <div key={f} className="flex items-start gap-2.5">
                    <div className="w-4 h-4 rounded-full bg-green-50 border border-green-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Check className="w-2.5 h-2.5 text-green-600" />
                    </div>
                    <span className="text-xs text-zinc-600">{f}</span>
                  </div>
                ))}
              </div>

              {/* Pricing + CTA */}
              <div className="px-6 pb-6 space-y-3">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-zinc-900">$29</span>
                  <span className="text-sm text-zinc-400">/ month</span>
                </div>
                {error && <p className="text-xs text-red-500">{error}</p>}
                <button
                  onClick={handleUpgrade}
                  disabled={isLoading}
                  className="w-full py-3 bg-zinc-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  {isLoading ? 'Redirecting to checkout…' : 'Upgrade Now'}
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
