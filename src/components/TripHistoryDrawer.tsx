import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Trash2, FolderOpen, Loader2, Zap } from 'lucide-react';
import { StoredTrip, Trip, TemplateId } from '../types';
import { loadTrips, deleteTrip } from '../services/tripStorage';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null;
  isPro: boolean;
  onOpenTrip: (trip: Trip, template: TemplateId, docId: string) => void;
  onUpgrade: () => void;
}

export function TripHistoryDrawer({ isOpen, onClose, userId, isPro, onOpenTrip, onUpgrade }: Props) {
  const [trips, setTrips] = useState<StoredTrip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !userId || !isPro) return;
    setIsLoading(true);
    loadTrips(userId)
      .then(setTrips)
      .catch(err => console.error('Failed to load trip history:', err))
      .finally(() => setIsLoading(false));
  }, [isOpen, userId, isPro]);

  const handleDelete = async (e: React.MouseEvent, stored: StoredTrip) => {
    e.stopPropagation();
    if (!userId) return;
    setDeletingId(stored.id);
    try {
      await deleteTrip(userId, stored.id);
      setTrips(prev => prev.filter(t => t.id !== stored.id));
    } catch (err) {
      console.error('Failed to delete trip:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/20 z-40"
          />
          <motion.div
            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed left-0 top-0 h-full w-[320px] bg-white shadow-2xl z-50 border-r border-zinc-200 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-bold text-zinc-900">Trip History</span>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {!isPro ? (
                <div className="p-6 flex flex-col items-center gap-4 text-center">
                  <div className="w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
                    <Zap className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-zinc-900 mb-1">Pro feature</p>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Upgrade to save and re-open all your past trip sheets.
                    </p>
                  </div>
                  <button
                    onClick={onUpgrade}
                    className="px-4 py-2 bg-zinc-900 text-white text-xs font-black uppercase tracking-widest rounded-xl hover:bg-zinc-700 transition-colors"
                  >
                    Upgrade to Pro
                  </button>
                </div>
              ) : isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="w-5 h-5 text-zinc-300 animate-spin" />
                </div>
              ) : trips.length === 0 ? (
                <div className="p-8 text-center">
                  <FolderOpen className="w-8 h-8 text-zinc-200 mx-auto mb-3" />
                  <p className="text-sm font-medium text-zinc-400">No saved trips yet</p>
                  <p className="text-xs text-zinc-300 mt-1">
                    Your trips will appear here after you upload them.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-zinc-50">
                  {trips.map(stored => (
                    <button
                      key={stored.id}
                      onClick={() => {
                        onOpenTrip(stored.trip, stored.template, stored.id);
                        onClose();
                      }}
                      className="w-full text-left px-5 py-4 hover:bg-zinc-50 transition-colors group flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[11px] font-black text-zinc-900 uppercase tracking-wider">
                            {stored.tripId}
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono">{stored.route}</span>
                        </div>
                        <p className="text-xs text-zinc-600 truncate">{stored.clientName}</p>
                        <p className="text-[10px] text-zinc-400 mt-0.5">{formatDate(stored.createdAt)}</p>
                      </div>
                      <button
                        onClick={e => handleDelete(e, stored)}
                        disabled={deletingId === stored.id}
                        className="p-1.5 text-zinc-200 hover:text-red-500 hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all flex-shrink-0 mt-0.5"
                      >
                        {deletingId === stored.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
