import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UploadZone } from './components/UploadZone';
import { StructuredEditor } from './components/StructuredEditor';
import { PreviewPanel } from './components/PreviewPanel';
import { AISuggestions } from './components/AISuggestions';
import { BrokerSettingsDrawer } from './components/BrokerSettingsDrawer';
import { TemplatePicker } from './components/TemplatePicker';
import { Trip, AISuggestion, BrokerProfile, DEFAULT_BROKER, TemplateId } from './types';
import { extractTripData, getAISuggestions } from './services/geminiService';
import { Sparkles, Download, ArrowLeft, Loader2, AlertCircle, X, CheckCircle, Settings, Layers } from 'lucide-react';
import { toCanvas } from 'html-to-image';
import jsPDF from 'jspdf';

export type ProcessingStage = 'reading' | 'extracting' | 'enriching' | null;

interface Toast {
  id: string;
  type: 'error' | 'success';
  message: string;
}

function loadBrokerProfile(): BrokerProfile {
  try {
    const saved = localStorage.getItem('tripsheet_broker_profile');
    return saved ? { ...DEFAULT_BROKER, ...JSON.parse(saved) } : { ...DEFAULT_BROKER };
  } catch {
    return { ...DEFAULT_BROKER };
  }
}

function loadTemplate(): TemplateId {
  try {
    const saved = localStorage.getItem('tripsheet_template') as TemplateId | null;
    return saved && ['classic', 'executive', 'premium'].includes(saved) ? saved : 'classic';
  } catch {
    return 'classic';
  }
}

