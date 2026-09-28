/**
 * Tipos compartidos para el módulo de asistencias
 */

export type AttendanceSource = 'manual' | 'qr' | 'fingerprint' | 'nfc';
export type AttendanceType = 'Entrada' | 'Salida';

export interface AttendanceRecord {
  id: string;
  user_id: string;
  date: string;
  time: string;
  type: AttendanceType;
  source: AttendanceSource;
  device_id: string | null;
  session_number: number;
  created_at: string;
  users?: {
    name: string;
    member_number?: string;
    email?: string;
  };
}

export interface UserAttendanceStatus {
  inside: boolean;
  last_entry_time: string | null;
  session_count_today: number;
  can_enter: boolean;
  can_exit: boolean;
  last_record_type: AttendanceType | null;
}

export interface CanRegisterResult {
  allowed: boolean;
  reason?: string;
  session_number?: number;
  last_entry?: string;
}

export interface CheckinPayload {
  user_id: string;
  type: AttendanceType;
  date?: string;
  time?: string;
  source?: AttendanceSource;
  device_id?: string;
  metadata?: Record<string, any>;
}

export interface CheckinResponse {
  success: boolean;
  data?: AttendanceRecord;
  error?: string;
  details?: CanRegisterResult;
}

export interface AttendanceFilters {
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  userId?: string;
  type?: AttendanceType;
  source?: AttendanceSource;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AttendanceListResponse {
  data: AttendanceRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AttendanceStats {
  today: {
    uniqueUsers: number;
    totalRecords: number;
    entries: number;
    exits: number;
    usersInside: number;
  };
  month: {
    totalDays: number;
    completeSessions: number;
    totalEntries: number;
    totalExits: number;
  };
  allTime: {
    totalRecords: number;
    totalUsers: number;
  };
}

// Eventos para real-time (futuro)
export interface AttendanceEvent {
  type: 'checkin' | 'checkout' | 'status_change';
  payload: AttendanceRecord;
  timestamp: string;
}