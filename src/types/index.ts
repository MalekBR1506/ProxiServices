export type Role = 'CLIENT' | 'PROVIDER';

export type PriceType = 'HOURLY' | 'FIXED' | 'ESTIMATE';

export type BookingStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type BookingAction = 'ACCEPT' | 'REJECT' | 'START' | 'COMPLETE' | 'CANCEL' | 'REVIEW';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  lat?: number | null;
  lng?: number | null;
  addressLabel?: string | null;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string;
  badgeCount?: number;
}

export interface ServiceItem {
  id: string;
  title: string;
  description: string;
  price: number;
  priceType: PriceType;
  durationMinutes: number;
  categorySlug: string;
}

export interface Review {
  id: string;
  clientName: string;
  clientAvatar: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string;
}

export interface WorkingHours {
  weekday: number; // 0 = Sunday
  startTime: string; // "HH:MM", Africa/Tunis
  endTime: string;
}

export interface ProviderProfile {
  id: string;
  userId: string;
  name: string;
  avatar: string;
  addressText: string;
  latitude: number;
  longitude: number;
  operationalRadiusKm: number;
  isVerified: boolean;
  ratingAverage: number;
  reviewCount: number;
  jobsDone: number;
  bio: string;
  experienceYears: number;
  categories: Category[];
  services: ServiceItem[];
  portfolio: PortfolioItem[];
  reviews: Review[];
  availability: WorkingHours[];
  distanceKm?: number;
  matchScore?: number;
  matchBreakdown?: { distance: number; rating: number; availability: number; price: number; experience: number };
  matchReasons?: string[];
}

export interface BookingParty {
  id: string;
  name: string;
  avatar: string;
  phone: string | null; // shared only after the provider accepts
}

export interface Booking {
  id: string;
  status: BookingStatus;
  service: { id: string; title: string; durationMinutes: number };
  price: number;
  priceType: PriceType;
  startAt: string;
  endAt: string;
  address: string;
  lat: number;
  lng: number;
  notes: string;
  problemSummary: string;
  client: BookingParty;
  provider: BookingParty; // provider.id is the provider profile id
  timeline: {
    createdAt: string;
    acceptedAt: string | null;
    rejectedAt: string | null;
    startedAt: string | null;
    completedAt: string | null;
    cancelledAt: string | null;
  };
  review: { id: string; rating: number; comment: string; createdAt: string } | null;
  actions: BookingAction[];
}

export interface DaySlots {
  date: string; // Tunis date "YYYY-MM-DD"
  weekday: number;
  slots: string[]; // UTC ISO start times
}

export interface GeoSearchFilters {
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  category?: string;
  minRating?: number;
  maxPrice?: number;
  sortBy?: 'match' | 'distance' | 'rating' | 'price_asc' | 'reviews';
  query?: string;
}
