import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

// ── Airport coordinates (lat, lon) for common US + international airports ──
export const AIRPORT_COORDS: Record<string, [number, number]> = {
  // California
  VNY: [34.2098, -118.4909], LAX: [33.9425, -118.4081], BUR: [34.2007, -118.3585],
  SNA: [33.6757, -117.8676], LGB: [33.8177, -118.1516], ONT: [34.0560, -117.6012],
  SJC: [37.3626, -121.9289], SFO: [37.6213, -122.3790], OAK: [37.7213, -122.2208],
  SMF: [38.6954, -121.5908], SAN: [32.7336, -117.1896], FAT: [36.7762, -119.7181],
  MRY: [36.5870, -121.8429], SBA: [34.4262, -119.8404], PSP: [33.8297, -116.5069],
  // Northwest
  SEA: [47.4502, -122.3088], PDX: [45.5898, -122.5951], BOI: [43.5644, -116.2228],
  // Nevada / Arizona / Utah / Colorado
  LAS: [36.0840, -115.1537], PHX: [33.4373, -112.0078], TUS: [32.1161, -110.9410],
  SLC: [40.7899, -111.9791], DEN: [39.8561, -104.6737], APA: [39.5702, -104.8490],
  // Texas
  DFW: [32.8998, -97.0403], DAL: [32.8474, -96.8517], IAH: [29.9902, -95.3368],
  HOU: [29.6454, -95.2789], AUS: [30.1975, -97.6664], SAT: [29.5337, -98.4698],
  ELP: [31.8072, -106.3779],
  // Southeast
  ATL: [33.6367, -84.4281], MIA: [25.7959, -80.2870], FLL: [26.0724, -80.1527],
  MCO: [28.4294, -81.3090], TPA: [27.9755, -82.5332], PBI: [26.6832, -80.0956],
  OPF: [25.9079, -80.2786], SRQ: [27.3954, -82.5544], RSW: [26.5362, -81.7553],
  JAX: [30.4941, -81.6879], BNA: [36.1245, -86.6782], CLT: [35.2140, -80.9431],
  RDU: [35.8776, -78.7875], ORF: [36.8976, -76.0123],
  // Northeast
  JFK: [40.6413, -73.7781], LGA: [40.7769, -73.8740], EWR: [40.6895, -74.1745],
  TEB: [40.8501, -74.0608], HPN: [41.0670, -73.7076], SWF: [41.5041, -74.1048],
  BOS: [42.3656, -71.0096], PVD: [41.7240, -71.4283], BDL: [41.9389, -72.6831],
  PHL: [39.8744, -75.2424], BWI: [39.1754, -76.6684], DCA: [38.8512, -77.0402],
  IAD: [38.9531, -77.4565], PIT: [40.4915, -80.2329],
  // Midwest
  ORD: [41.9742, -87.9073], MDW: [41.7868, -87.7522], DTW: [42.2162, -83.3554],
  MSP: [44.8848, -93.2223], MKE: [42.9472, -87.8966], STL: [38.7487, -90.3700],
  CLE: [41.4117, -81.8498], CVG: [39.0480, -84.6678], IND: [39.7173, -86.2944],
  CMH: [39.9980, -82.8919], MCI: [39.2976, -94.7139], OMA: [41.3032, -95.8940],
  // Mid-Atlantic / Carolinas
  RIC: [37.5052, -77.3197], CHS: [32.8987, -80.0405],
  // International (common charter)
  YYZ: [43.6777, -79.6248], YUL: [45.4706, -73.7408], YVR: [49.1967, -123.1815],
  MYNN: [25.0387, -77.4664], MYEG: [24.3969, -76.8138],
  MKJP: [17.9357, -76.7875], MMUN: [21.0365, -86.8771], MMCA: [20.6804, -105.0120],
  TJSJ: [18.4394, -66.0018], TNCM: [18.0410, -63.1089], TUPJ: [18.4446, -64.5430],
  NAS: [25.0387, -77.4664], AXA: [18.2049, -63.0505],
  EGLL: [51.4775, -0.4614], EGKK: [51.1481, -0.1903], EGGW: [51.8747, -0.3683],
  LFPB: [48.9744, 2.4414], LFPO: [48.7233, 2.3794],
  EDDF: [50.0264, 8.5431], EDDM: [48.3537, 11.7750],
  LEMD: [40.4719, -3.5626], LEAL: [38.2822, -0.5582],
  LIRF: [41.8003, 12.2389], LIME: [45.6739, 9.7042], LIRA: [41.9527, 12.4957],
  OMDB: [25.2532, 55.3657], OMAA: [24.4330, 54.6511], OERK: [24.9576, 46.6988],
  LLBG: [32.0114, 34.8867], HECA: [30.1219, 31.4056],
  VTBS: [13.6811, 100.7477], VHHH: [22.3080, 113.9185],
  RJTT: [35.5494, 139.7798], WSSS: [1.3644, 103.9915],
  YSSY: [-33.9399, 151.1753], YMML: [-37.6690, 144.8410],
};

function getCoords(code: string): [number, number] | null {
  const clean = code?.toUpperCase().replace(/^K/, ''); // strip ICAO K prefix for US airports
  return AIRPORT_COORDS[clean] || AIRPORT_COORDS[code?.toUpperCase()] || null;
}