export default function App() {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>('');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Broker branding + template
  const [brokerProfile, setBrokerProfile] = useState<BrokerProfile>(loadBrokerProfile);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateId>(loadTemplate);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTemplatePickerOpen, setIsTemplatePickerOpen] = useState(false);

  // Persist broker profile to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('tripsheet_broker_profile', JSON.stringify(brokerProfile));
    } catch { /* storage quota exceeded — silently ignore */ }
  }, [brokerProfile]);

  // Persist selected template to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tripsheet_template', selectedTemplate);
    } catch { /* storage quota exceeded — silently ignore */ }
  }, [selectedTemplate]);

  const parseBoolean = (val: unknown) => {
    if (typeof val === 'boolean') return val;
    return String(val).toLowerCase() === 'true';
  };

  const parseIntSafe = (val: unknown) => {
    const parsed = parseInt(String(val), 10);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const addToast = (type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 5000);
  };

  const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

  const handleUpload = (file: File) => {
    const uploadStart = Date.now();
    const MIN_ANIM_MS = 2500;

    setIsProcessing(true);
    setProcessingStage('reading');
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setProcessingStage('extracting');
        const base64 = e.target?.result as string;
        const extractedTrip = await extractTripData(base64, file.type);
        setTrip(extractedTrip);

        setProcessingStage('enriching');
        const aiSuggestions = await getAISuggestions(extractedTrip);
        setSuggestions(aiSuggestions);
        if (aiSuggestions.length > 0) {
          setIsAssistantOpen(true);
        }
      } catch (error) {
        console.error('Extraction failed:', error);
        addToast('error', 'Failed to extract trip data. Check your API key and try again.');
      } finally {
        const elapsed = Date.now() - uploadStart;
        const delay = Math.max(0, MIN_ANIM_MS - elapsed);
        if (delay > 0) await new Promise(r => setTimeout(r, delay));
        setIsProcessing(false);
        setProcessingStage(null);
        setUploadedFileName('');
      }
    };
    reader.onerror = () => {
      addToast('error', 'Could not read the file. Please try again.');
      setIsProcessing(false);
      setProcessingStage(null);
      setUploadedFileName('');
    };
    reader.readAsDataURL(file);
  };

  const applySuggestion = (suggestion: AISuggestion) => {
    if (!suggestion.suggested_fix || !trip) return;
    const { field, value } = suggestion.suggested_fix;
    const newTrip = JSON.parse(JSON.stringify(trip)) as Trip;

    if (field.startsWith('legs.')) {
      const parts = field.split('.');
      const legIndex = parseInt(parts[1]);
      if (isNaN(legIndex) || !newTrip.legs[legIndex]) return;
      if (parts[2] === 'metrics' && parts[3] === 'block_time_minutes') {
        const parsed = parseIntSafe(value);
        if (parsed !== null) {
          newTrip.legs[legIndex].metrics = { ...newTrip.legs[legIndex].metrics, block_time_minutes: parsed };
        }
      } else if (parts[2] === 'label') {
        newTrip.legs[legIndex].label = value;
      } else if (parts[2] === 'departure' && parts[3]) {
        (newTrip.legs[legIndex].departure as any)[parts[3]] = value;
      } else if (parts[2] === 'arrival' && parts[3]) {
        (newTrip.legs[legIndex].arrival as any)[parts[3]] = value;
      }
    } else if (field.startsWith('visibility.')) {
      const visKey = field.split('.')[1] as keyof Trip['visibility'];
      newTrip.visibility = { ...newTrip.visibility, [visKey]: parseBoolean(value) };
    } else if (field === 'aircraft.tail_number') {
      newTrip.aircraft = { ...newTrip.aircraft, tail_number: value };
    }

    setTrip(newTrip);
    setSuggestions(prev => prev.filter(s => s.id !== suggestion.id));
  };

  const dismissSuggestion = (id: string) => setSuggestions(prev => prev.filter(s => s.id !== id));

  const applyAllSuggestions = () => {
    if (!trip || suggestions.length === 0) return;
    const newTrip = JSON.parse(JSON.stringify(trip)) as Trip;
    suggestions.forEach((s) => {
      if (!s.suggested_fix) return;
      const { field, value } = s.suggested_fix;
      if (field.startsWith('legs.')) {
        const parts = field.split('.');
        const legIndex = parseInt(parts[1]);
        if (isNaN(legIndex) || !newTrip.legs[legIndex]) return;
        if (parts[2] === 'metrics' && parts[3] === 'block_time_minutes') {
          const parsed = parseIntSafe(value);
          if (parsed !== null) {
            newTrip.legs[legIndex].metrics = { ...newTrip.legs[legIndex].metrics, block_time_minutes: parsed };
          }
        } else if (parts[2] === 'label') {
          newTrip.legs[legIndex].label = value;
        } else if (parts[2] === 'departure' && parts[3]) {
          (newTrip.legs[legIndex].departure as any)[parts[3]] = value;
        } else if (parts[2] === 'arrival' && parts[3]) {
          (newTrip.legs[legIndex].arrival as any)[parts[3]] = value;
        }
      } else if (field.startsWith('visibility.')) {
        const visKey = field.split('.')[1] as keyof Trip['visibility'];
        newTrip.visibility = { ...newTrip.visibility, [visKey]: parseBoolean(value) };
      } else if (field === 'aircraft.tail_number') {
        newTrip.aircraft = { ...newTrip.aircraft, tail_number: value };
      }
    });
    setTrip(newTrip);
    setSuggestions([]);
    setIsAssistantOpen(false);
    addToast('success', 'All suggestions applied.');
  };

  const downloadPDF = async () => {
    const element = document.getElementById('pdf-content');
    if (!element) return;
    setIsGeneratingPDF(true);
    setIsExportingPDF(true);
    try {
      // Wait for exportMode re-render (SVG map swap) to commit to the DOM
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      // html-to-image uses the browser's native SVG foreignObject renderer so it
      // never needs to parse CSS itself — oklch, custom properties, Tailwind v4,
      // all handled by the browser exactly as the user sees them on screen.
      // The only thing we need to handle is cross-origin images (picsum fallback
      // photos) which would taint the canvas; we exclude them via the filter fn.
      const canvas = await toCanvas(element, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        // Exclude <img> elements whose src isn't a data-URI or same-origin URL.
        // These are the picsum.photos placeholder aircraft photos — they have no
        // CORS headers so they'd taint the canvas and break toDataURL().
        filter: (node) => {
          if (node instanceof HTMLImageElement) {
            const src = node.src ?? '';
            return src.startsWith('data:') || src.startsWith(window.location.origin);
          }
          return true;
        },
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgProps = pdf.getImageProperties(imgData);
      const totalHeight = pdfWidth * (imgProps.height / imgProps.width);

      if (totalHeight <= pdfHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, totalHeight);
      } else {
        let yOffset = 0;
        while (yOffset < totalHeight) {
          if (yOffset > 0) pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfWidth, totalHeight);
          yOffset += pdfHeight;
        }
      }
      pdf.save(`TripSheet-${trip?.trip_id?.toUpperCase() || 'export'}.pdf`);
      addToast('success', 'PDF downloaded successfully.');
    } catch (error) {
      console.error('PDF generation failed:', error);
      addToast('error', 'Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
      setIsExportingPDF(false);
    }
  };

  const handleSampleData = () => {
    const sampleTrip: Trip = {
      trip_id: 'HYXND2',
      client: { name: 'Calvin Yoon', company: 'Amalfi Capital', email: 'charter@amalfijets.com' },
      aircraft: { model: 'Bombardier Challenger 601', tail_number: 'N116HL', category: 'Heavy Jet' },
      passengers: [{ full_name: 'Arizechukwu Nwosu' }, { full_name: 'Ikenna Guy Nwosu' }],
      crew: [
        { role: 'PIC', name: 'Robert Temple', phone: '760-801-8534' },
        { role: 'SIC', name: 'Khondker Nazmul Islam' },
        { role: 'FA',  name: 'Laura Lopez', phone: '661-305-0549' },
      ],
      legs: [
        {
          leg_id: 'leg-1', label: 'Outbound', date_local: '2023-06-25',
          departure: { airport_code: 'VNY', airport_name: 'Van Nuys Airport', city: 'Van Nuys', state: 'CA', country: 'USA', timezone: 'PDT', datetime_local: '2023-06-25T12:58:00', fbo: { name: 'Castle & Cooke Aviation (South)', address: '7415 Hayvenhurst Place, Van Nuys, CA 91406', phone: '818-988-8385' } },
          arrival:   { airport_code: 'SJC', airport_name: 'San Jose Mineta Intl', city: 'San Jose', state: 'CA', country: 'USA', timezone: 'PDT', datetime_local: '2023-06-25T14:00:00', fbo: { name: 'Signature Flight Support', address: '323 Martin Ave, Santa Clara, CA 95050', phone: '669-800-1992' } },
          metrics: { distance_nm: 290, block_time_minutes: 62 },
        },
        {
          leg_id: 'leg-2', label: 'Return', date_local: '2023-06-27',
          departure: { airport_code: 'SJC', airport_name: 'San Jose Mineta Intl', city: 'San Jose', state: 'CA', country: 'USA', timezone: 'PDT', datetime_local: '2023-06-27T16:30:00', fbo: { name: 'Signature Flight Support', address: '323 Martin Ave, Santa Clara, CA 95050', phone: '669-800-1992' } },
          arrival:   { airport_code: 'VNY', airport_name: 'Van Nuys Airport', city: 'Van Nuys', state: 'CA', country: 'USA', timezone: 'PDT', datetime_local: '2023-06-27T17:30:00', fbo: { name: 'Castle & Cooke Aviation (South)', address: '7415 Hayvenhurst Place, Van Nuys, CA 91406', phone: '818-988-8385' } },
          metrics: { distance_nm: 290, block_time_minutes: 60 },
        },
      ],
      visibility: { show_tail_number: true, show_fbo_name: true, show_fbo_contact: true, show_passenger_names: true, show_weather: false, show_crew_contact: true },
    };
    setTrip(sampleTrip);
    setSuggestions([
      { id: 's1', type: 'privacy', message: 'Consider hiding the tail number', explanation: "For initial client presentations, hiding the tail number protects operator identity.", suggested_fix: { field: 'visibility.show_tail_number', value: 'false' } },
      { id: 's2', type: 'other',   message: 'Round trip detected', explanation: 'Leg 2 returns to the Leg 1 origin. Labels already set to Outbound / Return.' },
    ]);
  };

  const TEMPLATE_LABELS: Record<TemplateId, string> = {
    classic: 'Classic',
    executive: 'Executive',
    premium: 'Premium',
  };

  if (!trip) {
    return (
      <>
        <UploadZone
          onUpload={handleUpload}
          onSampleData={handleSampleData}
          isProcessing={isProcessing}
          processingStage={processingStage}
          fileName={uploadedFileName}
          onOpenBranding={() => setIsSettingsOpen(true)}
          onOpenTemplate={() => setIsTemplatePickerOpen(true)}
          templateLabel={TEMPLATE_LABELS[selectedTemplate]}
          companyName={brokerProfile.company_name}
          selectedTemplate={selectedTemplate}
          onSelectTemplate={setSelectedTemplate}
        />

        <BrokerSettingsDrawer
          profile={brokerProfile}
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onChange={setBrokerProfile}
        />

        <TemplatePicker
          isOpen={isTemplatePickerOpen}
          selected={selectedTemplate}
          onSelect={setSelectedTemplate}
          onClose={() => setIsTemplatePickerOpen(false)}
        />

        {/* Toasts */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
          <AnimatePresence>
            {toasts.map(toast => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.96 }}
                className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold pointer-events-auto ${
                  toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-white'
                }`}
              >
                {toast.type === 'error' ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                {toast.message}
                <button onClick={() => removeToast(toast.id)} className="ml-1 opacity-60 hover:opacity-100">
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <header className="h-12 border-b border-zinc-100 flex items-center justify-between px-5 bg-white z-40 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setTrip(null); setSuggestions([]); }}
            className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-zinc-700"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-5 w-px bg-zinc-100" />
          <div className="flex items-center gap-2 text-xs">
            <span className="font-black tracking-widest text-zinc-900 uppercase">TripSheet</span>
            <span className="text-zinc-200">·</span>
            <span className="font-mono text-zinc-400 uppercase tracking-wide">{trip.trip_id}</span>
            <span className="text-zinc-200">·</span>
            <span className="text-zinc-600 font-medium">{trip.client.name}</span>
            <span className="text-zinc-200">·</span>
            <span className="text-zinc-400">{trip.aircraft.model}</span>
            <span className="text-zinc-200">·</span>
            <span className="text-zinc-400">{trip.legs.length} leg{trip.legs.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI suggestions */}
          <button
            onClick={() => setIsAssistantOpen(o => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
              suggestions.length > 0
                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                : 'bg-zinc-50 text-zinc-500 border border-zinc-100 hover:bg-zinc-100'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            AI{suggestions.length > 0 ? ` · ${suggestions.length}` : ''}
          </button>

          <div className="h-4 w-px bg-zinc-100" />

          {/* Template picker */}
          <button
            onClick={() => setIsTemplatePickerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-zinc-50 text-zinc-600 border border-zinc-100 hover:bg-zinc-100 hover:text-zinc-900 transition-all"
          >
            <Layers className="w-3 h-3" />
            {TEMPLATE_LABELS[selectedTemplate]}
          </button>

          {/* Broker settings */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Broker Settings"
            className="p-1.5 rounded-lg text-[11px] font-bold bg-zinc-50 text-zinc-500 border border-zinc-100 hover:bg-zinc-100 hover:text-zinc-900 transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-zinc-100" />

          {/* Export */}
          <button
            onClick={downloadPDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-zinc-900 text-white rounded-lg text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-700 transition-all disabled:opacity-50"
          >
            {isGeneratingPDF ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            Export PDF
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 flex overflow-hidden">
        <div className="w-[420px] flex-shrink-0 border-r border-zinc-100">
          <StructuredEditor trip={trip} setTrip={setTrip} />
        </div>
        <div className="flex-1 min-w-0">
          <PreviewPanel trip={trip} brokerProfile={brokerProfile} templateId={selectedTemplate} exportMode={isExportingPDF} />
        </div>
      </main>

      {/* Drawers / modals */}
      <AISuggestions
        suggestions={suggestions}
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onApply={applySuggestion}
        onDismiss={dismissSuggestion}
        onApplyAll={applyAllSuggestions}
      />

      <BrokerSettingsDrawer
        profile={brokerProfile}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onChange={setBrokerProfile}
      />

      <TemplatePicker
        isOpen={isTemplatePickerOpen}
        selected={selectedTemplate}
        onSelect={setSelectedTemplate}
        onClose={() => setIsTemplatePickerOpen(false)}
      />

      {/* Toasts */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold pointer-events-auto ${
                toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-zinc-900 text-white'
              }`}
            >
              {toast.type === 'error' ? <AlertCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
              {toast.message}
              <button onClick={() => removeToast(toast.id)} className="ml-1 opacity-60 hover:opacity-100">
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
