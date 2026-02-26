import React from 'react';
import { TemplateId } from '../types';

export const TEMPLATES: { id: TemplateId; name: string; description: string }[] = [
  { id: 'classic',   name: 'Classic',   description: 'Teal accents · Route map · Aircraft photos' },
  { id: 'executive', name: 'Executive', description: 'Monochrome · Minimal · No photos' },
  { id: 'premium',   name: 'Premium',   description: 'Dark luxury · Bold times · Full map' },
];

function ClassicThumb() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', padding: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          <div style={{ width: 28, height: 10, background: '#008080', borderRadius: 2, opacity: 0.9 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ width: 36, height: 3, background: '#d4d4d8', borderRadius: 1 }} />
            <div style={{ width: 28, height: 2, background: '#e4e4e7', borderRadius: 1 }} />
          </div>
        </div>
        <div style={{ width: 28, height: 20, background: '#f9fafb', border: '1px solid #e4e4e7', borderRadius: 2 }} />
      </div>
      <div style={{ width: '100%', height: 5, background: '#f4f4f5', borderRadius: 1 }} />
      {[0, 1].map(i => (
        <div key={i} style={{ border: '1px solid #e4e4e7', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ background: '#008080', height: 7, width: '100%' }} />
          <div style={{ display: 'flex', gap: 4, padding: '4px 4px' }}>
            {[0, 1].map(j => (
              <div key={j} style={{ flex: 1 }}>
                <div style={{ width: '85%', height: 4, background: '#e4e4e7', borderRadius: 1, marginBottom: 2 }} />
                <div style={{ width: '60%', height: 3, background: '#f4f4f5', borderRadius: 1 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3, height: 22, marginTop: 'auto' }}>
        <div style={{ background: '#c4c4c8', borderRadius: 2 }} />
        <div style={{ background: '#e4e4e7', borderRadius: 2 }} />
        <div style={{ background: '#e4e4e7', borderRadius: 2 }} />
      </div>
    </div>
  );
}

function ExecutiveThumb() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#18181b', padding: '6px 8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ width: 40, height: 7, background: '#fff', borderRadius: 1, opacity: 0.85 }} />
        <div style={{ width: 22, height: 5, background: '#52525b', borderRadius: 1 }} />
      </div>
      <div style={{ flex: 1, padding: 7, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ paddingBottom: 5, borderBottom: '2px solid #18181b' }}>
          <div style={{ width: 65, height: 6, background: '#18181b', borderRadius: 1, marginBottom: 3 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            <div style={{ width: 35, height: 3, background: '#d4d4d8', borderRadius: 1 }} />
            <div style={{ width: 25, height: 3, background: '#e4e4e7', borderRadius: 1 }} />
          </div>
        </div>
        {[0, 1].map(i => (
          <div key={i} style={{ display: 'flex', gap: 5, paddingBottom: 4, borderBottom: '1px solid #f4f4f5' }}>
            <div style={{ width: 3, background: '#18181b', borderRadius: 2, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 3 }}>
                <div style={{ width: 14, height: 4, background: '#a1a1aa', borderRadius: 1 }} />
                <div style={{ width: 30, height: 5, background: '#18181b', borderRadius: 1 }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {[0, 1].map(j => (
                  <div key={j}>
                    <div style={{ width: '60%', height: 8, background: '#18181b', borderRadius: 1, marginBottom: 2 }} />
                    <div style={{ width: '80%', height: 3, background: '#e4e4e7', borderRadius: 1 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginTop: 'auto' }}>
          {[0, 1].map(i => (
            <div key={i} style={{ background: '#fafafa', border: '1px solid #f4f4f5', padding: 4, borderRadius: 2 }}>
              <div style={{ width: '60%', height: 3, background: '#d4d4d8', borderRadius: 1, marginBottom: 3 }} />
              <div style={{ width: '80%', height: 3, background: '#e4e4e7', borderRadius: 1 }} />
              <div style={{ width: '70%', height: 3, background: '#e4e4e7', borderRadius: 1, marginTop: 2 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PremiumThumb() {
  return (
    <div style={{ width: '100%', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      <div style={{ background: '#0c0c0d', padding: '8px 8px 6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ width: 36, height: 7, background: '#fff', opacity: 0.85, borderRadius: 1 }} />
            <div style={{ width: 26, height: 3, background: '#3f3f46', borderRadius: 1, marginTop: 3 }} />
          </div>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#008080' }} />
        </div>
        <div style={{ marginTop: 8, height: 1, background: 'linear-gradient(to right, #008080, transparent)' }} />
      </div>
      <div style={{ flex: 1, padding: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ paddingBottom: 5, borderBottom: '1px solid #f4f4f5', display: 'flex', justifyContent: 'space-between' }}>
          <div style={{ width: 55, height: 5, background: '#18181b', borderRadius: 1 }} />
          <div style={{ width: 22, height: 5, background: '#d4d4d8', borderRadius: 1 }} />
        </div>
        {[0, 1].map(i => (
          <div key={i} style={{ border: '1px solid #e4e4e7', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ background: '#0c0c0d', padding: '3px 5px', display: 'flex', alignItems: 'center', gap: 3 }}>
              <div style={{ width: 2, height: 10, background: '#008080', borderRadius: 1 }} />
              <div style={{ width: 35, height: 4, background: '#3f3f46', borderRadius: 1 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', padding: '5px 5px', gap: 3, alignItems: 'center' }}>
              <div>
                <div style={{ width: '80%', height: 7, background: '#18181b', borderRadius: 1, marginBottom: 2 }} />
                <div style={{ width: 16, height: 5, background: '#008080', borderRadius: 1 }} />
              </div>
              <div style={{ fontSize: 8, color: '#d4d4d8' }}>→</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ width: '80%', height: 7, background: '#18181b', borderRadius: 1, marginBottom: 2, marginLeft: 'auto' }} />
                <div style={{ width: 16, height: 5, background: '#008080', borderRadius: 1, marginLeft: 'auto' }} />
              </div>
            </div>
          </div>
        ))}
        <div style={{ flex: 1, background: '#d4d4d8', borderRadius: 2, minHeight: 16 }} />
      </div>
      <div style={{ background: '#0c0c0d', padding: '4px 6px' }}>
        <div style={{ width: '60%', height: 3, background: '#3f3f46', borderRadius: 1 }} />
      </div>
    </div>
  );
}

export function TemplateThumb({ id }: { id: TemplateId }) {
  if (id === 'classic') return <ClassicThumb />;
  if (id === 'executive') return <ExecutiveThumb />;
  return <PremiumThumb />;
}
