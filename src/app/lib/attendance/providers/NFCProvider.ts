/**
 * Proveedor de asistencia por NFC/RFID
 * Estructura preparada para implementación futura
 * Requiere: Web NFC API (Chrome Android) o lector USB/Serial
 */

import { AttendanceProvider, AttendanceCaptureResult, AttendanceProviderConfig } from './AttendanceProvider';

export interface NFCProviderConfig extends AttendanceProviderConfig {
  source: 'nfc';
  deviceId?: string; // Para lectores USB/Serial
  ndefOnly?: boolean; // Solo leer tags NDEF
  pollInterval?: number; // ms entre lecturas
}

export class NFCProvider implements AttendanceProvider {
  readonly source = 'nfc' as const;
  readonly name = 'NFC / RFID';
  readonly description = 'Registro de asistencia con tarjeta NFC o pulsera RFID';
  
  private config: NFCProviderConfig;
  private reader: any = null;
  private polling = false;

  constructor(config: NFCProviderConfig) {
    this.config = {
      ndefOnly: true,
      pollInterval: 1000,
      ...config,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Web NFC API (Chrome en Android)
      if ('NDEFReader' in window) {
        return true;
      }
      
      // Web Serial API (lectores USB/Serial en desktop)
      if ('serial' in navigator) {
        const ports = await (navigator as any).serial.getPorts();
        if (ports.length > 0) return true;
      }
      
      // Web USB (lectores USB específicos)
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
      throw new Error('Lector NFC no disponible');
    }

    // Implementación futura - Opción A: Web NFC (Android Chrome)
    if ('NDEFReader' in window) {
      return this.captureViaWebNFC();
    }
    
    // Opción B: Web Serial (lector USB en desktop)
    if ('serial' in navigator) {
      return this.captureViaWebSerial();
    }

    throw new Error('NFCProvider no implementado para esta plataforma');
  }

  private async captureViaWebNFC(): Promise<AttendanceCaptureResult> {
    // const reader = new NDEFReader();
    // await reader.scan();
    // 
    // return new Promise((resolve, reject) => {
    //   reader.onreading = ({ message, serialNumber }) => {
    //     // Parsear NDEF message para obtener userId
    //     const userId = this.parseNDEFMessage(message);
    //     if (userId) {
    //       resolve({
    //         userId,
    //         type: 'Entrada', // Server-side determina
    //         deviceId: serialNumber,
    //         metadata: { nfcSerial: serialNumber, ndeMessage: message },
    //         timestamp: new Date()
    //       });
    //     }
    //   };
    //   
    //   reader.onreadingerror = () => reject(new Error('Error leyendo tag NFC'));
    //   
    //   // Timeout
    //   setTimeout(() => reject(new Error('Timeout NFC')), this.config.pollInterval * 30);
    // });

    throw new Error('Web NFC no implementado aún');
  }

  private async captureViaWebSerial(): Promise<AttendanceCaptureResult> {
    // const port = await (navigator as any).serial.requestPort({ filters: [...] });
    // await port.open({ baudRate: 9600 });
    // const reader = port.readable.getReader();
    // 
    // while (true) {
    //   const { value, done } = await reader.read();
    //   if (done) break;
    //   const cardId = this.parseSerialData(value);
    //   if (cardId) {
    //     reader.releaseLock();
    //     await port.close();
    //     return { userId: cardId, type: 'Entrada', deviceId: 'serial', timestamp: new Date() };
    //   }
    // }

    throw new Error('Web Serial NFC no implementado aún');
  }

  private parseNDEFMessage(message: any): string | null {
    // Parsear records NDEF para encontrar userId
    // Formato esperado: GYM-{userId} o similar
    return null;
  }

  private parseSerialData(data: Uint8Array): string | null {
    // Parsear datos del lector serial
    return null;
  }

  dispose(): void {
    this.polling = false;
    if (this.reader) {
      try {
        this.reader.releaseLock?.();
      } catch (e) {
        console.warn('Error releasing NFC reader:', e);
      }
      this.reader = null;
    }
  }
}

export function createNFCProvider(config: Partial<NFCProviderConfig> = {}): NFCProvider {
  return new NFCProvider({ source: 'nfc', ...config } as NFCProviderConfig);
}