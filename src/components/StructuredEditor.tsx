import React, { useState } from 'react';
import { Trip, Leg } from '../types';
import { cn } from '../utils';
import {
  Plane, Users, Trash2, Plus, Eye, EyeOff, Clock, Shield,
  User, ChevronDown, ChevronRight,
} from 'lucide-react';

interface StructuredEditorProps {
  trip: Trip;
  setTrip: React.Dispatch<React.SetStateAction<Trip | null>>;
}

const inputBase = "w-full px-2.5 py-1.5 bg-zinc-50 border border-zinc-200 rounded-lg text-xs text-zinc-900 placeholder:text-zinc-300 focus:ring-1 focus:ring-zinc-400 focus:border-zinc-400 focus:bg-white focus:outline-none transition-all";
const inlineInput = "bg-transparent focus:outline-none focus:ring-1 focus:ring-zinc-300 rounded px-1 py-0.5 text-center";

function Divider() {
  return <div className="border-t border-zinc-100" />;
}

function Section({ icon: Icon, label, action }: { icon: React.ElementType; label: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 pt-4 pb-2">
      <div className="flex items-center gap-1.5">
        <Icon className="w-3 h-3 text-zinc-300" />
        <span className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-400">{label}</span>
      </div>
      {action}
    </div>
  );
}

function AddBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-zinc-700 uppercase tracking-wider transition-colors">
      <Plus className="w-3 h-3" />{label}
    </button>
  );
}

function RemoveBtn({ onClick, label, disabled }: { onClick: () => void; label: string; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 hover:text-red-500 uppercase tracking-wider transition-colors disabled:opacity-40"
    >
      <Trash2 className="w-3 h-3" />{label}
    </button>
  );
}

