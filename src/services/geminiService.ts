import { GoogleGenAI } from "@google/genai";
import { Trip, TRIP_SCHEMA, AISuggestion, SUGGESTION_SCHEMA } from "../types";

const MODEL = "gemini-2.5-flash";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms)
    ),
  ]);
}

function hasCriticalGaps(raw: any): boolean {
  if (!raw) return true;
  if (!raw.client?.name) return true;
  if (!raw.aircraft?.model || !raw.aircraft?.tail_number) return true;
  if (!Array.isArray(raw.legs) || raw.legs.length === 0) return true;
  return raw.legs.some((leg: any) =>
    !leg?.departure?.airport_code ||
    !leg?.arrival?.airport_code ||
    !leg?.departure?.datetime_local ||
    !leg?.arrival?.datetime_local
  );
}

function fillDefaults(trip: Trip): Trip {
  const safe = (val: string | undefined, fallback = 'TBD') =>
    val && val.trim().length > 0 ? val : fallback;

  return {
    ...trip,
    client: {
      ...(trip.client || {}),
      name: safe(trip.client?.name),
    },
    aircraft: {
      ...(trip.aircraft || {}),
      model: safe(trip.aircraft?.model),
      tail_number: safe(trip.aircraft?.tail_number),
    },
    legs: trip.legs.map((leg) => ({
      ...leg,
      label: safe(leg.label, 'Leg'),
      date_local: safe(leg.date_local, ''),
      departure: {
        ...leg.departure,
        airport_code: safe(leg.departure?.airport_code),
        airport_name: safe(leg.departure?.airport_name),
        city: safe(leg.departure?.city),
        state: safe(leg.departure?.state, ''),
        timezone: safe(leg.departure?.timezone, ''),
        datetime_local: safe(leg.departure?.datetime_local),
      },
      arrival: {
        ...leg.arrival,
        airport_code: safe(leg.arrival?.airport_code),
        airport_name: safe(leg.arrival?.airport_name),
        city: safe(leg.arrival?.city),
        state: safe(leg.arrival?.state, ''),
        timezone: safe(leg.arrival?.timezone, ''),
        datetime_local: safe(leg.arrival?.datetime_local),
      },
    })),
  };
}

function calcBlockTimeMinutes(dep?: string, arr?: string): number | undefined {
  if (!dep || !arr) return undefined;
  const d = new Date(dep);
  const a = new Date(arr);
  if (Number.isNaN(d.getTime()) || Number.isNaN(a.getTime())) return undefined;
  let diff = a.getTime() - d.getTime();
  if (diff < 0) diff += 24 * 60 * 60 * 1000;
  return Math.round(diff / 60000);
}

export async function extractTripData(fileData: string, mimeType: string): Promise<Trip> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
  const prompt = `
    You are an expert private aviation charter broker assistant. 
    Extract all trip details from the provided trip sheet document.
    
    Rules:
    1. Extract the itinerary/trip/charter reference number exactly as printed on the document (it may be labelled "Itinerary #", "Trip #", "Charter #", "Ref #", "Booking #", or similar). Output it as trip_id. Preserve the original value character-for-character — do NOT invent or alter it.
    2. Identify all flight legs.
    3. Extract airport codes (IATA/ICAO), cities, and times.
    4. Extract aircraft model and tail number.
    5. Extract passenger names if present.
    6. Extract pricing details (subtotal, taxes, fees, total).
    7. Extract terms and conditions.
    8. If block time is missing but ETD/ETA are present, calculate it.
    9. Normalize all data into the requested JSON structure.
    10. Avoid empty strings in required fields. If you cannot read a value, infer it from context. If still unknown, use "TBD".
    
    Return a valid JSON object matching the schema.
  `;

  const response = await withTimeout(
    ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: fileData.split(",")[1],
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: TRIP_SCHEMA as any,
        thinkingConfig: { thinkingBudget: 0 },
      }
    }),
    90_000,
    "Trip extraction"
  );

  let rawData = JSON.parse(response.text || "{}");

  if (hasCriticalGaps(rawData)) {
    const repairPrompt = `
      The extraction missed critical fields. Re-read the document and fill the missing values.
      Use the existing JSON as a starting point. Do not leave required fields blank.
      If truly unreadable, infer from context or use "TBD".
    `;
    const repairResponse = await withTimeout(
      ai.models.generateContent({
        model: MODEL,
        contents: [
          {
            parts: [
              { text: repairPrompt },
              { text: `Existing JSON: ${JSON.stringify(rawData)}` },
              {
                inlineData: {
                  data: fileData.split(",")[1],
                  mimeType: mimeType
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: TRIP_SCHEMA as any,
          thinkingConfig: { thinkingBudget: 0 },
        }
      }),
      90_000,
      "Trip repair"
    );
    rawData = JSON.parse(repairResponse.text || "{}");
  }
  
  // Add default visibility and IDs
  const withDefaults = {
    ...rawData,
    trip_id: rawData.trip_id || Math.random().toString(36).substr(2, 9).toUpperCase(),
    client: rawData.client || {},
    aircraft: rawData.aircraft || {},
    legs: (rawData.legs || []).map((leg: any, index: number) => ({
      ...leg,
      leg_id: `leg-${index}`,
      label: leg.label || (index === 0 ? "Outbound" : index === rawData.legs.length - 1 ? "Return" : `Leg ${index + 1}`),
      departure: leg.departure || { airport_code: '', airport_name: '', city: '', state: '', timezone: '', datetime_local: '' },
      arrival: leg.arrival || { airport_code: '', airport_name: '', city: '', state: '', timezone: '', datetime_local: '' },
      metrics: leg.metrics || {}
    })),
    crew: rawData.crew || [],
    visibility: {
      show_tail_number: true,
      show_fbo_name: true,
      show_fbo_contact: true,
      show_passenger_names: true,
      show_weather: true,
      show_crew_contact: true
    }
  } as Trip;

  const normalized = fillDefaults(withDefaults);
  normalized.legs = normalized.legs.map((leg) => ({
    ...leg,
    metrics: {
      ...leg.metrics,
      block_time_minutes: leg.metrics?.block_time_minutes ?? calcBlockTimeMinutes(leg.departure?.datetime_local, leg.arrival?.datetime_local),
    },
  }));

  return normalized;
}

export async function getAISuggestions(trip: Trip): Promise<AISuggestion[]> {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  
  const prompt = `
    Review this extracted trip data for a private aviation charter.
    Identify potential errors or improvements:
    1. Timezone mismatches (e.g., arrival before departure in UTC).
    2. Missing block times (suggest auto-calculation if ETD/ETA are present).
    3. Round trip detection (if leg 2 returns to leg 1 origin).
    4. Weather risks (if you can infer from locations/dates).
    5. Privacy suggestions (hiding tail or pax names).
    
    Trip Data: ${JSON.stringify(trip)}
    
    Return a list of structured suggestions. For each suggestion, provide a message, explanation, and if possible, a 'suggested_fix' with a 'field' path (e.g., 'legs.0.metrics.block_time_minutes') and the 'value' to set.
  `;

  const response = await withTimeout(
    ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: SUGGESTION_SCHEMA as any,
        thinkingConfig: { thinkingBudget: 0 },
      }
    }),
    60_000,
    "AI suggestions"
  );

  return JSON.parse(response.text || "[]");
}
