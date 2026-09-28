/**
 * Proveedor de asistencia por código QR
 * Estructura preparada para implementación futura
 * Requiere: cámara, librería de escaneo QR (ej: html5-qrcode, zxing)
 */

import { AttendanceProvider, AttendanceCaptureResult, AttendanceProviderConfig } from './AttendanceProvider';

export interface QRProviderConfig extends AttendanceProviderConfig {
  source: 'qr';
  cameraDeviceId?: string;
  scanTimeout?: number; // ms
  continuousScan?: boolean;
}

export class QRProvider implements AttendanceProvider {
  readonly source = 'qr' as const;
  readonly name = 'Código QR';
  readonly description = 'Registro de asistencia escaneando código QR personal';
  
  private config: QRProviderConfig;
  private scanner: any = null; // html5-qrcode Html5Qrcode instance
  private isScanning = false;

  constructor(config: QRProviderConfig) {
    this.config = {
      scanTimeout: 30000,
      continuousScan: false,
      ...config,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Verificar soporte de cámara y getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return false;
      }
      
      // Verificar si hay librería de QR disponible
      // const { Html5Qrcode } = await import('html5-qrcode');
      // return true;
      
      return false; // Por ahora no implementado
    } catch {
      return false;
    }
  }

  async capture(): Promise<AttendanceCaptureResult> {
    if (!await this.isAvailable()) {
      throw new Error('Escáner QR no disponible en este dispositivo');
    }

    // Implementación futura:
    // 1. Inicializar Html5Qrcode con cameraDeviceId
    // 2. Iniciar escaneo
    // 3. Esperar detección de QR con formato GYM-{userId}
    // 4. Validar usuario existe y está activo
    // 5. Determinar tipo (Entrada/Salida) basado en estado actual
    // 6. Retornar resultado

    return new Promise((resolve, reject) => {
      // Placeholder para implementación futura
      const timeout = setTimeout(() => {
        this.stopScan();
        reject(new Error('Timeout: No se detectó código QR válido'));
      }, this.config.scanTimeout);

      // Simulación de lo que hará:
      // this.scanner = new Html5Qrcode('qr-reader');
      // await this.scanner.start(
      //   this.config.cameraDeviceId,
      //   { fps: 10, qrbox: 250 },
      //   (decodedText) => {
      //     clearTimeout(timeout);
      //     if (decodedText.startsWith('GYM-')) {
      //       const userId = decodedText.replace('GYM-', '');
      //       this.stopScan();
      //       resolve({
      //         userId,
      //         type: 'Entrada', // Se determinará server-side
      //         deviceId: this.config.cameraDeviceId,
      //         metadata: { qrData: decodedText },
      //         timestamp: new Date()
      //       });
      //     }
      //   }
      // );
      
      // Por ahora rechaza inmediatamente
      clearTimeout(timeout);
      reject(new Error('QRProvider no implementado aún. Use ManualProvider.'));
    });
  }

  private async stopScan(): Promise<void> {
    if (this.scanner && this.isScanning) {
      try {
        await this.scanner.stop();
      } catch (e) {
        console.warn('Error stopping QR scanner:', e);
      }
      this.isScanning = false;
    }
  }

  dispose(): void {
    this.stopScan();
    this.scanner = null;
  }
}

// Factory
export function createQRProvider(config: Partial<QRProviderConfig> = {}): QRProvider {
  return new QRProvider({ source: 'qr', ...config } as QRProviderConfig);
}