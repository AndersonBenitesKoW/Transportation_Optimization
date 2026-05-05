import { Injectable } from '@angular/core';
import { HttpService } from '../../core/services/http.service';
import { Observable } from 'rxjs';
import { Vehicle, VehicleForm } from '../models/vehicle.interface';

@Injectable({
  providedIn: 'root'
})
export class VehicleService {
  constructor(private httpService: HttpService) {}

  getVehicles(): Observable<Vehicle[]> {
    return this.httpService.get<Vehicle[]>('/vehicles');
  }

  getVehicle(id: string): Observable<Vehicle> {
    return this.httpService.get<Vehicle>(`/vehicles/${id}`);
  }

  createVehicle(vehicle: VehicleForm): Observable<Vehicle> {
    return this.httpService.post<Vehicle>('/vehicles', vehicle);
  }

  updateVehicle(id: string, vehicle: Partial<VehicleForm>): Observable<Vehicle> {
    return this.httpService.put<Vehicle>(`/vehicles/${id}`, vehicle);
  }

  deleteVehicle(id: string): Observable<void> {
    return this.httpService.delete<void>(`/vehicles/${id}`);
  }
}