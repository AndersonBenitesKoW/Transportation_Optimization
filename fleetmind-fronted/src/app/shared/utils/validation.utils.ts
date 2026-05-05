export class ValidationUtils {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidLicensePlate(plate: string): boolean {
    // Spanish format: 4 numbers + 3 letters or similar
    const plateRegex = /^[0-9]{4}[A-Z]{3}$/;
    return plateRegex.test(plate.toUpperCase());
  }

  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  }
}