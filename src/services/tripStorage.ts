import { db } from '../lib/firebase';
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, setDoc, getDoc, query, orderBy, Timestamp,
} from 'firebase/firestore';
import { Trip, BrokerProfile, TemplateId, StoredTrip } from '../types';

function buildRoute(trip: Trip): string {
  if (!trip.legs || trip.legs.length === 0) return '—';
  const first = trip.legs[0]?.departure?.airport_code || '?';
  const last = trip.legs[trip.legs.length - 1]?.arrival?.airport_code || '?';
  return `${first} → ${last}`;
}

// Compress a base64 data URL using an offscreen canvas.
// Images are resized so neither dimension exceeds maxPx.
// Use format='png' to preserve transparency (e.g. logos); 'jpeg' for photos.
// Returns the original value unchanged if it isn't a data: URL.
function compressImage(
  dataUrl: string,
  maxPx = 600,
  quality = 0.65,
  format: 'jpeg' | 'png' = 'jpeg',
): Promise<string> {
  if (!dataUrl.startsWith('data:')) return Promise.resolve(dataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext('2d')!;
      if (format === 'jpeg') {
        // Fill white so transparent areas don't become black
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL(`image/${format}`, format === 'jpeg' ? quality : undefined));
    };
    img.onerror = () => resolve(dataUrl); // non-fatal: keep original
    img.src = dataUrl;
  });
}

export async function saveTrip(
  userId: string,
  trip: Trip,
  template: TemplateId,
): Promise<string> {
  const ref = collection(db, 'users', userId, 'trips');
  const docRef = await addDoc(ref, {
    tripId: trip.trip_id,
    clientName: trip.client?.name || 'Unknown',
    route: buildRoute(trip),
    trip,
    template,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
}

export async function loadTrips(userId: string): Promise<StoredTrip[]> {
  const ref = collection(db, 'users', userId, 'trips');
  const q = query(ref, orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => {
    const data = d.data();
    return {
      id: d.id,
      tripId: data.tripId as string,
      clientName: data.clientName as string,
      route: data.route as string,
      trip: data.trip as Trip,
      template: data.template as TemplateId,
      createdAt: (data.createdAt as Timestamp).toDate(),
    };
  });
}

export async function deleteTrip(userId: string, tripDocId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'trips', tripDocId));
}

export async function createShareLink(
  userId: string,
  trip: Trip,
  brokerProfile: BrokerProfile,
  template: TemplateId,
): Promise<string> {
  const shareId = Math.random().toString(36).substr(2, 14);

  // Compress images client-side before writing to Firestore.
  // Canvas resize + JPEG encoding keeps each image well under 200 KB,
  // so the whole document stays inside Firestore's 1 MB limit.
  const [logo, exterior, interior] = await Promise.all([
    brokerProfile.logo_dataurl           ? compressImage(brokerProfile.logo_dataurl, 600, 0.65, 'png')   : Promise.resolve(undefined),
    brokerProfile.exterior_image_dataurl ? compressImage(brokerProfile.exterior_image_dataurl)            : Promise.resolve(undefined),
    brokerProfile.interior_image_dataurl ? compressImage(brokerProfile.interior_image_dataurl)            : Promise.resolve(undefined),
  ]);

  const storedProfile: BrokerProfile = {
    ...brokerProfile,
    ...(logo     !== undefined && { logo_dataurl:             logo }),
    ...(exterior !== undefined && { exterior_image_dataurl:   exterior }),
    ...(interior !== undefined && { interior_image_dataurl:   interior }),
  };

  await setDoc(doc(db, 'shared_trips', shareId), {
    trip,
    brokerProfile: storedProfile,
    template,
    createdAt: Timestamp.now(),
    userId,
  });
  return shareId;
}

export async function loadSharedTrip(shareId: string): Promise<{
  trip: Trip;
  brokerProfile: BrokerProfile;
  template: TemplateId;
} | null> {
  const snap = await getDoc(doc(db, 'shared_trips', shareId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    trip: data.trip as Trip,
    brokerProfile: data.brokerProfile as BrokerProfile,
    template: data.template as TemplateId,
  };
}
