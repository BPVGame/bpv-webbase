import Foundation

/// Emoji Design Fish Card model — mirrors web FishCardData + emoji face art.
public struct FishCard: Identifiable, Codable, Hashable {
    public let id: Int
    public let cardSlug: String
    public let name: String
    public let rarity: Rarity
    public var level: Int
    public var attack: Int
    public var defense: Int
    public var speed: Int
    public let description: String
    public let emoji: String

    public enum Rarity: String, Codable, CaseIterable {
        case common = "Common"
        case uncommon = "Uncommon"
        case rare = "Rare"
        case epic = "Epic"
        case legendary = "Legendary"
        case mythic = "Mythic"

        public var defaultEmoji: String {
            switch self {
            case .common: return "🐟"
            case .uncommon: return "🐠"
            case .rare: return "🐡"
            case .epic: return "🦈"
            case .legendary: return "🐙"
            case .mythic: return "🐉"
            }
        }
    }

    public var upgradeCost: Int { level * 100 }

    public static let starters: [FishCard] = [
        FishCard(id: 101, cardSlug: "neon_guppy", name: "Neon Pixel Guppy", rarity: .common, level: 2, attack: 25, defense: 18, speed: 35, description: "A swift pixelated freshwater guppy glowing in cyan neon.", emoji: "🐟"),
        FishCard(id: 102, cardSlug: "cyber_bass", name: "Cyber Bass", rarity: .uncommon, level: 1, attack: 45, defense: 38, speed: 28, description: "Aggressive robotic bass with laser fins and armored scales.", emoji: "🐠"),
        FishCard(id: 103, cardSlug: "plasma_salmon", name: "Plasma Salmon", rarity: .rare, level: 1, attack: 75, defense: 62, speed: 55, description: "Legendary river runner glowing with plasma energy.", emoji: "🐡"),
        FishCard(id: 104, cardSlug: "quantum_kraken", name: "Quantum Kraken", rarity: .legendary, level: 3, attack: 140, defense: 125, speed: 95, description: "Deep sea mythic organism capable of warping space.", emoji: "🐙")
    ]
}
