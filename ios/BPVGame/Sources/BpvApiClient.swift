import Foundation

/// BPV Game API client — mirrors `src/api/BpvApiClient.ts`
/// Base URL: https://bpvgame.com
public final class BpvApiClient {
    public static let shared = BpvApiClient()

    public var baseURL: URL
    public var token: String?

    public init(baseURL: URL = URL(string: "https://bpvgame.com")!) {
        self.baseURL = baseURL
        self.token = UserDefaults.standard.string(forKey: "bpv_token")
    }

    public func setToken(_ token: String?) {
        self.token = token
        if let token {
            UserDefaults.standard.set(token, forKey: "bpv_token")
        } else {
            UserDefaults.standard.removeObject(forKey: "bpv_token")
        }
    }

    private func request<T: Decodable>(
        _ path: String,
        method: String = "GET",
        body: Data? = nil
    ) async throws -> T {
        var req = URLRequest(url: baseURL.appendingPathComponent(path))
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token {
            req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        req.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    public func getPlayer() async throws -> BpvUser {
        try await request("api/player")
    }

    public func getCards() async throws -> [BpvFishCard] {
        try await request("api/player/cards")
    }

    public func getTournaments() async throws -> [BpvTournament] {
        try await request("api/tournaments")
    }

    public func heartbeat(_ payload: PresencePayload) async throws -> PresenceResponse {
        let body = try JSONEncoder().encode(payload)
        return try await request("api/multiplayer/heartbeat", method: "POST", body: body)
    }
}

public struct BpvUser: Codable {
    public let id: Int
    public let username: String
    public let level: Int
    public let xp: Int
    public let coins: Int
    public let avatar_skin: String
    public let avatar_hair: String
    public let avatar_shirt: String
    public let avatar_pants: String
}

public struct BpvFishCard: Codable, Identifiable {
    public let id: Int
    public let card_slug: String
    public let name: String
    public let rarity: String
    public let level: Int
    public let attack: Int
    public let defense: Int
    public let speed: Int
    public let description: String
    public let emoji: String?
}

public struct BpvTournament: Codable, Identifiable {
    public let id: Int
    public let name: String
    public let description: String
    public let max_players: Int
    public let current_players: Int
    public let status: String
    public let prize_description: String
    public let start_time: String
}

public struct PresencePayload: Codable {
    public let username: String
    public let district: String
    public let col: Int
    public let row: Int
    public let lat: Double?
    public let lng: Double?
}

public struct PresenceResponse: Codable {
    public let ok: Bool
    public let nearby: [NearbyPlayer]
}

public struct NearbyPlayer: Codable {
    public let id: String
    public let username: String
    public let col: Int
    public let row: Int
}
