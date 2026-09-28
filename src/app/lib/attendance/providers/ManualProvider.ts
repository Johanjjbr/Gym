/**
 * Proveedor de asistencia manual (staff registra desde UI)
 * Implementación actual - base para el sistema
 */

import { AttendanceProvider, AttendanceCaptureResult, AttendanceProviderConfig } from './AttendanceProvider';

export class ManualProvider implements AttendanceProvider {
  readonly source = 'manual' as const;
  readonly name = 'Registro Manual';
  readonly description = 'Registro de asistencia realizado manualmente por personal de recepción';
  
  private config: AttendanceProviderConfig;

  constructor(config: AttendanceProviderConfig = { source: 'manual' }) {
    this.config = config;
  }

  async isAvailable(): Promise<boolean> {
    // Siempre disponible - no requiere hardware especial
    return true;
  }

  /**
   * En modo manual, la captura se hace via UI (modal)
   * Este método es un placeholder - la UI llama directamente a la API
   */
  async capture(): Promise<AttendanceCaptureResult> {
    throw new Error('ManualProvider.capture() no debe llamarse directamente. Use la UI modal.');
  }

  /**
   * Valida datos de entrada manual
   */
  validateInput(data: Partial<AttendanceCaptureResult>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!data.userId) errors.push('userId es requerido');
    if (!data.type) errors.push('type es requerido');
    if (data.type && !['Entrada', 'Salida'].includes(data.type)) {
      errors.push('type debe ser "Entrada" o "Salida"');
    }
    
    return { valid: errors.length === 0, errors };
  }

  dispose(): void {
    // Sin recursos que limpiar
  }
}

// Factory para crear proveedor manual
export function createManualProvider(config?: Partial<AttendanceProviderConfig>): ManualProvider {
  return new ManualProvider({ source: 'manual', ...config });
}