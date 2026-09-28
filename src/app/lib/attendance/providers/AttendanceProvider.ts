/**
 * Interfaz base para proveedores de asistencia
 * Permite extensibilidad futura: QR, huella dactilar, NFC, manual
 */

export interface AttendanceProvider {
  readonly source: 'manual' | 'qr' | 'fingerprint' | 'nfc';
  readonly name: string;
  readonly description: string;
  
  /**
   * Verifica si el proveedor está disponible en el dispositivo actual
   */
  isAvailable(): Promise<boolean>;
  
  /**
   * Inicia el proceso de captura/lectura
   * Retorna datos necesarios para registrar la asistencia
   */
  capture(): Promise<AttendanceCaptureResult>;
  
  /**
   * Limpia recursos si es necesario
   */
  dispose?(): void;
}

export interface AttendanceCaptureResult {
  userId: string;
  type: 'Entrada' | 'Salida';
  deviceId?: string;
  metadata?: Record<string, any>;
  timestamp?: Date;
}

export interface AttendanceProviderConfig {
  source: 'manual' | 'qr' | 'fingerprint' | 'nfc';
  deviceId?: string;
  options?: Record<string, any>;
}