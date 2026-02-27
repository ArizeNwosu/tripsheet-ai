import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: Props) {
  const { sendMagicLink } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    setError('');
    try {
      await sendMagicLink(email.trim().toLowerCase());
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to send link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setSent(false);
    setEmail('');
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/30 z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', damping: 28, stiffness: 260 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-6 pb-4">
                <div>
                  <h2 className="text-sm font-black text-zinc-900 uppercase tracking-widest">Sign in to TripSheet</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">No password needed — we'll email you a link</p>
                </div>
                <button onClick={handleClose} className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="px-6 pb-6">
                {!sent ? (
                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
                      <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        required
                        autoFocus
                        className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder:text-zinc-300 focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none transition-all"
                      />
                    </div>
                    {error && (
                      <p className="text-xs text-red-500">{error}</p>
                    )}
                    <button
                      type="submit"
                      disabled={isLoading || !email.trim()}
                      className="w-full py-2.5 bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                      Send Magic Link
                    </button>
                  </form>
                ) : (
                  <div className="text-center py-4 space-y-3">
                    <div className="flex justify-center">
                      <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-zinc-900">Check your inbox</p>
                      <p className="text-xs text-zinc-400 mt-1">We sent a sign-in link to <span className="font-medium text-zinc-600">{email}</span></p>
                      <p className="text-xs text-zinc-300 mt-2">Click the link in your email to continue. You can close this.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
