/**
 * Proveedor de asistencia por huella dactilar
 * Estructura preparada para implementación futura
 * Requiere: lector de huellas compatible WebAuthn / Web USB / SDK específico
 */

import { AttendanceProvider, AttendanceCaptureResult, AttendanceProviderConfig } from './AttendanceProvider';

export interface FingerprintProviderConfig extends AttendanceProviderConfig {
  source: 'fingerprint';
  deviceId?: string; // USB device ID o WebAuthn credential ID
  templateFormat?: 'iso19794-2' | 'ansi378' | 'proprietary';
  qualityThreshold?: number; // 0-100
}

export class FingerprintProvider implements AttendanceProvider {
  readonly source = 'fingerprint' as const;
  readonly name = 'Huella Dactilar';
  readonly description = 'Registro de asistencia mediante lector de huella dactilar';
  
  private config: FingerprintProviderConfig;
  private device: any = null;

  constructor(config: FingerprintProviderConfig) {
    this.config = {
      qualityThreshold: 70,
      ...config,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Verificar WebAuthn (para lectores compatibles FIDO2)
      if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) return true;
      }
      
      // Verificar Web USB (para lectores USB específicos)
      if (navigator.usb) {
        const devices = await navigator.usb.getDevices();
        if (devices.length > 0) return true;
      }
      
      return false;
    } catch {
      return false;
    }
  }

  async capture(): Promise<AttendanceCaptureResult> {
    if (!await this.isAvailable()) {
      throw new Error('Lector de huella no disponible');
    }

    // Implementación futura:
    // Opción A: WebAuthn (platform authenticator - Touch ID, Windows Hello, etc.)
    // const credential = await navigator.credentials.get({
    //   publicKey: { challenge: new Uint8Array(32), ... }
    // });
    // Mapear credentialId -> userId via base de datos
    
    // Opción B: Web USB + SDK del fabricante
    // this.device = await navigator.usb.requestDevice({ filters: [...] });
    // await this.device.open();
    // const template = await this.captureFingerprint();
    // const userId = await this.matchTemplate(template);

    throw new Error('FingerprintProvider no implementado aún. Use ManualProvider.');
  }

  private async captureFingerprint(): Promise<Uint8Array> {
    // Implementación específica del SDK del lector
    throw new Error('No implementado');
  }

  private async matchTemplate(template: Uint8Array): Promise<string> {
    // Enviar template a servidor para matching 1:N
    // Retornar userId si coincide
    throw new Error('No implementado');
  }

  dispose(): void {
    if (this.device) {
      try {
        this.device.close?.();
      } catch (e) {
        console.warn('Error closing fingerprint device:', e);
      }
      this.device = null;
    }
  }
}

export function createFingerprintProvider(config: Partial<FingerprintProviderConfig> = {}): FingerprintProvider {
  return new FingerprintProvider({ source: 'fingerprint', ...config } as FingerprintProviderConfig);
}