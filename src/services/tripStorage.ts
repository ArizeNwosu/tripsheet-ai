import { db, storage } from '../lib/firebase';
import {
  collection, addDoc, getDocs, deleteDoc,
  doc, setDoc, getDoc, query, orderBy, Timestamp,
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { Trip, BrokerProfile, TemplateId, StoredTrip } from '../types';

function buildRoute(trip: Trip): string {
  if (!trip.legs || trip.legs.length === 0) return '—';
  const first = trip.legs[0]?.departure?.airport_code || '?';
  const last = trip.legs[trip.legs.length - 1]?.arrival?.airport_code || '?';
  return `${first} → ${last}`;
}

// Upload a base64 data URL to Firebase Storage and return the public download URL.
// Returns undefined (non-fatal) if the upload fails or the data URL is absent.
async function uploadImage(
  shareId: string,
  key: string,
  dataUrl: string | undefined,
): Promise<string | undefined> {
  if (!dataUrl || !dataUrl.startsWith('data:')) return undefined;
  try {
    const storageRef = ref(storage, `shared_trips/${shareId}/${key}`);
    await uploadString(storageRef, dataUrl, 'data_url');
    return await getDownloadURL(storageRef);
  } catch (err) {
    console.warn(`Image upload skipped for ${key}:`, err);
    return undefined;
  }
}

// Strip base64 images from a profile (used for Firestore history entries
// where images aren't needed — the user's localStorage copy has them).
function stripImages(profile: BrokerProfile): BrokerProfile {
  const { logo_dataurl, exterior_image_dataurl, interior_image_dataurl, ...rest } = profile;
  return rest;
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

  // Upload base64 images to Firebase Storage in parallel.
  // The returned HTTPS URLs replace the base64 strings in the stored profile —
  // this keeps the Firestore document small while preserving the images.
  const [logoUrl, exteriorUrl, interiorUrl] = await Promise.all([
    uploadImage(shareId, 'logo', brokerProfile.logo_dataurl),
    uploadImage(shareId, 'exterior', brokerProfile.exterior_image_dataurl),
    uploadImage(shareId, 'interior', brokerProfile.interior_image_dataurl),
  ]);

  const storedProfile: BrokerProfile = {
    ...stripImages(brokerProfile),
    ...(logoUrl      && { logo_dataurl: logoUrl }),
    ...(exteriorUrl  && { exterior_image_dataurl: exteriorUrl }),
    ...(interiorUrl  && { interior_image_dataurl: interiorUrl }),
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
