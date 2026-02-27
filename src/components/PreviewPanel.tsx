import React from 'react';
import { Trip, BrokerProfile, TemplateId } from '../types';
import { formatDuration } from '../utils';
import { RouteMap } from './RouteMap';
import { Users, Shield, Sun, Cloud } from 'lucide-react';

interface PreviewPanelProps {
  trip: Trip;
  brokerProfile: BrokerProfile;
  templateId: TemplateId;
  exportMode?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────

function fmtDate(isoStr: string, opts: Intl.DateTimeFormatOptions): string {
  try {
    const [y, m, d] = isoStr.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', opts);
  } catch { return isoStr; }
}

function fmtTime(dt?: string): string {
  if (!dt) return '--:--';
  const t = dt.split('T')[1];
  if (!t) return '--:--';
  const [hStr, mStr] = t.substring(0, 5).split(':');
  const h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${h12}:${mStr}${ampm}`;
}

type MapLeg = { departure: { airport_code: string; city?: string }; arrival: { airport_code: string; city?: string } };

function buildMapLegs(trip: Trip): MapLeg[] {
  return trip.legs.map(l => ({
    departure: { airport_code: l.departure?.airport_code || '', city: l.departure?.city },
    arrival:   { airport_code: l.arrival?.airport_code   || '', city: l.arrival?.city   },
  }));
}

function formatRouteString(trip: Trip): string {
  const parts: string[] = [];
  trip.legs.forEach((leg, i) => {
    if (i === 0) parts.push(leg.departure?.airport_code || leg.departure?.city || 'TBD');
    parts.push(leg.arrival?.airport_code || leg.arrival?.city || 'TBD');
  });
  return parts.filter(Boolean).join(' → ');
}

// ── CLASSIC TEMPLATE ─────────────────────────────────────────────────

function ClassicTemplate({ trip, broker, exportMode = false }: { trip: Trip; broker: BrokerProfile; exportMode?: boolean }) {
  const { visibility } = trip;
  const ACCENT = broker.primary_color;
  const mapLegs = buildMapLegs(trip);
  const usage = broker.image_usage || { classic: true, executive: false, premium: false };
  const useUploaded = usage.classic && !!(broker.exterior_image_dataurl || broker.interior_image_dataurl);
  const exteriorImage = useUploaded && broker.exterior_image_dataurl ? broker.exterior_image_dataurl : 'https://picsum.photos/seed/challenger601exterior/600/400';
  const interiorImage = useUploaded && broker.interior_image_dataurl ? broker.interior_image_dataurl : 'https://picsum.photos/seed/jetinterior2024/600/400';

  return (
    <div id="pdf-content" className="w-[760px] bg-white shadow-lg font-sans" style={{ minHeight: 1060, fontSize: 11 }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '28px 36px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {broker.logo_dataurl ? (
            <img src={broker.logo_dataurl} alt={broker.company_name}
              style={{ height: 38, maxWidth: 120, objectFit: 'contain', flexShrink: 0 }} />
          ) : (
            <div style={{ fontSize: 20, fontWeight: 900, color: ACCENT, letterSpacing: '-0.5px', lineHeight: 1, flexShrink: 0 }}>
              {broker.company_name}
            </div>
          )}
          <div style={{ fontSize: 8, color: '#71717a', lineHeight: 1.9 }}>
            {broker.tagline && <div style={{ fontWeight: 700, color: '#3f3f46', marginBottom: 1 }}>{broker.tagline}</div>}
            {broker.address && <div>{broker.address}</div>}
            {broker.email   && <div>{broker.email}</div>}
            {broker.phone   && <div>{broker.phone}</div>}
            {broker.website && <div>{broker.website}</div>}
          </div>
        </div>

        {/* Client box */}
        <div style={{ border: '1px solid #e4e4e7', padding: '8px 12px', minWidth: 160, background: '#fafafa' }}>
          <div style={{ fontSize: 8, fontWeight: 700, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Client:</div>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#18181b' }}>{trip.client.name}</div>
          {trip.client.email   && <div style={{ fontSize: 8.5, color: '#71717a', marginTop: 2 }}>{trip.client.email}</div>}
          {trip.client.company && <div style={{ fontSize: 8.5, color: '#71717a' }}>{trip.client.company}</div>}
        </div>
      </div>

      {/* TITLE */}
      <div style={{ textAlign: 'center', borderTop: '1px solid #e4e4e7', borderBottom: '1px solid #e4e4e7', padding: '10px 36px' }}>
        <div style={{ fontSize: 15, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#18181b' }}>
          Passenger Itinerary ({trip.trip_id.toUpperCase()})
        </div>
      </div>

      {/* LEG SUMMARY + AIRCRAFT */}
      <div style={{ display: 'flex', alignItems: 'stretch', padding: '12px 36px', gap: 12 }}>
        <div style={{ flex: 1, background: '#f4f4f5', padding: '8px 12px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 16px' }}>
          {trip.legs.map((leg, idx) => (
            <div key={leg.leg_id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700 }}>
              {idx > 0 && <span style={{ color: '#d4d4d8', marginRight: 4 }}>|</span>}
              <span style={{ color: '#71717a' }}>Leg {idx + 1}:</span>
              <span>{leg.departure?.airport_code}</span>
              <span style={{ color: '#a1a1aa', fontWeight: 400, fontSize: 9 }}>
                {leg.date_local && fmtDate(leg.date_local, { month: '2-digit', day: '2-digit', year: 'numeric' })} — {fmtTime(leg.departure?.datetime_local)} {leg.departure?.timezone}
              </span>
              <span style={{ color: '#d4d4d8' }}>→</span>
              <span>{leg.arrival?.airport_code}</span>
              <span style={{ color: '#a1a1aa', fontWeight: 400, fontSize: 9 }}>
                {fmtTime(leg.arrival?.datetime_local)} {leg.arrival?.timezone}
              </span>
            </div>
          ))}
        </div>
        <div style={{ background: '#f4f4f5', border: '1px solid #e4e4e7', padding: '8px 16px', textAlign: 'center', minWidth: 160, flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: '-0.5px', color: '#18181b' }}>
            {visibility.show_tail_number ? trip.aircraft.tail_number : 'TBD'}
          </div>
          <div style={{ fontSize: 8.5, color: '#71717a', fontWeight: 600 }}>{trip.aircraft.model}</div>
        </div>
      </div>

      {/* LEGS */}
      <div style={{ padding: '0 36px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        {trip.legs.map((leg, idx) => {
          const depTime     = fmtTime(leg.departure?.datetime_local);
          const arrTime     = fmtTime(leg.arrival?.datetime_local);
          const tz          = leg.departure?.timezone || '';
          const atz         = leg.arrival?.timezone   || tz;
          const depDateShort = leg.date_local ? fmtDate(leg.date_local, { weekday: 'short', month: 'short', day: 'numeric' }) : '';
          const legDateLong  = leg.date_local ? fmtDate(leg.date_local, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD';

          return (
            <div key={leg.leg_id} style={{ border: '1px solid #e4e4e7' }}>
              {/* Accent header */}
              <div style={{ background: ACCENT, color: 'white', padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700 }}>
                  Leg {idx + 1} : {leg.departure?.airport_code} → {leg.arrival?.airport_code}
                  <span style={{ marginLeft: 12, fontWeight: 400 }}>{legDateLong}</span>
                </div>
                <div style={{ fontSize: 9, opacity: 0.9, display: 'flex', gap: 14 }}>
                  {leg.metrics?.distance_nm       && <span>Distance: {leg.metrics.distance_nm} nm</span>}
                  {leg.metrics?.block_time_minutes && <span>Flight time: {formatDuration(leg.metrics.block_time_minutes)}</span>}
                </div>
              </div>

              {/* Dep / Arr columns */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '16px 0', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '10%', bottom: '10%', left: '50%', width: 1, background: '#f4f4f5' }} />

                {/* DEPARTS */}
                <div style={{ padding: '0 16px', display: 'flex', gap: 16 }}>
                  <div style={{ flexShrink: 0, minWidth: 90, textAlign: 'center' }}>
                    <div style={{ fontSize: 8.5, fontWeight: 900, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>DEPARTS:</div>
                    <div style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.5 }}>
                      {depDateShort}<br />{depTime} {tz}
                    </div>
                    {visibility.show_weather && (
                      <div style={{ marginTop: 10, color: ACCENT, textAlign: 'center' }}>
                        <Sun style={{ width: 20, height: 20, margin: '0 auto 2px' }} />
                        <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', color: ACCENT }}>Sunny</div>
                        <div style={{ fontSize: 8.5, color: ACCENT }}>Hi 77° / Lo 64°</div>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 1 }}>
                      {leg.departure?.airport_code} — {leg.departure?.city}
                    </div>
                    {visibility.show_fbo_name && leg.departure?.fbo?.name && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#3f3f46', marginBottom: 4 }}>{leg.departure.fbo.name}</div>
                    )}
                    {visibility.show_fbo_contact && (
                      <div style={{ fontSize: 8.5, color: '#71717a', lineHeight: 1.8 }}>
                        {leg.departure?.fbo?.address && <div>{leg.departure.fbo.address}</div>}
                        {leg.departure?.fbo?.phone   && <div>{leg.departure.fbo.phone}</div>}
                      </div>
                    )}
                    {!visibility.show_fbo_name && !visibility.show_fbo_contact && (
                      <div style={{ fontSize: 8.5, color: '#d4d4d8', fontStyle: 'italic' }}>FBO details withheld</div>
                    )}
                  </div>
                </div>

                {/* ARRIVES */}
                <div style={{ padding: '0 16px', display: 'flex', gap: 16 }}>
                  <div style={{ flexShrink: 0, minWidth: 90, textAlign: 'center' }}>
                    <div style={{ fontSize: 8.5, fontWeight: 900, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>ARRIVES:</div>
                    <div style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.5 }}>
                      {depDateShort}<br />{arrTime} {atz}
                    </div>
                    {visibility.show_weather && (
                      <div style={{ marginTop: 10, color: ACCENT, textAlign: 'center' }}>
                        <Cloud style={{ width: 20, height: 20, margin: '0 auto 2px' }} />
                        <div style={{ fontSize: 8.5, fontWeight: 700, textTransform: 'uppercase', color: ACCENT }}>Clouds</div>
                        <div style={{ fontSize: 8.5, color: ACCENT }}>Hi 76° / Lo 54°</div>
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 900, marginBottom: 1 }}>
                      {leg.arrival?.airport_code} — {leg.arrival?.city}
                    </div>
                    {visibility.show_fbo_name && leg.arrival?.fbo?.name && (
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#3f3f46', marginBottom: 4 }}>{leg.arrival.fbo.name}</div>
                    )}
                    {visibility.show_fbo_contact && (
                      <div style={{ fontSize: 8.5, color: '#71717a', lineHeight: 1.8 }}>
                        {leg.arrival?.fbo?.address && <div>{leg.arrival.fbo.address}</div>}
                        {leg.arrival?.fbo?.phone   && <div>{leg.arrival.fbo.phone}</div>}
                      </div>
                    )}
                    {!visibility.show_fbo_name && !visibility.show_fbo_contact && (
                      <div style={{ fontSize: 8.5, color: '#d4d4d8', fontStyle: 'italic' }}>FBO details withheld</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CREW */}
      <div style={{ padding: '14px 36px', borderTop: '1px solid #f4f4f5', display: 'flex', alignItems: 'flex-start', gap: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Shield style={{ width: 16, height: 16, color: '#18181b' }} />
          <span style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11 }}>Crew</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 32px', flex: 1 }}>
          {trip.crew.length > 0 ? trip.crew.map((m, i) => (
            <div key={i} style={{ fontSize: 10 }}>
              <span style={{ fontWeight: 900 }}>{m.role}:</span>{' '}
              <span style={{ fontWeight: 700 }}>{m.name || '—'}</span>
              {visibility.show_crew_contact && m.phone && (
                <span style={{ color: '#71717a', marginLeft: 4 }}>— {m.phone}</span>
              )}
            </div>
          )) : <div style={{ fontSize: 10, color: '#a1a1aa', fontStyle: 'italic' }}>Crew information not assigned</div>}
        </div>
      </div>

      {/* PASSENGERS */}
      <div style={{ padding: '10px 36px 14px', borderTop: '1px solid #f4f4f5', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <Users style={{ width: 16, height: 16, color: '#18181b' }} />
          <span style={{ fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.04em', fontSize: 11 }}>
            Passengers ({trip.passengers.length})
          </span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 32px' }}>
          {trip.passengers.length > 0 ? trip.passengers.map((p, i) => (
            <div key={i} style={{ fontSize: 10, fontWeight: 700 }}>
              {visibility.show_passenger_names ? p.full_name : `Passenger ${i + 1}`}
            </div>
          )) : <div style={{ fontSize: 10, color: '#a1a1aa', fontStyle: 'italic' }}>No passengers listed</div>}
        </div>
      </div>

      {/* BENTO — Map + Photos */}
      <div style={{ margin: '16px 36px 36px', border: '1px solid #e4e4e7', overflow: 'hidden' }}>
        <div style={{ background: ACCENT, color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 14px' }}>
          <span style={{ fontWeight: 700, fontSize: 10 }}>{trip.aircraft.model}</span>
          {visibility.show_tail_number && (
            <span style={{ fontSize: 10, fontWeight: 700, opacity: 0.9 }}>{trip.aircraft.tail_number}</span>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', height: 200 }}>
          <div style={{ borderRight: '1px solid #e4e4e7', overflow: 'hidden' }}>
            <RouteMap legs={mapLegs} height={200} exportMode={exportMode} mapStyle={broker.map_style?.classic} />
          </div>
          <div style={{ borderRight: '1px solid #e4e4e7', overflow: 'hidden', position: 'relative', background: '#e4e4e7' }}>
            <img src={exteriorImage} alt="Aircraft exterior"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} crossOrigin="anonymous" />
            <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', padding: '2px 6px', borderRadius: 3, fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Exterior</div>
          </div>
          <div style={{ overflow: 'hidden', position: 'relative', background: '#e4e4e7' }}>
            <img src={interiorImage} alt="Aircraft interior"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} crossOrigin="anonymous" />
            <div style={{ position: 'absolute', top: 6, left: 6, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(4px)', padding: '2px 6px', borderRadius: 3, fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Interior</div>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ margin: '0 36px 24px', borderTop: '1px solid #f4f4f5', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 7.5, color: '#a1a1aa' }}>
          Generated by TripSheet AI · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div style={{ fontSize: 7.5, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.18em', color: '#a1a1aa' }}>
          Confidential Passenger Itinerary
        </div>
      </div>
    </div>
  );
}

// ── EXECUTIVE TEMPLATE ───────────────────────────────────────────────

function ExecutiveTemplate({ trip, broker, exportMode = false }: { trip: Trip; broker: BrokerProfile; exportMode?: boolean }) {
  const { visibility } = trip;
  const logoBoxStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.98)',
    padding: '6px 10px',
    borderRadius: 6,
    display: 'inline-flex',
    alignItems: 'center',
  };

  return (
    <div id="pdf-content" className="w-[760px] bg-white shadow-lg font-sans" style={{ minHeight: 1060, fontSize: 11 }}>

      {/* Dark header bar */}
      <div style={{ background: '#18181b', padding: '18px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {broker.logo_dataurl ? (
            <span style={logoBoxStyle}>
              <img src={broker.logo_dataurl} alt={broker.company_name}
                style={{ height: 28, maxWidth: 120, objectFit: 'contain' }} />
            </span>
          ) : (
            <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: '0.1em', color: '#fff', textTransform: 'uppercase' }}>
              {broker.company_name}
            </div>
          )}
          {broker.tagline && (
            <div style={{ fontSize: 7.5, color: '#52525b', marginTop: 3, letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 700 }}>
              {broker.tagline}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 7.5, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 700 }}>Confidential</div>
          <div style={{ fontSize: 7.5, color: '#52525b', marginTop: 2 }}>Private Charter Itinerary</div>
        </div>
      </div>

      {/* Title + trip metadata */}
      <div style={{ padding: '16px 36px 12px', borderBottom: '2px solid #18181b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#18181b' }}>
              Passenger Itinerary
            </div>
            <div style={{ marginTop: 4, fontSize: 9, color: '#3f3f46' }}>
              <strong>{trip.client.name}</strong>
              {trip.client.company && <span style={{ color: '#71717a' }}> — {trip.client.company}</span>}
              {trip.client.email   && <span style={{ color: '#a1a1aa' }}> · {trip.client.email}</span>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 8, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Reference</div>
            <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'monospace', color: '#18181b', letterSpacing: '0.06em' }}>
              {trip.trip_id.toUpperCase()}
            </div>
            <div style={{ fontSize: 8.5, color: '#71717a', marginTop: 1 }}>
              {trip.aircraft.model}
              {visibility.show_tail_number && ` · ${trip.aircraft.tail_number}`}
            </div>
          </div>
        </div>
      </div>

      {/* Legs */}
      <div style={{ padding: '0 36px' }}>
        {trip.legs.map((leg, idx) => {
          const depTime    = fmtTime(leg.departure?.datetime_local);
          const arrTime    = fmtTime(leg.arrival?.datetime_local);
          const tz         = leg.departure?.timezone || '';
          const atz        = leg.arrival?.timezone   || tz;
          const legDateLong = leg.date_local ? fmtDate(leg.date_local, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD';

          return (
            <div key={leg.leg_id} style={{ padding: '14px 0', borderBottom: '1px solid #f4f4f5', display: 'flex', gap: 14 }}>
              {/* Left accent bar */}
              <div style={{ width: 3, background: '#18181b', borderRadius: 2, flexShrink: 0 }} />

              <div style={{ flex: 1 }}>
                {/* Leg header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                    <span style={{ fontSize: 8, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#a1a1aa' }}>
                      Leg {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#18181b' }}>
                      {leg.departure?.airport_code} → {leg.arrival?.airport_code}
                    </span>
                    <span style={{ fontSize: 8.5, color: '#71717a' }}>{legDateLong}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 8.5, color: '#a1a1aa' }}>
                    {leg.metrics?.distance_nm       && <span>{leg.metrics.distance_nm} nm</span>}
                    {leg.metrics?.block_time_minutes && <span>{formatDuration(leg.metrics.block_time_minutes)}</span>}
                  </div>
                </div>

                {/* Two-column dep/arr */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {/* Dep */}
                  <div>
                    <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#a1a1aa', marginBottom: 4 }}>DEPARTS</div>
                    <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px', color: '#18181b', lineHeight: 1 }}>{depTime}</div>
                    <div style={{ fontSize: 8, color: '#71717a', marginTop: 2 }}>{tz}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#3f3f46', marginTop: 6 }}>
                      {leg.departure?.airport_code} — {leg.departure?.airport_name || leg.departure?.city}
                    </div>
                    {visibility.show_fbo_name && leg.departure?.fbo?.name && (
                      <div style={{ fontSize: 8.5, color: '#71717a', marginTop: 2 }}>{leg.departure.fbo.name}</div>
                    )}
                    {visibility.show_fbo_contact && leg.departure?.fbo?.address && (
                      <div style={{ fontSize: 8, color: '#a1a1aa', marginTop: 1 }}>{leg.departure.fbo.address}</div>
                    )}
                    {visibility.show_fbo_contact && leg.departure?.fbo?.phone && (
                      <div style={{ fontSize: 8, color: '#a1a1aa' }}>{leg.departure.fbo.phone}</div>
                    )}
                    {!visibility.show_fbo_name && !visibility.show_fbo_contact && (
                      <div style={{ fontSize: 8, color: '#d4d4d8', fontStyle: 'italic', marginTop: 4 }}>FBO details withheld</div>
                    )}
                  </div>

                  {/* Arr */}
                  <div style={{ borderLeft: '1px solid #f4f4f5', paddingLeft: 16 }}>
                    <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#a1a1aa', marginBottom: 4 }}>ARRIVES</div>
                    <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.5px', color: '#18181b', lineHeight: 1 }}>{arrTime}</div>
                    <div style={{ fontSize: 8, color: '#71717a', marginTop: 2 }}>{atz}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#3f3f46', marginTop: 6 }}>
                      {leg.arrival?.airport_code} — {leg.arrival?.airport_name || leg.arrival?.city}
                    </div>
                    {visibility.show_fbo_name && leg.arrival?.fbo?.name && (
                      <div style={{ fontSize: 8.5, color: '#71717a', marginTop: 2 }}>{leg.arrival.fbo.name}</div>
                    )}
                    {visibility.show_fbo_contact && leg.arrival?.fbo?.address && (
                      <div style={{ fontSize: 8, color: '#a1a1aa', marginTop: 1 }}>{leg.arrival.fbo.address}</div>
                    )}
                    {visibility.show_fbo_contact && leg.arrival?.fbo?.phone && (
                      <div style={{ fontSize: 8, color: '#a1a1aa' }}>{leg.arrival.fbo.phone}</div>
                    )}
                    {!visibility.show_fbo_name && !visibility.show_fbo_contact && (
                      <div style={{ fontSize: 8, color: '#d4d4d8', fontStyle: 'italic', marginTop: 4 }}>FBO details withheld</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Crew + Passengers side-by-side */}
      <div style={{ margin: '14px 36px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ padding: '10px 14px', background: '#fafafa', border: '1px solid #f4f4f5' }}>
          <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#a1a1aa', marginBottom: 7 }}>Flight Crew</div>
          {trip.crew.length > 0 ? trip.crew.map((m, i) => (
            <div key={i} style={{ fontSize: 9.5, marginBottom: 3, display: 'flex', alignItems: 'baseline', gap: 6 }}>
              <span style={{ fontWeight: 900, color: '#18181b', minWidth: 28, fontSize: 7.5, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{m.role}</span>
              <span style={{ fontWeight: 700, color: '#3f3f46' }}>{m.name || '—'}</span>
              {visibility.show_crew_contact && m.phone && (
                <span style={{ color: '#a1a1aa', fontSize: 8 }}>{m.phone}</span>
              )}
            </div>
          )) : <div style={{ fontSize: 9, color: '#a1a1aa', fontStyle: 'italic' }}>Crew not assigned</div>}
        </div>
        <div style={{ padding: '10px 14px', background: '#fafafa', border: '1px solid #f4f4f5' }}>
          <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#a1a1aa', marginBottom: 7 }}>
            Passengers ({trip.passengers.length})
          </div>
          {trip.passengers.length > 0 ? trip.passengers.map((p, i) => (
            <div key={i} style={{ fontSize: 9.5, fontWeight: 700, color: '#3f3f46', marginBottom: 3 }}>
              {visibility.show_passenger_names ? p.full_name : `Passenger ${i + 1}`}
            </div>
          )) : <div style={{ fontSize: 9, color: '#a1a1aa', fontStyle: 'italic' }}>No passengers listed</div>}
        </div>
      </div>

      {/* Footer */}
      <div style={{ margin: '16px 36px 28px', borderTop: '1px solid #e4e4e7', paddingTop: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 7.5, color: '#a1a1aa' }}>
          {broker.company_name}
          {broker.phone && ` · ${broker.phone}`}
          {broker.email && ` · ${broker.email}`}
        </div>
        <div style={{ fontSize: 7.5, color: '#a1a1aa' }}>
          Generated by TripSheet AI · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}

// ── PREMIUM TEMPLATE ─────────────────────────────────────────────────

function PremiumTemplate({ trip, broker, exportMode = false }: { trip: Trip; broker: BrokerProfile; exportMode?: boolean }) {
  const { visibility } = trip;
  const ACCENT = broker.primary_color;
  const mapLegs = buildMapLegs(trip);
  const logoBoxStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.98)',
    padding: '6px 10px',
    borderRadius: 6,
    display: 'inline-flex',
    alignItems: 'center',
  };

  const routeString = formatRouteString(trip);

  return (
    <div id="pdf-content" className="w-[760px] bg-white shadow-lg font-sans" style={{ minHeight: 1060, fontSize: 11 }}>

      {/* Dark luxury header */}
      <div style={{ background: '#0c0c0d', padding: '22px 36px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            {broker.logo_dataurl ? (
              <span style={logoBoxStyle}>
                <img src={broker.logo_dataurl} alt={broker.company_name}
                  style={{ height: 30, maxWidth: 130, objectFit: 'contain' }} />
              </span>
            ) : (
              <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '0.04em' }}>
                {broker.company_name.toUpperCase()}
              </div>
            )}
            {broker.tagline && (
              <div style={{ fontSize: 7.5, color: '#52525b', marginTop: 4, letterSpacing: '0.22em', textTransform: 'uppercase', fontWeight: 700 }}>
                {broker.tagline}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT }} />
            <div style={{ fontSize: 7.5, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.22em', fontWeight: 700 }}>
              Private Charter
            </div>
          </div>
        </div>
        {/* Accent gradient line */}
        <div style={{ marginTop: 14, height: 1, background: `linear-gradient(to right, ${ACCENT}, transparent)` }} />
      </div>

      {/* Trip title */}
      <div style={{ padding: '14px 36px', borderBottom: '1px solid #f4f4f5', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#18181b' }}>
            Passenger Itinerary
          </div>
          <div style={{ fontSize: 9, color: '#71717a', marginTop: 3 }}>
            <strong style={{ color: '#18181b' }}>{trip.client.name}</strong>
            {trip.client.company && ` — ${trip.client.company}`}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 7.5, color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Ref</div>
          <div style={{ fontSize: 14, fontWeight: 900, fontFamily: 'monospace', color: '#18181b' }}>
            {trip.trip_id.toUpperCase()}
          </div>
          <div style={{ fontSize: 8.5, color: '#71717a', marginTop: 1 }}>
            {trip.aircraft.model}
            {visibility.show_tail_number && ` · ${trip.aircraft.tail_number}`}
          </div>
        </div>
      </div>

      {/* Boarding-pass style legs */}
      <div style={{ padding: '14px 36px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {trip.legs.map((leg, idx) => {
          const depTime    = fmtTime(leg.departure?.datetime_local);
          const arrTime    = fmtTime(leg.arrival?.datetime_local);
          const tz         = leg.departure?.timezone || '';
          const atz        = leg.arrival?.timezone   || tz;
          const legDateLong = leg.date_local ? fmtDate(leg.date_local, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD';

          return (
            <div key={leg.leg_id} style={{ border: '1px solid #e4e4e7', overflow: 'hidden' }}>
              {/* Dark card header */}
              <div style={{ background: '#0c0c0d', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 3, height: 22, background: ACCENT, borderRadius: 2, flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: 7.5, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.16em' }}>
                      Leg {idx + 1} · {leg.label}
                    </div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, color: '#fff' }}>{legDateLong}</div>
                  </div>
                </div>
                <div style={{ fontSize: 8, color: '#52525b', display: 'flex', gap: 12 }}>
                  {leg.metrics?.distance_nm       && <span>{leg.metrics.distance_nm} nm</span>}
                  {leg.metrics?.block_time_minutes && <span>{formatDuration(leg.metrics.block_time_minutes)}</span>}
                </div>
              </div>

              {/* Boarding-pass body: large times */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '16px 20px', gap: 8, background: '#fff' }}>
                {/* Departure */}
                <div>
                  <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1px', color: '#18181b', lineHeight: 1 }}>{depTime}</div>
                  <div style={{ fontSize: 7.5, color: '#a1a1aa', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{tz}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: ACCENT, marginTop: 8, letterSpacing: '0.06em' }}>
                    {leg.departure?.airport_code}
                  </div>
                  <div style={{ fontSize: 8.5, color: '#71717a', marginTop: 1 }}>
                    {leg.departure?.city}{leg.departure?.state ? `, ${leg.departure.state}` : ''}
                  </div>
                  {visibility.show_fbo_name && leg.departure?.fbo?.name && (
                    <div style={{ fontSize: 8, color: '#a1a1aa', marginTop: 5 }}>{leg.departure.fbo.name}</div>
                  )}
                  {visibility.show_fbo_contact && leg.departure?.fbo?.phone && (
                    <div style={{ fontSize: 7.5, color: '#a1a1aa' }}>{leg.departure.fbo.phone}</div>
                  )}
                  {!visibility.show_fbo_name && !visibility.show_fbo_contact && (
                    <div style={{ fontSize: 7.5, color: '#d4d4d8', fontStyle: 'italic', marginTop: 4 }}>FBO withheld</div>
                  )}
                </div>

                {/* Center arrow + duration */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 18px' }}>
                  <div style={{ fontSize: 24, color: '#d4d4d8', lineHeight: 1 }}>→</div>
                  {leg.metrics?.block_time_minutes && (
                    <div style={{ fontSize: 7.5, color: '#a1a1aa', marginTop: 5, textAlign: 'center', lineHeight: 1.4 }}>
                      {formatDuration(leg.metrics.block_time_minutes)}
                    </div>
                  )}
                </div>

                {/* Arrival */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '-1px', color: '#18181b', lineHeight: 1 }}>{arrTime}</div>
                  <div style={{ fontSize: 7.5, color: '#a1a1aa', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{atz}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: ACCENT, marginTop: 8, letterSpacing: '0.06em' }}>
                    {leg.arrival?.airport_code}
                  </div>
                  <div style={{ fontSize: 8.5, color: '#71717a', marginTop: 1 }}>
                    {leg.arrival?.city}{leg.arrival?.state ? `, ${leg.arrival.state}` : ''}
                  </div>
                  {visibility.show_fbo_name && leg.arrival?.fbo?.name && (
                    <div style={{ fontSize: 8, color: '#a1a1aa', marginTop: 5 }}>{leg.arrival.fbo.name}</div>
                  )}
                  {visibility.show_fbo_contact && leg.arrival?.fbo?.phone && (
                    <div style={{ fontSize: 7.5, color: '#a1a1aa' }}>{leg.arrival.fbo.phone}</div>
                  )}
                  {!visibility.show_fbo_name && !visibility.show_fbo_contact && (
                    <div style={{ fontSize: 7.5, color: '#d4d4d8', fontStyle: 'italic', marginTop: 4 }}>FBO withheld</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full-width route map */}
      <div style={{ margin: '14px 36px', border: '1px solid #e4e4e7', overflow: 'hidden' }}>
        <div style={{ background: '#0c0c0d', padding: '6px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 7.5, fontWeight: 700, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.16em' }}>Route Map</span>
          <span style={{ fontSize: 8, color: '#3f3f46' }}>{routeString}</span>
        </div>
        <RouteMap legs={mapLegs} height={160} exportMode={exportMode} mapStyle={broker.map_style?.premium} />
      </div>

      {/* Crew + Passengers */}
      <div style={{ margin: '0 36px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div style={{ background: '#fafafa', border: '1px solid #f4f4f5', padding: '10px 14px' }}>
          <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#a1a1aa', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 2, height: 10, background: ACCENT, borderRadius: 1, flexShrink: 0 }} />
            Flight Crew
          </div>
          {trip.crew.length > 0 ? trip.crew.map((m, i) => (
            <div key={i} style={{ fontSize: 9.5, marginBottom: 3 }}>
              <span style={{ fontWeight: 900, fontSize: 7.5, textTransform: 'uppercase', color: ACCENT, letterSpacing: '0.08em' }}>{m.role}</span>{' '}
              <span style={{ fontWeight: 700, color: '#18181b' }}>{m.name || '—'}</span>
              {visibility.show_crew_contact && m.phone && (
                <span style={{ color: '#a1a1aa', fontSize: 8, marginLeft: 4 }}>{m.phone}</span>
              )}
            </div>
          )) : <div style={{ fontSize: 9, color: '#a1a1aa', fontStyle: 'italic' }}>Crew not assigned</div>}
        </div>
        <div style={{ background: '#fafafa', border: '1px solid #f4f4f5', padding: '10px 14px' }}>
          <div style={{ fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#a1a1aa', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 2, height: 10, background: ACCENT, borderRadius: 1, flexShrink: 0 }} />
            Passengers ({trip.passengers.length})
          </div>
          {trip.passengers.length > 0 ? trip.passengers.map((p, i) => (
            <div key={i} style={{ fontSize: 9.5, fontWeight: 700, color: '#18181b', marginBottom: 3 }}>
              {visibility.show_passenger_names ? p.full_name : `Passenger ${i + 1}`}
            </div>
          )) : <div style={{ fontSize: 9, color: '#a1a1aa', fontStyle: 'italic' }}>No passengers listed</div>}
        </div>
      </div>

      {/* Dark footer */}
      <div style={{ background: '#0c0c0d', padding: '12px 36px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <div style={{ fontSize: 7.5, color: '#52525b' }}>
          {broker.company_name}
          {broker.phone && ` · ${broker.phone}`}
          {broker.email && ` · ${broker.email}`}
        </div>
        <div style={{ fontSize: 7.5, color: '#52525b' }}>
          Generated by TripSheet AI · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
      </div>
    </div>
  );
}

// ── MAIN EXPORT ───────────────────────────────────────────────────────

export function PreviewPanel({ trip, brokerProfile, templateId, exportMode = false }: PreviewPanelProps) {
  return (
    <div className="bg-zinc-100 p-6 h-full overflow-y-auto flex justify-center items-start">
      {templateId === 'classic'   && <ClassicTemplate   trip={trip} broker={brokerProfile} exportMode={exportMode} />}
      {templateId === 'executive' && <ExecutiveTemplate trip={trip} broker={brokerProfile} exportMode={exportMode} />}
      {templateId === 'premium'   && <PremiumTemplate   trip={trip} broker={brokerProfile} exportMode={exportMode} />}
    </div>
  );
}
