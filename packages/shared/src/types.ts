/** Tipos compartilhados — alinhar com schemas da API conforme evoluir. */

export type UserRole = 'customer' | 'owner' | 'admin' | 'staff';

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role?: UserRole;
  avatar_url?: string | null;
}

export interface Establishment {
  id: string;
  name: string;
  slug: string;
  category?: string;
  logo_url?: string | null;
  cover_url?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
}

export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Appointment {
  id: string;
  establishment_id: string;
  customer_id: string;
  staff_id?: string | null;
  service_name?: string;
  scheduled_at: string;
  status: AppointmentStatus;
  total_amount?: number | null;
}
