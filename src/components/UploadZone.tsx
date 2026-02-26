import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, ArrowRight, CheckCircle, FileUp, Settings, Layers } from 'lucide-react';
import { ProcessingStage } from '../App';
import { TemplateId } from '../types';
import { TemplateThumb, TEMPLATES } from './TemplateThumbs';

interface UploadZoneProps {
  onUpload: (file: File) => void;
  onSampleData: () => void;
  isProcessing: boolean;
  processingStage: ProcessingStage;
  fileName: string;
  onOpenBranding: () => void;
  onOpenTemplate: () => void;
  templateLabel: string;
  companyName: string;
  selectedTemplate: TemplateId;
  onSelectTemplate: (t: TemplateId) => void;
}

const STAGES: { key: ProcessingStage; label: string; sub: string }[] = [
  { key: 'reading',    label: 'Reading document',        sub: 'Loading file into memory' },
  { key: 'extracting', label: 'Extracting itinerary',    sub: 'AI parsing airports, times & aircraft' },
  { key: 'enriching',  label: 'Generating suggestions',  sub: 'Reviewing for errors & privacy flags' },
];

function getStageIndex(stage: ProcessingStage): number {
  if (!stage) return -1;
  return STAGES.findIndex(s => s.key === stage);
}

export function UploadZone({
  onUpload,
  onSampleData,
  isProcessing,
  processingStage,
  fileName,
  onOpenBranding,
  onOpenTemplate,
  templateLabel,
  companyName,
  selectedTemplate,
  onSelectTemplate,
}: UploadZoneProps) {
  const [draggedFile, setDraggedFile] = useState<{ name: string; size: string } | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setDraggedFile(null);
    if (acceptedFiles.length > 0) onUpload(acceptedFiles[0]);
  }, [onUpload]);

  const onDragEnterCustom = useCallback((e: React.DragEvent) => {
    const files = e.dataTransfer?.items;
    if (files && files.length > 0) {
      const f = files[0];
      setDraggedFile({ name: f.getAsFile()?.name || 'document', size: '' });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    multiple: false,
    disabled: isProcessing,
  } as any);

  const currentStageIdx = getStageIndex(processingStage);

  return (
    <div className="min-h-screen flex flex-col bg-white relative overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle, #e4e4e7 1px, transparent 1px)', backgroundSize: '28px 28px' }}>
      {/* Animated jet grid layer */}
      <div className="pointer-events-none absolute inset-0">
        <div className="jet-grid">
          {[
            // animDelay: negative value puts each jet mid-flight from the very first frame
            //            (no frozen-at-origin moment before the animation fires)
            // fadeDelay: tiny staggered delay on the wrapper's jet-appear fade-in
            { dir: 'east', top: '6%',  left: '4%',  animDelay: '-4s',  fadeDelay: '0s'     },
            { dir: 'west', top: '14%', left: '72%', animDelay: '-7s',  fadeDelay: '0.12s'  },
            { dir: 'east', top: '8%',  left: '44%', animDelay: '-2s',  fadeDelay: '0.06s'  },
            { dir: 'west', top: '26%', left: '16%', animDelay: '-9s',  fadeDelay: '0.2s'   },
            { dir: 'east', top: '38%', left: '8%',  animDelay: '-6s',  fadeDelay: '0.08s'  },
            { dir: 'west', top: '46%', left: '78%', animDelay: '-3s',  fadeDelay: '0.16s'  },
            { dir: 'east', top: '56%', left: '50%', animDelay: '-8s',  fadeDelay: '0.24s'  },
            { dir: 'west', top: '64%', left: '24%', animDelay: '-5s',  fadeDelay: '0.04s'  },
            { dir: 'east', top: '72%', left: '12%', animDelay: '-3s',  fadeDelay: '0.18s'  },
            { dir: 'west', top: '80%', left: '74%', animDelay: '-10s', fadeDelay: '0.28s'  },
          ].map((jet, i) => {
            const longRun = i % 3 === 0;
            return (
              // Wrapper: absolutely-positioned anchor + one-shot opacity fade-in
              <div
                key={i}
                className="jet-wrap"
                style={{ top: jet.top, left: jet.left, animationDelay: jet.fadeDelay }}
              >
                {/* Jet moves via transform from (0,0) of its wrapper */}
                <img
                  className={`jet jet-${jet.dir} ${longRun ? 'jet-long' : 'jet-short'}`}
                  style={{ animationDelay: jet.animDelay }}
                  src="/jet.svg"
                  alt=""
                  aria-hidden="true"
                  loading="lazy"
                />
              </div>
            );
          })}
        </div>
      </div>
      {/* Top bar */}
      <div className="flex items-center justify-between px-8 py-4 bg-white/80 backdrop-blur-sm border-b border-zinc-100 relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 bg-zinc-900 rounded flex items-center justify-center">
            <FileUp className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-black tracking-widest text-zinc-900 uppercase">TripSheet AI</span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-zinc-100 text-zinc-500 rounded-full uppercase tracking-wider">Beta</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white text-zinc-600 border border-zinc-200 hover:border-zinc-400 hover:text-zinc-900 transition-all"
          >
            <Layers className="w-3 h-3" />
            {templateLabel}
          </button>
          <button
            onClick={onOpenBranding}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-zinc-900 text-white hover:bg-zinc-700 transition-all"
          >
            <Settings className="w-3 h-3" />
            Branding
          </button>
          <div className="h-5 w-px bg-zinc-100" />
          <span className="text-[11px] text-zinc-400 font-medium">
            {companyName}
          </span>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 flex items-center justify-center p-8">
        <AnimatePresence mode="wait">
          {isProcessing ? (
            /* ── Processing State ── */
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg"
            >
              <div className="bg-white rounded-3xl shadow-xl border border-zinc-100 overflow-hidden">
                {/* File being processed */}
                <div className="px-8 pt-8 pb-6 border-b border-zinc-50 flex items-center gap-4">
                  <div className="relative flex-shrink-0">
                    {/* Animated ring */}
                    <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                      <circle cx="28" cy="28" r="24" fill="none" stroke="#f4f4f5" strokeWidth="3" />
                      <motion.circle
                        cx="28" cy="28" r="24"
                        fill="none"
                        stroke="#18181b"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 24}`}
                        animate={{
                          strokeDashoffset: [2 * Math.PI * 24, 0],
                        }}
                        transition={{ duration: 8, ease: 'easeInOut' }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-zinc-700" />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-zinc-900 truncate mb-0.5">
                      {fileName || 'Processing document…'}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {STAGES.find(s => s.key === processingStage)?.sub || 'Please wait…'}
                    </p>
                  </div>
                </div>

                {/* Stages */}
                <div className="px-8 py-6 space-y-4">
                  {STAGES.map((stage, idx) => {
                    const isDone = idx < currentStageIdx;
                    const isActive = idx === currentStageIdx;
                    const isPending = idx > currentStageIdx;

                    return (
                      <motion.div
                        key={stage.key}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="flex items-center gap-4"
                      >
                        {/* Step indicator */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center">
                          {isDone ? (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center"
                            >
                              <CheckCircle className="w-4 h-4 text-white" />
                            </motion.div>
                          ) : isActive ? (
                            <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center">
                              <motion.div
                                className="w-3 h-3 bg-zinc-900 rounded-full"
                                animate={{ scale: [1, 1.3, 1] }}
                                transition={{ repeat: Infinity, duration: 1.2, ease: 'easeInOut' }}
                              />
                            </div>
                          ) : (
                            <div className="w-8 h-8 bg-zinc-50 rounded-full flex items-center justify-center border border-zinc-100">
                              <span className="text-[10px] font-bold text-zinc-300">{idx + 1}</span>
                            </div>
                          )}
                        </div>

                        <div>
                          <p className={`text-sm font-bold leading-none mb-0.5 ${isActive ? 'text-zinc-900' : isDone ? 'text-zinc-400' : 'text-zinc-300'}`}>
                            {stage.label}
                          </p>
                          {isActive && (
                            <motion.p
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="text-xs text-zinc-400"
                            >
                              {stage.sub}
                            </motion.p>
                          )}
                        </div>

                        {/* Animated dots for active */}
                        {isActive && (
                          <div className="ml-auto flex gap-1">
                            {[0, 1, 2].map(i => (
                              <motion.div
                                key={i}
                                className="w-1.5 h-1.5 bg-zinc-300 rounded-full"
                                animate={{ opacity: [0.3, 1, 0.3] }}
                                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                              />
                            ))}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                <div className="px-8 pb-6">
                  <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-zinc-900 rounded-full"
                      initial={{ width: '5%' }}
                      animate={{ width: `${Math.max(5, ((currentStageIdx + 1) / STAGES.length) * 90)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                  <p className="text-[10px] text-zinc-300 mt-2 text-center uppercase tracking-widest font-bold">
                    This may take up to 15 seconds
                  </p>
                </div>
              </div>
            </motion.div>
          ) : (
            /* ── Upload State ── */
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-xl"
            >
              {/* Headline */}
              <div className="text-center mb-8">
                <motion.h1
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                  className="text-5xl font-black tracking-tighter text-zinc-900 leading-none mb-4"
                >
                  Upload.<br />
                  <span className="text-zinc-300">Extract. Send.</span>
                </motion.h1>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 }}
                  className="text-zinc-500 text-sm max-w-sm mx-auto leading-relaxed"
                >
                  Drop an operator trip sheet and get a clean, broker-branded client itinerary in under 60 seconds.
                </motion.p>
              </div>

              {/* Template strip */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
                className="mb-6"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Templates</span>
                  <button
                    onClick={onOpenTemplate}
                    className="text-[10px] font-bold text-zinc-400 hover:text-zinc-900 uppercase tracking-wider"
                  >
                    See all
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {TEMPLATES.map(t => (
                    <button
                      key={t.id}
                      onClick={() => onSelectTemplate(t.id)}
                      className={`group rounded-xl border-2 overflow-hidden text-left transition-all ${
                        selectedTemplate === t.id
                          ? 'border-zinc-900 shadow-lg'
                          : 'border-zinc-200 hover:border-zinc-400 hover:shadow-md'
                      }`}
                    >
                      <div className="w-full bg-zinc-50" style={{ aspectRatio: '3/4' }}>
                        <TemplateThumb id={t.id} />
                      </div>
                      <div className="px-3 py-2 bg-white border-t border-zinc-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-zinc-900 uppercase tracking-wide">{t.name}</span>
                          {selectedTemplate === t.id && (
                            <span className="text-[9px] font-bold text-zinc-900 uppercase tracking-wider">Active</span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-400 leading-tight mt-0.5">{t.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>

              {/* Drop zone */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div
                  {...getRootProps()}
                  onDragEnter={onDragEnterCustom as any}
                  onDragLeave={() => setDraggedFile(null)}
                  className="relative cursor-pointer select-none"
                >
                  <input {...getInputProps()} />

                  <AnimatePresence mode="wait">
                    {isDragActive ? (
                      <motion.div
                        key="drag-active"
                        initial={{ scale: 0.99, opacity: 0.8 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.99, opacity: 0.8 }}
                        className="border-2 border-zinc-900 bg-zinc-900 rounded-2xl p-14 flex flex-col items-center justify-center gap-4 text-center"
                      >
                        <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                          <FileText className="w-8 h-8 text-white" />
                        </div>
                        <div>
                          <p className="text-xl font-bold text-white">Release to upload</p>
                          {draggedFile && (
                            <p className="text-zinc-400 text-sm mt-1">{draggedFile.name}</p>
                          )}
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="drag-idle"
                        initial={{ scale: 1 }}
                        className="border-2 border-dashed border-zinc-200 hover:border-zinc-400 bg-white/70 hover:bg-white rounded-2xl p-12 flex flex-col items-center justify-center gap-5 text-center transition-colors duration-200"
                      >
                        <div className="w-14 h-14 bg-zinc-100 rounded-xl flex items-center justify-center">
                          <FileText className="w-7 h-7 text-zinc-400" />
                        </div>
                        <div>
                          <p className="text-base font-bold text-zinc-900 mb-1">Drop your trip sheet here</p>
                          <p className="text-sm text-zinc-400">or click to browse</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {['PDF', 'JPG', 'PNG'].map(fmt => (
                            <span key={fmt} className="px-2.5 py-1 bg-zinc-50 border border-zinc-200 rounded-lg text-[11px] font-bold text-zinc-500 uppercase tracking-wide">
                              {fmt}
                            </span>
                          ))}
                          <span className="text-zinc-300 text-xs ml-1">Multi-page OK</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              {/* Sample data */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="flex justify-center mt-5"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); onSampleData(); }}
                  className="flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-zinc-900 transition-colors uppercase tracking-widest group"
                >
                  Try with sample data
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </motion.div>

              {/* Stats */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="mt-10 grid grid-cols-3 gap-3"
              >
                {[
                  { stat: '< 10s', label: 'Processing time' },
                  { stat: '98%', label: 'Extraction accuracy' },
                  { stat: '1-click', label: 'PDF export' },
                ].map(({ stat, label }) => (
                  <div key={label} className="text-center py-4 px-3 bg-white/80 rounded-xl border border-zinc-100">
                    <div className="text-xl font-black text-zinc-900 tracking-tight">{stat}</div>
                    <div className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold mt-0.5">{label}</div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="px-8 py-3 bg-white/80 backdrop-blur-sm border-t border-zinc-100 text-center relative z-10">
        <p className="text-[10px] text-zinc-300 uppercase tracking-widest font-bold">
          TripSheet AI · Private Aviation Broker Tools · Confidential
        </p>
      </div>
    </div>
  );
}
