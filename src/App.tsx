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
import { Sparkles, Download, ArrowLeft, Loader2, AlertCircle, X, CheckCircle, Settings, Layers, LogIn, LogOut, History, Share2 } from 'lucide-react';
import { toCanvas } from 'html-to-image';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { useAuth, FREE_EXPORT_LIMIT } from './contexts/AuthContext';
import { AuthModal } from './components/AuthModal';
import { PaywallModal } from './components/PaywallModal';
import { TripHistoryDrawer } from './components/TripHistoryDrawer';
import { ShareModal } from './components/ShareModal';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { saveTrip, loadSharedTrip } from './services/tripStorage';

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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [currentTripDocId, setCurrentTripDocId] = useState<string | null>(null);
  const [sharedTripData, setSharedTripData] = useState<{ trip: Trip; brokerProfile: BrokerProfile; template: TemplateId } | null>(null);
  const [isLoadingShare, setIsLoadingShare] = useState(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('preview');

  const { user, isDemoMode, isSubscribed, exportCount, canExport, signOut, recordExport, refreshUserData, isAuthLoading } = useAuth();

  // ── Step 1: Detect checkout redirect on first mount, stash session ID ──
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    const sessionId = params.get('session_id');
    // Clean URL immediately regardless of outcome
    if (checkout) window.history.replaceState({}, '', window.location.pathname);

    if (checkout === 'success' && sessionId) {
      setPendingSessionId(sessionId);
    } else if (checkout === 'cancel') {
      addToast('error', 'Checkout cancelled — no charge made.');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Step 2: Once auth has loaded and user is available, verify & activate ──
  useEffect(() => {
    if (!pendingSessionId || isAuthLoading || !user) return;

    (async () => {
      try {
        const res = await fetch(`/api/verify-subscription?session_id=${pendingSessionId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        if (data.userId === user.uid) {
          await updateDoc(doc(db, 'users', user.uid), {
            isSubscribed: true,
            stripeCustomerId: data.customerId,
          });
          await refreshUserData();
          addToast('success', "You're now a Pro member. Unlimited exports unlocked!");
        }
      } catch (err) {
        console.error('Subscription verification failed:', err);
        addToast('error', 'Could not verify your subscription. Please contact support.');
      } finally {
        setPendingSessionId(null);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSessionId, isAuthLoading, user]);

  // ── Detect ?share= param on mount and load shared trip ──────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shareId = params.get('share');
    if (!shareId) return;
    window.history.replaceState({}, '', window.location.pathname);
    setIsLoadingShare(true);
    loadSharedTrip(shareId)
      .then(data => {
        if (data) setSharedTripData(data);
        else addToast('error', 'Trip not found or the link has expired.');
      })
      .catch(() => addToast('error', 'Could not load shared trip.'))
      .finally(() => setIsLoadingShare(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        // Auto-save to history for Pro users
        if ((isSubscribed || isDemoMode) && user) {
          saveTrip(user.uid, extractedTrip, selectedTemplate)
            .then(docId => setCurrentTripDocId(docId))
            .catch(err => console.error('Auto-save failed:', err));
        }

        setProcessingStage('enriching');
        const aiSuggestions = await getAISuggestions(extractedTrip);
        setSuggestions(aiSuggestions);
        if (aiSuggestions.length > 0) {
          setIsAssistantOpen(true);
        }
      } catch (error) {
        console.error('Extraction failed:', error);
        const msg = error instanceof Error ? error.message : String(error);
        addToast('error', `Extraction failed: ${msg}`);
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
    // Gate: must be signed in
    if (!user && !isDemoMode) {
      setIsAuthModalOpen(true);
      return;
    }
    // Gate: must have exports remaining or be subscribed / demo
    if (!canExport) {
      setIsPaywallOpen(true);
      return;
    }

    const element = document.getElementById('pdf-content');
    if (!element) return;
    setIsGeneratingPDF(true);
    setIsExportingPDF(true);
    try {
      // Let the DOM settle
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      // ── Step 1: Pre-capture each Leaflet map container ──────────────────────
      // html-to-image can't reliably embed cross-origin tile images via its SVG
      // foreignObject path. Instead we snapshot each .leaflet-container with
      // html2canvas (which handles the complex Leaflet DOM / tile CORS correctly),
      // swap the live map for the captured <img>, run html-to-image on the whole
      // page, then restore the original containers.
      type MapReplacement = { parent: HTMLElement; img: HTMLImageElement; original: HTMLElement };
      const replacements: MapReplacement[] = [];

      const leafletContainers = Array.from(
        element.querySelectorAll<HTMLElement>('.leaflet-container')
      );

      for (const container of leafletContainers) {
        try {
          const mapCanvas = await html2canvas(container, {
            useCORS: true,
            allowTaint: false,
            backgroundColor: null,
            scale: 2,
            logging: false,
          });
          const img = document.createElement('img');
          img.src = mapCanvas.toDataURL('image/png');
          img.style.width = container.offsetWidth + 'px';
          img.style.height = container.offsetHeight + 'px';
          img.style.display = 'block';
          const parent = container.parentElement as HTMLElement;
          parent.insertBefore(img, container);
          parent.removeChild(container);
          replacements.push({ parent, img, original: container });
        } catch (e) {
          console.warn('Map pre-capture failed, continuing without tiles:', e);
        }
      }

      // ── Step 2: Capture full PDF with html-to-image ──────────────────────────
      const canvas = await toCanvas(element, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        filter: (node) => {
          if (node instanceof HTMLImageElement) {
            const src = node.src ?? '';
            if (src.startsWith('data:') || src.startsWith(window.location.origin) || src.startsWith('/')) return true;
            if (node.crossOrigin === 'anonymous') return true;
            return false;
          }
          return true;
        },
      });

      // ── Step 3: Restore Leaflet containers ───────────────────────────────────
      for (const { parent, img, original } of replacements) {
        parent.insertBefore(original, img);
        parent.removeChild(img);
      }

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
      await recordExport();
      const exportsLeft = FREE_EXPORT_LIMIT - (exportCount + 1);
      if (!isDemoMode && !isSubscribed && exportsLeft > 0) {
        addToast('success', `PDF downloaded. ${exportsLeft} free export${exportsLeft !== 1 ? 's' : ''} remaining.`);
      } else {
        addToast('success', 'PDF downloaded successfully.');
      }
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

  if (isLoadingShare) {
    return (
      <div className="h-screen flex items-center justify-center bg-zinc-50">
        <Loader2 className="w-6 h-6 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (sharedTripData) {
    return (
      <div className="h-screen flex flex-col bg-zinc-100 overflow-hidden">
        <div className="h-12 bg-white border-b border-zinc-100 flex items-center justify-between px-5 flex-shrink-0">
          <span className="text-xs font-black tracking-widest text-zinc-900 uppercase">TripSheet</span>
          <span className="text-[10px] text-zinc-400">Shared trip sheet · Read only</span>
        </div>
        <div className="flex-1 overflow-auto">
          <PreviewPanel
            trip={sharedTripData.trip}
            brokerProfile={sharedTripData.brokerProfile}
            templateId={sharedTripData.template}
            exportMode={false}
          />
        </div>
      </div>
    );
  }

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
          onSignIn={() => setIsAuthModalOpen(true)}
          userEmail={user?.email ?? undefined}
          isDemoMode={isDemoMode}
          onSignOut={signOut}
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

        <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
        <PaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} />

        <TripHistoryDrawer
          isOpen={isHistoryOpen}
          onClose={() => setIsHistoryOpen(false)}
          userId={user?.uid ?? null}
          isPro={isSubscribed || isDemoMode}
          onOpenTrip={(t, tmpl, docId) => {
            setTrip(t);
            setSelectedTemplate(tmpl);
            setCurrentTripDocId(docId);
            setSuggestions([]);
          }}
          onUpgrade={() => { setIsHistoryOpen(false); setIsPaywallOpen(true); }}
        />

        {/* Past Trips button — shown on upload screen for Pro users */}
        {(isSubscribed || isDemoMode) && user && (
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="fixed bottom-6 left-6 flex items-center gap-2 px-4 py-2.5 bg-zinc-900/90 backdrop-blur text-white text-xs font-bold rounded-xl shadow-lg hover:bg-zinc-800 transition-colors z-10"
          >
            <History className="w-3.5 h-3.5" />
            Past Trips
          </button>
        )}

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
      <header className="h-12 border-b border-zinc-100 flex items-center justify-between px-3 sm:px-5 bg-white z-40 flex-shrink-0">
        {/* Left — back button + trip breadcrumb (collapses on mobile) */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={() => { setTrip(null); setSuggestions([]); setCurrentTripDocId(null); }}
            className="p-1.5 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-zinc-700 flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="h-5 w-px bg-zinc-100 flex-shrink-0" />
          <div className="flex items-center gap-1.5 sm:gap-2 text-xs min-w-0">
            <span className="font-black tracking-widest text-zinc-900 uppercase flex-shrink-0">TripSheet</span>
            <span className="text-zinc-200 flex-shrink-0">·</span>
            <span className="font-mono text-zinc-400 uppercase tracking-wide flex-shrink-0">{trip.trip_id}</span>
            {/* Hide client / aircraft / legs on small screens */}
            <span className="hidden sm:inline text-zinc-200">·</span>
            <span className="hidden sm:inline text-zinc-600 font-medium truncate max-w-[120px]">{trip.client.name}</span>
            <span className="hidden md:inline text-zinc-200">·</span>
            <span className="hidden md:inline text-zinc-400 truncate max-w-[140px]">{trip.aircraft.model}</span>
            <span className="hidden md:inline text-zinc-200">·</span>
            <span className="hidden md:inline text-zinc-400 flex-shrink-0">{trip.legs.length} leg{trip.legs.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Right — actions (secondary controls hidden on mobile) */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* AI suggestions — hidden on mobile */}
          <button
            onClick={() => setIsAssistantOpen(o => !o)}
            className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
              suggestions.length > 0
                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                : 'bg-zinc-50 text-zinc-500 border border-zinc-100 hover:bg-zinc-100'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            AI{suggestions.length > 0 ? ` · ${suggestions.length}` : ''}
          </button>

          <div className="hidden sm:block h-4 w-px bg-zinc-100" />

          {/* Template picker — hidden on mobile */}
          <button
            onClick={() => setIsTemplatePickerOpen(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-zinc-50 text-zinc-600 border border-zinc-100 hover:bg-zinc-100 hover:text-zinc-900 transition-all"
          >
            <Layers className="w-3 h-3" />
            {TEMPLATE_LABELS[selectedTemplate]}
          </button>

          {/* History — Pro only, hidden on mobile */}
          <button
            onClick={() => (isSubscribed || isDemoMode) ? setIsHistoryOpen(true) : setIsPaywallOpen(true)}
            title="Trip History"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-zinc-50 text-zinc-600 border border-zinc-100 hover:bg-zinc-100 hover:text-zinc-900 transition-all"
          >
            <History className="w-3 h-3" />
            History
            {!(isSubscribed || isDemoMode) && <span className="text-[8px] text-amber-500 font-black">PRO</span>}
          </button>

          {/* Share — Pro only, hidden on mobile */}
          <button
            onClick={() => (isSubscribed || isDemoMode) ? setIsShareOpen(true) : setIsPaywallOpen(true)}
            title="Share trip sheet"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider bg-zinc-50 text-zinc-600 border border-zinc-100 hover:bg-zinc-100 hover:text-zinc-900 transition-all"
          >
            <Share2 className="w-3 h-3" />
            Share
            {!(isSubscribed || isDemoMode) && <span className="text-[8px] text-amber-500 font-black">PRO</span>}
          </button>

          {/* Broker settings — always visible */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Broker Settings"
            className="p-1.5 rounded-lg text-[11px] font-bold bg-zinc-50 text-zinc-500 border border-zinc-100 hover:bg-zinc-100 hover:text-zinc-900 transition-all"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-zinc-100" />

          {/* Auth — always visible */}
          {isDemoMode && (
            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider">Demo</span>
          )}
          {user ? (
            <div className="flex items-center gap-1.5">
              <span className="hidden sm:inline text-[10px] text-zinc-400 max-w-[120px] truncate">{user.email}</span>
              <button
                onClick={signOut}
                title="Sign out"
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold bg-zinc-50 text-zinc-600 border border-zinc-100 hover:bg-zinc-100 hover:text-zinc-900 transition-all"
            >
              <LogIn className="w-3 h-3" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )}

          <div className="h-4 w-px bg-zinc-100" />

          {/* Free export usage pill — shown for signed-in free users only */}
          {user && !isSubscribed && !isDemoMode && (
            <span className={`hidden sm:inline text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              exportCount >= FREE_EXPORT_LIMIT
                ? 'text-red-500 bg-red-50 border-red-200'
                : 'text-zinc-400 bg-zinc-50 border-zinc-200'
            }`}>
              {Math.max(0, FREE_EXPORT_LIMIT - exportCount)}/{FREE_EXPORT_LIMIT} free
            </span>
          )}

          {/* Export — always visible; label hidden on mobile */}
          <button
            onClick={downloadPDF}
            disabled={isGeneratingPDF}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 bg-zinc-900 text-white rounded-lg text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-700 transition-all disabled:opacity-50"
          >
            {isGeneratingPDF ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
            <span className="hidden sm:inline">Export PDF</span>
          </button>
        </div>
      </header>

      {/* Mobile tab toggle — shown only on small screens */}
      <div className="sm:hidden flex border-b border-zinc-100 bg-white flex-shrink-0">
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
            mobileTab === 'editor'
              ? 'text-zinc-900 border-b-2 border-zinc-900'
              : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Editor
        </button>
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
            mobileTab === 'preview'
              ? 'text-zinc-900 border-b-2 border-zinc-900'
              : 'text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Preview
        </button>
      </div>

      {/* Main */}
      <main className="flex-1 flex overflow-hidden">
        {/* Editor panel — full width on mobile (tab-driven), fixed 420px on desktop */}
        <div className={`${mobileTab === 'editor' ? 'flex' : 'hidden'} sm:flex w-full sm:w-[420px] flex-shrink-0 sm:border-r border-zinc-100`}>
          <StructuredEditor trip={trip} setTrip={setTrip} />
        </div>
        {/* Preview panel — full width on mobile (tab-driven), flex-1 on desktop */}
        <div className={`${mobileTab === 'preview' ? 'flex' : 'hidden'} sm:flex flex-1 min-w-0`}>
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

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <PaywallModal isOpen={isPaywallOpen} onClose={() => setIsPaywallOpen(false)} />

      <TripHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        userId={user?.uid ?? null}
        isPro={isSubscribed || isDemoMode}
        onOpenTrip={(t, tmpl, docId) => {
          setTrip(t);
          setSelectedTemplate(tmpl);
          setCurrentTripDocId(docId);
          setSuggestions([]);
        }}
        onUpgrade={() => { setIsHistoryOpen(false); setIsPaywallOpen(true); }}
      />

      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        trip={trip}
        brokerProfile={brokerProfile}
        template={selectedTemplate}
        userId={user?.uid ?? null}
        isPro={isSubscribed || isDemoMode}
        onUpgrade={() => { setIsShareOpen(false); setIsPaywallOpen(true); }}
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
