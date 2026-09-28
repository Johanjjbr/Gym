/**
 * Servicio orquestador de proveedores de asistencia
 * Maneja selección de proveedor, validación y registro
 */

import { 
  AttendanceProvider, 
  AttendanceCaptureResult, 
  AttendanceProviderConfig 
} from './providers/AttendanceProvider';
import { ManualProvider, createManualProvider } from './providers/ManualProvider';
import { QRProvider, createQRProvider } from './providers/QRProvider';
import { FingerprintProvider, createFingerprintProvider } from './providers/FingerprintProvider';
import { NFCProvider, createNFCProvider } from './providers/NFCProvider';
import { attendance } from '../api';

export type ProviderType = 'manual' | 'qr' | 'fingerprint' | 'nfc';

export interface AttendanceServiceConfig {
  defaultProvider: ProviderType;
  fallbackProvider?: ProviderType;
  providers?: Partial<Record<ProviderType, AttendanceProviderConfig>>;
}

export interface CheckinResult {
  success: boolean;
  data?: any;
  error?: string;
  provider: ProviderType;
}

export class AttendanceService {
  private providers: Map<ProviderType, AttendanceProvider> = new Map();
  private config: AttendanceServiceConfig;
  private activeProvider: AttendanceProvider | null = null;

  constructor(config: AttendanceServiceConfig) {
    this.config = {
      defaultProvider: 'manual',
      fallbackProvider: 'manual',
      ...config,
    };
    this.initializeProviders();
  }

  private initializeProviders(): void {
    const providerConfigs = this.config.providers || {};
    
    // Manual - siempre disponible
    this.providers.set('manual', createManualProvider(providerConfigs.manual));
    
    // QR - estructura lista
    this.providers.set('qr', createQRProvider(providerConfigs.qr as any));
    
    // Fingerprint - estructura lista
    this.providers.set('fingerprint', createFingerprintProvider(providerConfigs.fingerprint as any));
    
    // NFC - estructura lista
    this.providers.set('nfc', createNFCProvider(providerConfigs.nfc as any));
  }

  /**
   * Obtiene un proveedor por tipo
   */
  getProvider(type: ProviderType): AttendanceProvider | undefined {
    return this.providers.get(type);
  }

  /**
   * Verifica qué proveedores están disponibles
   */
  async getAvailableProviders(): Promise<ProviderType[]> {
    const available: ProviderType[] = [];
    for (const [type, provider] of this.providers) {
      try {
        if (await provider.isAvailable()) {
          available.push(type);
        }
      } catch {
        // Proveedor no disponible
      }
    }
    return available;
  }

  /**
   * Establece el proveedor activo
   */
  async setActiveProvider(type: ProviderType): Promise<boolean> {
    const provider = this.providers.get(type);
    if (!provider) return false;
    
    const available = await provider.isAvailable();
    if (!available) return false;
    
    if (this.activeProvider && this.activeProvider !== provider) {
      this.activeProvider.dispose?.();
    }
    
    this.activeProvider = provider;
    return true;
  }

  /**
   * Obtiene el proveedor activo (o default)
   */
  async getActiveProvider(): Promise<AttendanceProvider> {
    if (this.activeProvider) {
      const available = await this.activeProvider.isAvailable();
      if (available) return this.activeProvider;
    }
    
    // Fallback a default
    const defaultProvider = this.providers.get(this.config.defaultProvider);
    if (defaultProvider && await defaultProvider.isAvailable()) {
      this.activeProvider = defaultProvider;
      return defaultProvider;
    }
    
    // Último recurso: manual
    const manual = this.providers.get('manual');
    if (manual) {
      this.activeProvider = manual;
      return manual;
    }
    
    throw new Error('No hay proveedores de asistencia disponibles');
  }

  /**
   * Realiza check-in usando el proveedor activo
   * Incluye validación server-side vía RPC
   */
  async checkin(captureResult: AttendanceCaptureResult, providerType: ProviderType): Promise<CheckinResult> {
    try {
      // Validar datos básicos
      if (!captureResult.userId || !captureResult.type) {
        return { success: false, error: 'userId y type son requeridos', provider: providerType };
      }

      // Registrar vía API (usa RPC can_register_attendance server-side)
      const result = await attendance.checkin({
        user_id: captureResult.userId,
        type: captureResult.type,
        date: captureResult.timestamp?.toISOString().split('T')[0],
        time: captureResult.timestamp?.toTimeString().split(' ')[0],
        source: providerType,
        device_id: captureResult.deviceId,
        metadata: captureResult.metadata,
      });

      return { success: true, data: result, provider: providerType };
    } catch (error: any) {
      // Errores de validación del servidor (409 = conflicto entrada/salida)
      if (error.status === 409 || error.message?.includes('409')) {
        return { 
          success: false, 
          error: error.message || 'Conflicto: verifique entrada/salida previa', 
          provider: providerType 
        };
      }
      return { 
        success: false, 
        error: error.message || 'Error registrando asistencia', 
        provider: providerType 
      };
    }
  }

  /**
   * Flujo completo: capturar + registrar
   * Para uso en kiosco/autoservicio
   */
  async captureAndCheckin(providerType: ProviderType): Promise<CheckinResult> {
    const provider = this.providers.get(providerType);
    if (!provider) {
      return { success: false, error: `Proveedor ${providerType} no encontrado`, provider: providerType };
    }

    const available = await provider.isAvailable();
    if (!available) {
      return { success: false, error: `Proveedor ${providerType} no disponible`, provider: providerType };
    }

    try {
      const captureResult = await provider.capture();
      return this.checkin(captureResult, providerType);
    } catch (error: any) {
      return { 
        success: false, 
        error: error.message || 'Error en captura', 
        provider: providerType 
      };
    }
  }

  /**
   * Obtiene estado de asistencia de un usuario
   */
  async getUserStatus(userId: string, date?: string): Promise<any> {
    return attendance.getStatus(userId, date);
  }

  /**
   * Limpia recursos
   */
  dispose(): void {
    for (const provider of this.providers.values()) {
      provider.dispose?.();
    }
    this.activeProvider = null;
  }
}

// Instancia singleton para uso global
let attendanceServiceInstance: AttendanceService | null = null;

export function getAttendanceService(config?: AttendanceServiceConfig): AttendanceService {
  if (!attendanceServiceInstance) {
    attendanceServiceInstance = new AttendanceService(config || { defaultProvider: 'manual' });
  }
  return attendanceServiceInstance;
}

export function resetAttendanceService(): void {
  if (attendanceServiceInstance) {
    attendanceServiceInstance.dispose();
    attendanceServiceInstance = null;
  }
}