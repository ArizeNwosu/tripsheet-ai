import { Type } from "@google/genai";

export enum FlightCategory {
  VFR = "VFR",
  MVFR = "MVFR",
  IFR = "IFR",
  LIFR = "LIFR",
  UNKNOWN = "UNKNOWN"
}

export interface FBO {
  name: string;
  address?: string;
  phone?: string;
}

export interface Airport {
  airport_code: string;
  airport_name: string;
  city: string;
  state: string;
  country: string;
  timezone: string;
  datetime_local: string;
  fbo?: FBO;
}

export interface WeatherSnapshot {
  summary: string;
  temperature_f: number;
  wind: string;
  visibility: string;
  flight_category: FlightCategory;
  risk_flags: string[];
}

export interface CrewMember {
  role: string;
  name: string;
  phone?: string;
}

export interface Leg {
  leg_id: string;
  label: string;
  date_local: string;
  departure: Airport;
  arrival: Airport;
  metrics: {
    distance_nm?: number;
    block_time_minutes?: number;
  };
  weather?: {
    departure?: WeatherSnapshot;
    arrival?: WeatherSnapshot;
  };
  notes?: string;
}

export interface Passenger {
  full_name: string;
  notes?: string;
}

export interface Trip {
  trip_id: string;
  client: {
    name: string;
    company?: string;
    email?: string;
  };
  aircraft: {
    model: string;
    tail_number: string;
    category?: string;
  };
  passengers: Passenger[];
  crew: CrewMember[];
  legs: Leg[];
  visibility: {
    show_tail_number: boolean;
    show_fbo_name: boolean;
    show_fbo_contact: boolean;
    show_passenger_names: boolean;
    show_weather: boolean;
    show_crew_contact: boolean;
  };
}

export const TRIP_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    trip_id: { type: Type.STRING },
    client: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        company: { type: Type.STRING },
        email: { type: Type.STRING }
      },
      required: ["name"]
    },
    aircraft: {
      type: Type.OBJECT,
      properties: {
        model: { type: Type.STRING },
        tail_number: { type: Type.STRING },
        category: { type: Type.STRING }
      },
      required: ["model", "tail_number"]
    },
    passengers: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          full_name: { type: Type.STRING },
          notes: { type: Type.STRING }
        }
      }
    },
    crew: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          role: { type: Type.STRING, description: "e.g., PIC, SIC, Flight Attendant" },
          name: { type: Type.STRING },
          phone: { type: Type.STRING }
        }
      }
    },
    legs: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          date_local: { type: Type.STRING },
          departure: {
            type: Type.OBJECT,
            properties: {
              airport_code: { type: Type.STRING },
              airport_name: { type: Type.STRING },
              city: { type: Type.STRING },
              state: { type: Type.STRING },
              timezone: { type: Type.STRING },
              datetime_local: { type: Type.STRING },
              fbo: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  address: { type: Type.STRING },
                  phone: { type: Type.STRING }
                }
              }
            }
          },
          arrival: {
            type: Type.OBJECT,
            properties: {
              airport_code: { type: Type.STRING },
              airport_name: { type: Type.STRING },
              city: { type: Type.STRING },
              state: { type: Type.STRING },
              timezone: { type: Type.STRING },
              datetime_local: { type: Type.STRING },
              fbo: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  address: { type: Type.STRING },
                  phone: { type: Type.STRING }
                }
              }
            }
          },
          metrics: {
            type: Type.OBJECT,
            properties: {
              distance_nm: { type: Type.NUMBER },
              block_time_minutes: { type: Type.NUMBER }
            }
          }
        }
      }
    }
  }
};

export interface BrokerProfile {
  company_name: string;
  tagline?: string;
  logo_dataurl?: string;   // base64 data URL from file upload
  exterior_image_dataurl?: string;
  interior_image_dataurl?: string;
  image_usage?: {
    classic: boolean;
    executive: boolean;
    premium: boolean;
  };
  map_style?: {
    classic: 'leaflet' | 'svg';
    executive: 'leaflet' | 'svg';
    premium: 'leaflet' | 'svg';
  };
  primary_color: string;   // hex e.g. "#008080"
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export type TemplateId = 'classic' | 'executive' | 'premium';

export interface StoredTrip {
  id: string;          // Firestore doc ID
  tripId: string;      // Trip reference number
  clientName: string;
  route: string;       // e.g. "KLAX → KTEB"
  trip: Trip;
  template: TemplateId;
  createdAt: Date;
}

export const DEFAULT_BROKER: BrokerProfile = {
  company_name: '24|7 Jet',
  tagline: 'Private Charter',
  primary_color: '#008080',
  address: '7426 Hayvenhurst Ave., Van Nuys, CA 91406',
  phone: '818-247-5387',
  email: 'charter@247jet.com',
  image_usage: {
    classic: true,
    executive: false,
    premium: false,
  },
  map_style: {
    classic: 'leaflet',
    executive: 'leaflet',
    premium: 'leaflet',
  },
};

export interface AISuggestion {
  id: string;
  type: 'timezone' | 'timing' | 'block_time' | 'privacy' | 'other';
  message: string;
  explanation: string;
  affected_leg_id?: string;
  suggested_fix?: {
    field: string;
    value: any;
  };
}

export const SUGGESTION_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING },
      type: { type: Type.STRING, description: "One of: timezone, timing, block_time, privacy, other" },
      message: { type: Type.STRING },
      explanation: { type: Type.STRING },
      affected_leg_id: { type: Type.STRING },
      suggested_fix: {
        type: Type.OBJECT,
        properties: {
          field: { type: Type.STRING, description: "The path to the field to fix, e.g., 'legs.0.metrics.block_time_minutes'" },
          value: { type: Type.STRING, description: "The suggested value (as a string, to be parsed if needed)" }
        }
      }
    },
    required: ["id", "type", "message", "explanation"]
  }
};
