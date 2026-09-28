/**
 * Módulo de Asistencias - Exportaciones principales
 * Arquitectura extensible para: manual, QR, huella dactilar, NFC
 */

// Providers
export { AttendanceProvider, AttendanceCaptureResult, AttendanceProviderConfig } from './providers/AttendanceProvider';
export { ManualProvider, createManualProvider } from './providers/ManualProvider';
export { QRProvider, createQRProvider, type QRProviderConfig } from './providers/QRProvider';
export { FingerprintProvider, createFingerprintProvider, type FingerprintProviderConfig } from './providers/FingerprintProvider';
export { NFCProvider, createNFCProvider, type NFCProviderConfig } from './providers/NFCProvider';

// Service
export { 
  AttendanceService, 
  getAttendanceService, 
  resetAttendanceService,
  type ProviderType,
  type AttendanceServiceConfig,
  type CheckinResult 
} from './AttendanceService';

// Types
export type {
  AttendanceSource,
  AttendanceType,
  AttendanceRecord,
  UserAttendanceStatus,
  CanRegisterResult,
  CheckinPayload,
  CheckinResponse,
  AttendanceFilters,
  AttendanceListResponse,
  AttendanceStats,
  AttendanceEvent
} from './types';

// Hooks (re-export desde hooks)
export { 
  useAttendance, 
  useUserAttendance, 
  useAttendanceStatus, 
  useCreateAttendance, 
  useCheckin,
  attendanceKeys 
} from '../../hooks/useAttendance';

// API (re-export desde api)
export { attendance } from '../api';

// Validations (re-export desde validations)
export { attendanceSchema, checkinSchema, type AttendanceFormData, type CheckinFormData } from '../validations';