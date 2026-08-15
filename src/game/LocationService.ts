export interface GeoCoords {
  latitude: number;
  longitude: number;
  accuracy: number;
}

export type DistrictName = 'City Center' | 'Residential District' | 'Central Park' | 'Pixel Harbor' | 'Shopping Outpost';

export class LocationService {
  private watchId: number | null = null;
  public currentCoords: GeoCoords | null = null;
  public totalMetersWalked: number = 0;
  public isOutdoorMode: boolean = false;
  public currentDistrict: DistrictName = 'City Center';

  private onLocationChange?: (coords: GeoCoords, district: DistrictName, totalMeters: number) => void;

  constructor() {
    this.checkLocationPermissions();
  }

  public checkLocationPermissions() {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          this.isOutdoorMode = true;
          this.updatePosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        },
        err => {
          console.warn('Geolocation disabled or unavailable. Defaulting to Indoor Mode.', err);
          this.isOutdoorMode = false;
        }
      );
    }
  }

  public startTracking(callback: (coords: GeoCoords, district: DistrictName, totalMeters: number) => void) {
    this.onLocationChange = callback;

    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        pos => {
          this.isOutdoorMode = true;
          this.updatePosition(pos.coords.latitude, pos.coords.longitude, pos.coords.accuracy);
        },
        err => {
          this.isOutdoorMode = false;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
    }
  }

  public stopTracking() {
    if (this.watchId !== null && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  private updatePosition(lat: number, lng: number, accuracy: number) {
    if (this.currentCoords) {
      const deltaMeters = this.calculateDistance(
        this.currentCoords.latitude,
        this.currentCoords.longitude,
        lat,
        lng
      );
      if (deltaMeters > 2 && deltaMeters < 500) { // filter GPS drift & teleporting
        this.totalMetersWalked += deltaMeters;
      }
    }

    this.currentCoords = { latitude: lat, longitude: lng, accuracy };
    this.currentDistrict = this.resolveDistrict(lat, lng);

    if (this.onLocationChange) {
      this.onLocationChange(this.currentCoords, this.currentDistrict, this.totalMetersWalked);
    }
  }

  // Haversine distance formula in meters
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  private resolveDistrict(lat: number, lng: number): DistrictName {
    const hash = Math.abs(Math.floor(lat * 1000 + lng * 1000)) % 5;
    const districts: DistrictName[] = [
      'City Center',
      'Residential District',
      'Central Park',
      'Pixel Harbor',
      'Shopping Outpost'
    ];
    return districts[hash];
  }
}
