import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, X, Check, Clock, Lock, AlertTriangle, Compass, Info } from 'lucide-react';
import { AISuggestion } from '../types';

interface AISuggestionsProps {
  suggestions: AISuggestion[];
  isOpen: boolean;
  onClose: () => void;
  onApply: (suggestion: AISuggestion) => void;
  onDismiss: (suggestionId: string) => void;
  onApplyAll: () => void;
}

const typeConfig: Record<AISuggestion['type'], { icon: React.ElementType; color: string; bg: string }> = {
  timezone:   { icon: Clock,         color: 'text-blue-600',  bg: 'bg-blue-50'  },
  timing:     { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
  block_time: { icon: Compass,       color: 'text-purple-600', bg: 'bg-purple-50' },
  privacy:    { icon: Lock,          color: 'text-zinc-600',  bg: 'bg-zinc-100' },
  other:      { icon: Info,          color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

export function AISuggestions({ suggestions, isOpen, onClose, onApply, onDismiss, onApplyAll }: AISuggestionsProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/10 z-40"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 h-full w-[340px] bg-white shadow-2xl z-50 border-l border-zinc-200 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-zinc-700" />
                <span className="text-sm font-bold text-zinc-900">AI Assistant</span>
                {suggestions.length > 0 && (
                  <span className="text-xs font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md">
                    {suggestions.length}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Suggestions list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {suggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-10 h-10 bg-zinc-50 rounded-full flex items-center justify-center mb-3">
                    <Check className="w-5 h-5 text-zinc-300" />
                  </div>
                  <p className="text-sm font-semibold text-zinc-500 mb-1">All clear</p>
                  <p className="text-xs text-zinc-400">No suggestions at this time.</p>
                </div>
              ) : (
                suggestions.map((suggestion, idx) => {
                  const cfg = typeConfig[suggestion.type] || typeConfig.other;
                  const Icon = cfg.icon;
                  return (
                    <motion.div
                      key={suggestion.id}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.06 }}
                      className="border border-zinc-100 rounded-xl overflow-hidden"
                    >
                      <div className={`flex items-center gap-2 px-3 py-2 ${cfg.bg}`}>
                        <Icon className={`w-3.5 h-3.5 ${cfg.color}`} />
                        <span className={`text-[10px] font-black uppercase tracking-wider ${cfg.color}`}>
                          {suggestion.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="p-3 space-y-2">
                        <p className="text-sm font-bold text-zinc-900 leading-snug">
                          {suggestion.message}
                        </p>
                        <p className="text-xs text-zinc-500 leading-relaxed">
                          {suggestion.explanation}
                        </p>
                        <div className="flex gap-2 pt-1">
                          {suggestion.suggested_fix && (
                            <button
                              onClick={() => onApply(suggestion)}
                              className="flex-1 py-1.5 bg-zinc-900 text-white text-[10px] font-bold uppercase tracking-wider rounded-lg hover:bg-zinc-700 transition-colors"
                            >
                              Apply fix
                            </button>
                          )}
                          <button
                            onClick={() => onDismiss(suggestion.id)}
                            className={`${suggestion.suggested_fix ? '' : 'flex-1'} py-1.5 px-3 border border-zinc-200 text-zinc-500 text-[10px] font-bold uppercase rounded-lg hover:bg-zinc-50 transition-colors`}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Footer action */}
            {suggestions.some(s => s.suggested_fix) && (
              <div className="px-4 py-4 border-t border-zinc-100">
                <button
                  onClick={onApplyAll}
                  className="w-full py-2.5 bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-700 transition-colors"
                >
                  Apply all ({suggestions.filter(s => s.suggested_fix).length})
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
