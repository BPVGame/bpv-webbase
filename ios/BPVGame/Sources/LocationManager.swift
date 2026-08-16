import Foundation
import CoreLocation
import Combine

/// Core Location bridge for Outdoor Mode — mirrors `src/game/LocationService.ts`
@MainActor
public final class LocationManager: NSObject, ObservableObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()

    @Published public var isOutdoorMode = false
    @Published public var district: String = "City Center"
    @Published public var totalMetersWalked: Double = 0
    @Published public var coordinate: CLLocationCoordinate2D?

    private var lastLocation: CLLocation?

    public override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyBest
        manager.distanceFilter = 3
    }

    public func requestAccess() {
        manager.requestWhenInUseAuthorization()
    }

    public func start() {
        manager.startUpdatingLocation()
    }

    public func stop() {
        manager.stopUpdatingLocation()
    }

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        switch manager.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse:
            isOutdoorMode = true
            start()
        default:
            isOutdoorMode = false
        }
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let loc = locations.last else { return }
        if let last = lastLocation {
            let delta = loc.distance(from: last)
            if delta > 2 && delta < 500 {
                totalMetersWalked += delta
            }
        }
        lastLocation = loc
        coordinate = loc.coordinate
        isOutdoorMode = true
        district = resolveDistrict(lat: loc.coordinate.latitude, lng: loc.coordinate.longitude)
    }

    private func resolveDistrict(lat: Double, lng: Double) -> String {
        let districts = [
            "City Center",
            "Residential District",
            "Central Park",
            "Pixel Harbor",
            "Shopping Outpost"
        ]
        let hash = abs(Int(lat * 1000 + lng * 1000)) % districts.count
        return districts[hash]
    }
}
