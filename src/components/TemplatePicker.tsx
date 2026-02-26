import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check } from 'lucide-react';
import { TemplateId } from '../types';
import { cn } from '../utils';
import { TemplateThumb, TEMPLATES } from './TemplateThumbs';

interface Props {
  isOpen: boolean;
  selected: TemplateId;
  onSelect: (t: TemplateId) => void;
  onClose: () => void;
}

export function TemplatePicker({ isOpen, selected, onSelect, onClose }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-2xl w-[580px] pointer-events-auto border border-zinc-100 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
                <div>
                  <p className="text-sm font-black text-zinc-900 uppercase tracking-wider">Choose Template</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Visual style applied to your exported PDF</p>
                </div>
                <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Template cards */}
              <div className="p-5 grid grid-cols-3 gap-3">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => { onSelect(t.id); onClose(); }}
                    className={cn(
                      'relative flex flex-col rounded-xl border-2 transition-all overflow-hidden text-left',
                      selected === t.id
                        ? 'border-zinc-900 shadow-lg ring-1 ring-zinc-900'
                        : 'border-zinc-200 hover:border-zinc-400 hover:shadow-md'
                    )}
                  >
                    {/* Thumbnail */}
                    <div className="w-full overflow-hidden bg-zinc-50" style={{ aspectRatio: '3/4' }}>
                      <TemplateThumb id={t.id} />
                    </div>

                    {/* Label */}
                    <div className="px-3 py-2.5 bg-white border-t border-zinc-100">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-black text-zinc-900 uppercase tracking-wide">{t.name}</span>
                        {selected === t.id && (
                          <span className="w-4 h-4 rounded-full bg-zinc-900 flex items-center justify-center flex-shrink-0">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-zinc-400 leading-tight">{t.description}</p>
                    </div>
                  </button>
                ))}
              </div>

              <div className="px-5 pb-4">
                <p className="text-[10px] text-zinc-400 text-center">
                  Click a template to apply it — changes the PDF layout immediately
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