function makePin(color: string, size = 14): L.DivIcon {
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border:2.5px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

interface RouteMapProps {
  legs: Array<{
    departure: { airport_code: string; city?: string };
    arrival: { airport_code: string; city?: string };
  }>;
  height?: number;
  exportMode?: boolean;
  mapStyle?: 'leaflet' | 'svg';
}

function normalizeCoords(points: [number, number][], width: number, height: number, padding: number) {
  const lats = points.map(p => p[0]);
  const lons = points.map(p => p[1]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const latRange = Math.max(0.001, maxLat - minLat);
  const lonRange = Math.max(0.001, maxLon - minLon);

  return points.map(([lat, lon]) => {
    const x = padding + ((lon - minLon) / lonRange) * (width - padding * 2);
    const y = padding + ((maxLat - lat) / latRange) * (height - padding * 2);
    return [x, y] as [number, number];
  });
}

function buildRoutePoints(legs: RouteMapProps['legs']) {
  const codes: string[] = [];
  legs.forEach((leg, i) => {
    if (i === 0) codes.push(leg.departure.airport_code);
    codes.push(leg.arrival.airport_code);
  });
  const coords = codes.map(c => getCoords(c)).filter(Boolean) as [number, number][];
  if (codes.length < 2) {
    codes.push('TBD', 'TBD');
  }
  return { codes, coords };
}

function SimpleSvgMap({ legs, height = 200 }: RouteMapProps) {
  const width = 640;
  const padding = 28;
  const { codes, coords } = buildRoutePoints(legs);
  const usableCoords = coords.length >= 2 ? coords : codes.map(() => [0, 0] as [number, number]);
  const points = coords.length >= 2
    ? normalizeCoords(usableCoords, width, height, padding)
    : codes.map((_, i) => {
        const x = padding + (i / Math.max(1, codes.length - 1)) * (width - padding * 2);
        const y = height / 2 + (i % 2 === 0 ? -12 : 12);
        return [x, y] as [number, number];
      });

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      style={{ display: 'block', background: '#f8fafc' }}
    >
      <defs>
        <linearGradient id="routeLine" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#dc2626" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
      </defs>
      <path d={path} fill="none" stroke="url(#routeLine)" strokeWidth="2.5" strokeDasharray="6 5" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p[0]} cy={p[1]} r={i === 0 || i === points.length - 1 ? 6 : 4} fill={i === 0 ? '#dc2626' : i === points.length - 1 ? '#16a34a' : '#2563eb'} stroke="#fff" strokeWidth="2" />
          {codes[i] && (
            <text x={p[0]} y={p[1] + 16} textAnchor="middle" fontSize="9" fontWeight="700" fill="#475569">
              {codes[i]}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export function RouteMap({ legs, height = 200, exportMode = false, mapStyle = 'leaflet' }: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  // Build ordered list of airport codes
  const codes: string[] = [];
  legs.forEach((leg, i) => {
    if (i === 0) codes.push(leg.departure.airport_code);
    codes.push(leg.arrival.airport_code);
  });

  const routeLabel = legs.map((leg, i) => {
    if (i === 0) {
      return leg.departure.airport_code || leg.departure.city || '';
    }
    return leg.arrival.airport_code || leg.arrival.city || '';
  }).filter(Boolean).join(' → ');
  const mapPoints = codes.map(c => getCoords(c)).filter(Boolean) as [number, number][];
  const hasMap = mapPoints.length >= 2;

  useEffect(() => {
    if (!containerRef.current) return;
    if (!hasMap || mapStyle === 'svg') return;

    // Clean up previous instance
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    // Resolve to coordinates
    const points: Array<{ code: string; coords: [number, number]; label: string }> = [];
    codes.forEach((code, i) => {
      const coords = getCoords(code);
      if (coords) {
        const leg = i < legs.length ? legs[i] : legs[legs.length - 1];
        const city = i < legs.length
          ? leg.departure.city || ''
          : legs[legs.length - 1].arrival.city || '';
        points.push({ code, coords, label: city || code });
      }
    });

    if (points.length < 2) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: true,
      scrollWheelZoom: false,
      dragging: false,
      touchZoom: false,
      doubleClickZoom: false,
      keyboard: false,
      boxZoom: false,
    });

    // CartoDB Light — clean, minimal, no clutter
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      crossOrigin: 'anonymous',
      maxZoom: 19,
    }).addTo(map);

    // Route polyline — red dashed, like the reference image
    const routeCoords = points.map(p => p.coords as L.LatLngExpression);
    L.polyline(routeCoords, {
      color: '#dc2626',
      weight: 2.5,
      dashArray: '8 5',
      opacity: 0.85,
    }).addTo(map);

    // Airport pins
    points.forEach((pt, i) => {
      const isFirst = i === 0;
      const isLast = i === points.length - 1;
      const color = isFirst ? '#dc2626' : isLast ? '#16a34a' : '#2563eb';
      const size = isFirst || isLast ? 14 : 11;

      L.marker(pt.coords as L.LatLngExpression, { icon: makePin(color, size) })
        .addTo(map);

      // City label
      L.marker(pt.coords as L.LatLngExpression, {
        icon: L.divIcon({
          className: '',
          html: `<div style="font:700 9px/1 'Inter',sans-serif;color:#374151;white-space:nowrap;margin-top:18px;margin-left:-20px;text-shadow:0 1px 2px white,0 -1px 2px white">${pt.code}</div>`,
          iconSize: [60, 20],
          iconAnchor: [0, 0],
        }),
      }).addTo(map);
    });

    // Fit map to show all points with padding
    const latLngs = points.map(p => L.latLng(p.coords[0], p.coords[1]));
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds, { padding: [28, 28] });

    // Minimal attribution
    map.attributionControl.setPrefix(false as any);

    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 0);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [legs]);

  return (
    <div className="relative" style={{ height, width: '100%', zIndex: 0 }}>
      {hasMap && mapStyle !== 'svg' && (
        <div
          ref={containerRef}
          style={{ height, width: '100%' }}
          className="bg-zinc-50"
        />
      )}
      {(!hasMap || mapStyle === 'svg') && (
        <SimpleSvgMap legs={legs} height={height} />
      )}
    </div>
  );
}
