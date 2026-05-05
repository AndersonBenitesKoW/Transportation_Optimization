export interface Vehicle {
  id: string;
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  status: 'active' | 'maintenance' | 'inactive';
  mileage: number;
  lastMaintenance: Date;
  fuelType: string;
}

export interface VehicleForm {
  licensePlate: string;
  make: string;
  model: string;
  year: number;
  fuelType: string;
}