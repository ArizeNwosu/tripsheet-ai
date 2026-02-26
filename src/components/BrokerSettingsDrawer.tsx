import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, RotateCcw, Building2, Palette, Image, Map } from 'lucide-react';
import { BrokerProfile, DEFAULT_BROKER } from '../types';
import { cn } from '../utils';

interface Props {
  profile: BrokerProfile;
  isOpen: boolean;
  onClose: () => void;
  onChange: (p: BrokerProfile) => void;
}

const inputCls = "w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-300 focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none transition-all";

const PRESET_COLORS = [
  '#008080', '#0f172a', '#1d4ed8', '#7c3aed',
  '#b45309', '#dc2626', '#065f46', '#374151',
];

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">{children}</p>;
}

export function BrokerSettingsDrawer({ profile, isOpen, onClose, onChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const exteriorRef = useRef<HTMLInputElement>(null);
  const interiorRef = useRef<HTMLInputElement>(null);

  const set = (patch: Partial<BrokerProfile>) => onChange({ ...profile, ...patch });
  const imageUsage = profile.image_usage || { classic: true, executive: false, premium: false };
  const mapStyle = profile.map_style || { classic: 'leaflet', executive: 'leaflet', premium: 'leaflet' };

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => set({ logo_dataurl: e.target?.result as string });
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (file: File, key: 'exterior_image_dataurl' | 'interior_image_dataurl') => {
    const reader = new FileReader();
    reader.onload = e => set({ [key]: e.target?.result as string } as Partial<BrokerProfile>);
    reader.readAsDataURL(file);
  };

  const handleLogoDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) handleLogoUpload(file);
  };

  const renderImageUpload = (
    label: string,
    key: 'exterior_image_dataurl' | 'interior_image_dataurl',
    inputRef: React.RefObject<HTMLInputElement>,
  ) => (
    <div>
      <Label>{label}</Label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0], key)}
      />
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-zinc-200 hover:border-zinc-400 rounded-xl cursor-pointer transition-colors overflow-hidden"
        style={{ height: 96 }}
      >
        {profile[key] ? (
          <div className="relative h-full group">
            <img src={profile[key]} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-bold">Replace</span>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-400">
            <Image className="w-5 h-5" />
            <span className="text-xs font-medium">Click to upload</span>
            <span className="text-[10px] text-zinc-300">JPG or PNG recommended</span>
          </div>
        )}
      </div>
      {profile[key] && (
        <button
          onClick={() => set({ [key]: undefined } as Partial<BrokerProfile>)}
          className="mt-1.5 text-[10px] text-red-400 hover:text-red-600 font-bold uppercase tracking-wider"
        >
          Remove image
        </button>
      )}
    </div>
  );

  const toggleImageUsage = (key: 'classic' | 'executive' | 'premium') => {
    set({
      image_usage: {
        ...imageUsage,
        [key]: !imageUsage[key],
      },
    });
  };

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
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 220 }}
            className="fixed right-0 top-0 h-full w-[360px] bg-white shadow-2xl z-50 border-l border-zinc-200 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-zinc-500" />
                <span className="text-sm font-bold text-zinc-900">Broker Settings</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onChange({ ...DEFAULT_BROKER })}
                  title="Reset to defaults"
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button onClick={onClose} className="p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">

              {/* Logo upload */}
              <div>
                <Label>Company Logo</Label>
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])} />

                <div
                  onClick={() => fileRef.current?.click()}
                  onDrop={handleLogoDrop}
                  onDragOver={e => e.preventDefault()}
                  className="border-2 border-dashed border-zinc-200 hover:border-zinc-400 rounded-xl cursor-pointer transition-colors overflow-hidden"
                  style={{ height: 88 }}
                >
                  {profile.logo_dataurl ? (
                    <div className="relative h-full group">
                      <img src={profile.logo_dataurl} alt="Logo" className="w-full h-full object-contain p-3" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs font-bold">Replace</span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center gap-2 text-zinc-400">
                      <Upload className="w-5 h-5" />
                      <span className="text-xs font-medium">Drop logo or click to upload</span>
                      <span className="text-[10px] text-zinc-300">PNG, SVG, JPG · Transparent PNG recommended</span>
                    </div>
                  )}
                </div>
                {profile.logo_dataurl && (
                  <button onClick={() => set({ logo_dataurl: undefined })}
                    className="mt-1.5 text-[10px] text-red-400 hover:text-red-600 font-bold uppercase tracking-wider">
                    Remove logo
                  </button>
                )}
              </div>

              {/* Company info */}
              <div className="space-y-3">
                <Label>Company Name</Label>
                <input value={profile.company_name} onChange={e => set({ company_name: e.target.value })}
                  placeholder="Your Company Name" className={inputCls} />

                <Label>Tagline</Label>
                <input value={profile.tagline || ''} onChange={e => set({ tagline: e.target.value })}
                  placeholder="e.g. Private Charter · Est. 2008" className={inputCls} />
              </div>

              {/* Aircraft images */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Image className="w-3 h-3 text-zinc-400" />
                  <Label>Aircraft Images</Label>
                </div>
                {renderImageUpload('Exterior Photo', 'exterior_image_dataurl', exteriorRef)}
                {renderImageUpload('Interior Photo', 'interior_image_dataurl', interiorRef)}
                <div className="pt-1">
                  <Label>Use Uploaded Images</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: 'classic', label: 'Classic' },
                      { key: 'executive', label: 'Executive' },
                      { key: 'premium', label: 'Premium' },
                    ] as const).map(({ key, label }) => {
                      const on = imageUsage[key];
                      return (
                        <button
                          key={key}
                          onClick={() => toggleImageUsage(key)}
                          className={cn(
                            'px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all',
                            on ? 'bg-white border-zinc-200 text-zinc-700' : 'bg-zinc-50 border-zinc-100 text-zinc-300',
                          )}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-2">If off, the template uses stock images.</p>
                </div>
              </div>

              {/* Map style */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Map className="w-3 h-3 text-zinc-400" />
                  <Label>Map Style</Label>
                </div>
                <div className="space-y-2">
                  {([
                    { key: 'classic', label: 'Classic' },
                    { key: 'premium', label: 'Premium' },
                  ] as const).map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 w-16">{label}</span>
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        {([
                          { style: 'leaflet', label: 'Interactive' },
                          { style: 'svg', label: 'Clean SVG' },
                        ] as const).map(({ style, label: styleLabel }) => {
                          const on = mapStyle[key] === style;
                          return (
                            <button
                              key={style}
                              onClick={() => set({ map_style: { ...mapStyle, [key]: style } })}
                              className={cn(
                                'px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all',
                                on ? 'bg-white border-zinc-200 text-zinc-700' : 'bg-zinc-50 border-zinc-100 text-zinc-300',
                              )}
                            >
                              {styleLabel}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-zinc-400">SVG renders reliably in PDF exports.</p>
              </div>

              {/* Brand color */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Palette className="w-3 h-3 text-zinc-400" />
                  <Label>Brand Color</Label>
                </div>
                {/* Presets */}
                <div className="flex gap-2 mb-3 flex-wrap">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => set({ primary_color: c })}
                      title={c}
                      className={cn(
                        "w-7 h-7 rounded-full border-2 transition-all",
                        profile.primary_color === c ? "border-zinc-900 scale-110" : "border-transparent hover:border-zinc-300"
                      )}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                {/* Custom picker */}
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={profile.primary_color}
                    onChange={e => set({ primary_color: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-zinc-200 cursor-pointer bg-transparent p-0.5"
                  />
                  <input
                    value={profile.primary_color}
                    onChange={e => /^#[0-9a-fA-F]{0,6}$/.test(e.target.value) && set({ primary_color: e.target.value })}
                    className={cn(inputCls, 'w-28 font-mono uppercase')}
                    placeholder="#008080"
                    maxLength={7}
                  />
                  <span className="text-xs text-zinc-400">Used for headers & accents</span>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-3">
                <Label>Contact Information</Label>
                <input value={profile.address || ''} onChange={e => set({ address: e.target.value })}
                  placeholder="Street address" className={inputCls} />
                <div className="grid grid-cols-2 gap-2">
                  <input value={profile.phone || ''} onChange={e => set({ phone: e.target.value })}
                    placeholder="Phone" className={inputCls} />
                  <input value={profile.email || ''} onChange={e => set({ email: e.target.value })}
                    placeholder="Email" className={inputCls} />
                </div>
                <input value={profile.website || ''} onChange={e => set({ website: e.target.value })}
                  placeholder="Website (optional)" className={inputCls} />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-zinc-100 bg-zinc-50/50 flex-shrink-0">
              <button onClick={onClose}
                className="w-full py-2 bg-zinc-900 text-white text-xs font-bold uppercase tracking-widest rounded-xl hover:bg-zinc-700 transition-colors">
                Save & Close
              </button>
              <p className="text-[10px] text-zinc-400 text-center mt-2">Settings saved automatically to this browser</p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