export function StructuredEditor({ trip, setTrip }: StructuredEditorProps) {
  const [expandedLegs, setExpandedLegs] = useState<Record<string, boolean>>({});

  const update = (updates: Partial<Trip>) =>
    setTrip(prev => prev ? { ...prev, ...updates } : null);

  const updateLeg = (id: string, updates: Partial<Leg>) =>
    setTrip(prev => prev ? { ...prev, legs: prev.legs.map(l => l.leg_id === id ? { ...l, ...updates } : l) } : null);

  const updateCrew = (idx: number, field: string, val: string) =>
    update({ crew: trip.crew.map((m, i) => i === idx ? { ...m, [field]: val } : m) });

  const updatePax = (idx: number, val: string) =>
    update({ passengers: trip.passengers.map((p, i) => i === idx ? { ...p, full_name: val } : p) });

  const toggleVis = (key: keyof Trip['visibility']) =>
    setTrip(prev => prev ? { ...prev, visibility: { ...prev.visibility, [key]: !prev.visibility[key] } } : null);

  const toggleLeg = (id: string) =>
    setExpandedLegs(prev => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="h-full overflow-y-auto bg-white text-zinc-900 select-none">

      {/* ── Client ── */}
      <Section icon={User} label="Client" />
      <div className="px-5 pb-4 space-y-2">
        <input value={trip.client.name} onChange={e => update({ client: { ...trip.client, name: e.target.value } })} placeholder="Client name" className={inputBase} />
        <div className="grid grid-cols-2 gap-2">
          <input value={trip.client.company || ''} onChange={e => update({ client: { ...trip.client, company: e.target.value } })} placeholder="Company" className={inputBase} />
          <input value={trip.client.email || ''} onChange={e => update({ client: { ...trip.client, email: e.target.value } })} placeholder="Email" className={inputBase} />
        </div>
      </div>

      <Divider />

      {/* ── Itinerary ── */}
      <Section
        icon={Clock}
        label="Itinerary"
        action={
          <div className="flex items-center gap-3">
            <RemoveBtn
              label="Remove leg"
              disabled={trip.legs.length === 1}
              onClick={() => update({ legs: trip.legs.slice(0, -1) })}
            />
            <AddBtn label="Add leg" onClick={() => {
              const last = trip.legs[trip.legs.length - 1];
              update({ legs: [...trip.legs, {
                leg_id: `leg-${Date.now()}`,
                label: `Leg ${trip.legs.length + 1}`,
                date_local: last?.date_local || '',
                departure: { airport_code: '', airport_name: '', city: '', state: '', country: '', timezone: last?.arrival?.timezone || '', datetime_local: '' },
                arrival: { airport_code: '', airport_name: '', city: '', state: '', country: '', timezone: last?.arrival?.timezone || '', datetime_local: '' },
                metrics: {},
              }]});
            }} />
          </div>
        }
      />
      <div className="px-5 pb-4 space-y-1.5">
        {trip.legs.map((leg, idx) => {
          const isOpen = expandedLegs[leg.leg_id];
          return (
            <div key={leg.leg_id} className="border border-zinc-100 rounded-xl overflow-hidden">
              {/* Compact row */}
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-50/80 hover:bg-zinc-50 transition-colors">
                <button onClick={() => toggleLeg(leg.leg_id)} className="text-zinc-300 hover:text-zinc-600 transition-colors flex-shrink-0">
                  {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
                {/* Route codes */}
                <div className="flex items-center gap-1 flex-1 font-mono text-[11px] font-bold">
                  <input value={leg.departure?.airport_code || ''} onChange={e => updateLeg(leg.leg_id, { departure: { ...leg.departure, airport_code: e.target.value.toUpperCase() } })} className={cn(inlineInput, "w-10 text-xs font-black text-zinc-700")} maxLength={4} />
                  <span className="text-zinc-200 text-[10px] flex-shrink-0">→</span>
                  <input value={leg.arrival?.airport_code || ''} onChange={e => updateLeg(leg.leg_id, { arrival: { ...leg.arrival, airport_code: e.target.value.toUpperCase() } })} className={cn(inlineInput, "w-10 text-xs font-black text-zinc-700")} maxLength={4} />
                </div>
                {/* Date */}
                <input type="date" value={leg.date_local} onChange={e => updateLeg(leg.leg_id, { date_local: e.target.value })} className="text-[10px] bg-transparent focus:outline-none text-zinc-400 w-28 cursor-pointer" />
                {/* ETD */}
                <input type="time" value={leg.departure?.datetime_local?.split('T')[1]?.substring(0, 5) || ''} onChange={e => updateLeg(leg.leg_id, { departure: { ...leg.departure, datetime_local: `${leg.date_local}T${e.target.value}` } })} className="text-[10px] bg-transparent focus:outline-none text-zinc-400 w-14 cursor-pointer" />
                <span className="text-zinc-200 text-[10px] flex-shrink-0">–</span>
                {/* ETA */}
                <input type="time" value={leg.arrival?.datetime_local?.split('T')[1]?.substring(0, 5) || ''} onChange={e => updateLeg(leg.leg_id, { arrival: { ...leg.arrival, datetime_local: `${leg.date_local}T${e.target.value}` } })} className="text-[10px] bg-transparent focus:outline-none text-zinc-400 w-14 cursor-pointer" />
                <button onClick={() => update({ legs: trip.legs.filter(l => l.leg_id !== leg.leg_id) })} disabled={trip.legs.length === 1} className="text-zinc-200 hover:text-red-400 disabled:opacity-30 transition-colors ml-1 flex-shrink-0">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-zinc-100 p-3 space-y-3 bg-white">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Label</p>
                      <input value={leg.label} onChange={e => updateLeg(leg.leg_id, { label: e.target.value })} placeholder="Outbound / Return" className={inputBase} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Timezone</p>
                      <input value={leg.departure?.timezone || ''} onChange={e => updateLeg(leg.leg_id, { departure: { ...leg.departure, timezone: e.target.value } })} placeholder="PDT" className={inputBase} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Distance (nm)</p>
                      <input type="number" value={leg.metrics?.distance_nm ?? ''} onChange={e => updateLeg(leg.leg_id, { metrics: { ...leg.metrics, distance_nm: parseInt(e.target.value) || undefined } })} placeholder="290" className={inputBase} />
                    </div>
                    <div>
                      <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Block time (min)</p>
                      <input type="number" value={leg.metrics?.block_time_minutes ?? ''} onChange={e => updateLeg(leg.leg_id, { metrics: { ...leg.metrics, block_time_minutes: parseInt(e.target.value) || undefined } })} placeholder="62" className={inputBase} />
                    </div>
                  </div>

                  {/* Departure FBO */}
                  <div>
                    <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">Departure FBO</p>
                    <div className="space-y-1.5">
                      <input value={leg.departure?.fbo?.name || ''} onChange={e => updateLeg(leg.leg_id, { departure: { ...leg.departure, fbo: { ...leg.departure?.fbo, name: e.target.value } } })} placeholder="FBO name" className={inputBase} />
                      <input value={leg.departure?.fbo?.address || ''} onChange={e => updateLeg(leg.leg_id, { departure: { ...leg.departure, fbo: { ...leg.departure?.fbo, address: e.target.value } } })} placeholder="Address" className={inputBase} />
                      <input value={leg.departure?.fbo?.phone || ''} onChange={e => updateLeg(leg.leg_id, { departure: { ...leg.departure, fbo: { ...leg.departure?.fbo, phone: e.target.value } } })} placeholder="Phone" className={inputBase} />
                    </div>
                  </div>

                  {/* Arrival FBO */}
                  <div>
                    <p className="text-[9px] font-bold text-zinc-300 uppercase tracking-wider mb-1.5">Arrival FBO</p>
                    <div className="space-y-1.5">
                      <input value={leg.arrival?.fbo?.name || ''} onChange={e => updateLeg(leg.leg_id, { arrival: { ...leg.arrival, fbo: { ...leg.arrival?.fbo, name: e.target.value } } })} placeholder="FBO name" className={inputBase} />
                      <input value={leg.arrival?.fbo?.address || ''} onChange={e => updateLeg(leg.leg_id, { arrival: { ...leg.arrival, fbo: { ...leg.arrival?.fbo, address: e.target.value } } })} placeholder="Address" className={inputBase} />
                      <input value={leg.arrival?.fbo?.phone || ''} onChange={e => updateLeg(leg.leg_id, { arrival: { ...leg.arrival, fbo: { ...leg.arrival?.fbo, phone: e.target.value } } })} placeholder="Phone" className={inputBase} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Divider />

      {/* ── Aircraft ── */}
      <Section icon={Plane} label="Aircraft" />
      <div className="px-5 pb-4 space-y-2">
        <input value={trip.aircraft.model} onChange={e => update({ aircraft: { ...trip.aircraft, model: e.target.value } })} placeholder="Aircraft model" className={inputBase} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Tail #</span>
              <button onClick={() => toggleVis('show_tail_number')} title="Toggle client visibility" className="text-zinc-300 hover:text-zinc-600 transition-colors">
                {trip.visibility.show_tail_number ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-amber-400" />}
              </button>
            </div>
            <input value={trip.aircraft.tail_number} onChange={e => update({ aircraft: { ...trip.aircraft, tail_number: e.target.value.toUpperCase() } })} placeholder="N12345" className={cn(inputBase, !trip.visibility.show_tail_number && 'opacity-40')} />
          </div>
          <div>
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider mb-1">Category</p>
            <input value={trip.aircraft.category || ''} onChange={e => update({ aircraft: { ...trip.aircraft, category: e.target.value } })} placeholder="Heavy / Mid / Light" className={inputBase} />
          </div>
        </div>
      </div>

      <Divider />

      {/* ── Passengers ── */}
      <Section
        icon={Users}
        label={`Passengers (${trip.passengers.length})`}
        action={<AddBtn label="Add" onClick={() => update({ passengers: [...trip.passengers, { full_name: '' }] })} />}
      />
      <div className="px-5 pb-4 space-y-1.5">
        {trip.passengers.map((pax, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-[9px] text-zinc-300 w-4 text-right flex-shrink-0">{idx + 1}</span>
            <input value={pax.full_name} onChange={e => updatePax(idx, e.target.value)} placeholder={`Passenger ${idx + 1}`} className={cn(inputBase, 'flex-1')} />
            <button onClick={() => update({ passengers: trip.passengers.filter((_, i) => i !== idx) })} className="text-zinc-200 hover:text-red-400 transition-colors flex-shrink-0">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {trip.passengers.length === 0 && <p className="text-[10px] text-zinc-300 italic">No passengers added.</p>}
      </div>

      <Divider />

      {/* ── Crew ── */}
      <Section
        icon={Shield}
        label="Crew"
        action={<AddBtn label="Add" onClick={() => update({ crew: [...trip.crew, { role: '', name: '', phone: '' }] })} />}
      />
      <div className="px-5 pb-4 space-y-2">
        {trip.crew.map((m, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <input value={m.role} placeholder="Role" onChange={e => updateCrew(idx, 'role', e.target.value)} className={cn(inputBase, 'w-14 uppercase text-center')} />
            <div className="flex-1 space-y-1.5">
              <input value={m.name} placeholder="Full name" onChange={e => updateCrew(idx, 'name', e.target.value)} className={inputBase} />
              <input value={m.phone || ''} placeholder="Phone (optional)" onChange={e => updateCrew(idx, 'phone', e.target.value)} className={inputBase} />
            </div>
            <button onClick={() => update({ crew: trip.crew.filter((_, i) => i !== idx) })} className="text-zinc-200 hover:text-red-400 transition-colors mt-2 flex-shrink-0">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {trip.crew.length === 0 && <p className="text-[10px] text-zinc-300 italic">No crew assigned.</p>}
      </div>

      <Divider />

      {/* ── Visibility ── */}
      <Section icon={Eye} label="Visibility" />
      <div className="px-5 pb-6 grid grid-cols-2 gap-1.5">
        {[
          { label: 'FBO Name',      key: 'show_fbo_name' },
          { label: 'FBO Contact',   key: 'show_fbo_contact' },
          { label: 'Pax Names',     key: 'show_passenger_names' },
          { label: 'Weather',       key: 'show_weather' },
          { label: 'Crew Contact',  key: 'show_crew_contact' },
        ].map(({ label, key }) => {
          const on = trip.visibility[key as keyof Trip['visibility']];
          return (
            <button
              key={key}
              onClick={() => toggleVis(key as keyof Trip['visibility'])}
              className={cn(
                'flex items-center justify-between px-3 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-wider transition-all',
                on ? 'bg-white border-zinc-200 text-zinc-700' : 'bg-zinc-50 border-zinc-100 text-zinc-300',
              )}
            >
              {label}
              {on ? <Eye className="w-3 h-3 text-zinc-400" /> : <EyeOff className="w-3 h-3 text-zinc-200" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
