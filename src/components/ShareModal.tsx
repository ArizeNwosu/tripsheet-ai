import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Link2, Copy, Check, Loader2, Globe, Zap } from 'lucide-react';
import { Trip, BrokerProfile, TemplateId } from '../types';
import { createShareLink } from '../services/tripStorage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  trip: Trip | null;
  brokerProfile: BrokerProfile;
  template: TemplateId;
  userId: string | null;
  isPro: boolean;
  onUpgrade: () => void;
}

export function ShareModal({ isOpen, onClose, trip, brokerProfile, template, userId, isPro, onUpgrade }: Props) {
  const [shareUrl, setShareUrl] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState('');

  // Generate link when modal opens (only once per open)
  useEffect(() => {
    if (!isOpen || !trip || !userId || !isPro || shareUrl) return;
    setIsGenerating(true);
    setError('');
    createShareLink(userId, trip, brokerProfile, template)
      .then(shareId => setShareUrl(`${window.location.origin}/?share=${shareId}`))
      .catch(err => {
        setError('Failed to generate link. Please try again.');
        console.error('Share link creation failed:', err);
      })
      .finally(() => setIsGenerating(false));
  }, [isOpen, trip, userId, isPro]);

  // Reset when closed so next open generates a fresh link
  useEffect(() => {
    if (!isOpen) {
      setShareUrl('');
      setIsCopied(false);
      setError('');
    }
  }, [isOpen]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      const el = document.createElement('input');
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
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
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 bg-zinc-700 rounded-lg flex items-center justify-center">
                    <Globe className="w-4 h-4 text-zinc-300" />
                  </div>
                  <span className="text-xs font-black text-white uppercase tracking-widest">Share Trip Sheet</span>
                </div>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Send a read-only web link to your client — no login required.
                </p>
              </div>

              {/* Content */}
              <div className="px-6 py-5 space-y-4">
                {!isPro ? (
                  <div className="flex flex-col items-center gap-3 text-center py-2">
                    <Zap className="w-6 h-6 text-amber-500" />
                    <p className="text-sm font-bold text-zinc-900">Pro feature</p>
                    <p className="text-xs text-zinc-500">Upgrade to generate shareable client links.</p>
                    <button
                      onClick={onUpgrade}
                      className="w-full py-2.5 bg-zinc-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-zinc-700 transition-colors"
                    >
                      Upgrade to Pro
                    </button>
                  </div>
                ) : isGenerating ? (
                  <div className="flex items-center justify-center gap-2 py-6">
                    <Loader2 className="w-4 h-4 text-zinc-400 animate-spin" />
                    <span className="text-xs text-zinc-500">Generating link…</span>
                  </div>
                ) : error ? (
                  <div className="space-y-3">
                    <p className="text-xs text-red-500">{error}</p>
                    <button
                      onClick={() => { setError(''); }}
                      className="w-full py-2 bg-zinc-100 text-zinc-600 text-xs font-bold rounded-lg hover:bg-zinc-200 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2.5">
                      <Link2 className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                      <span className="text-[11px] text-zinc-600 truncate flex-1 font-mono">{shareUrl}</span>
                    </div>
                    <button
                      onClick={handleCopy}
                      className={`w-full py-2.5 text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${
                        isCopied
                          ? 'bg-green-600 text-white'
                          : 'bg-zinc-900 text-white hover:bg-zinc-700'
                      }`}
                    >
                      {isCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {isCopied ? 'Copied!' : 'Copy Link'}
                    </button>
                    <p className="text-[10px] text-zinc-400 text-center leading-relaxed">
                      Anyone with this link can view the trip sheet. No login required.
                    </p>
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
