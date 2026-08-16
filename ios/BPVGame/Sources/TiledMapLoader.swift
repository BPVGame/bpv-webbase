import Foundation

/// Tiled Map Editor (.tmj) loader for SpriteKit — mirrors `src/game/iso/TiledMapLoader.ts`
public struct TiledMapLoader {
    public struct Ground {
        public let width: Int
        public let height: Int
        public let tileSize: CGFloat
        public let orientation: String
        public let tiles: [[String]]
        public let spawnCol: Int
        public let spawnRow: Int
    }

    private static let defaultGidMap: [Int: String] = [
        1: "grass", 2: "tall_grass", 3: "dirt", 4: "cobble", 5: "sand", 6: "plaza",
        7: "water", 8: "shallow", 9: "bridge", 10: "dock", 11: "tree", 12: "pine",
        13: "bush", 14: "park", 15: "house", 16: "shop", 17: "hub", 18: "lab",
        19: "tower", 20: "lamp", 21: "sign", 22: "chest", 23: "spawn"
    ]

    public static func load(from url: URL) throws -> Ground {
        let data = try Data(contentsOf: url)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
        guard let json else { throw URLError(.cannotParseResponse) }

        let width = json["width"] as? Int ?? 0
        let height = json["height"] as? Int ?? 0
        let tilewidth = json["tilewidth"] as? CGFloat ?? 64
        let orientation = json["orientation"] as? String ?? "orthogonal"
        let layers = json["layers"] as? [[String: Any]] ?? []

        guard let ground = layers.first(where: { ($0["type"] as? String) == "tilelayer" && ($0["name"] as? String) == "ground" })
            ?? layers.first(where: { ($0["type"] as? String) == "tilelayer" }),
              let dataArr = ground["data"] as? [Int]
        else {
            throw URLError(.cannotDecodeContentData)
        }

        var tiles: [[String]] = []
        for r in 0..<height {
            var row: [String] = []
            for c in 0..<width {
                let gid = dataArr[r * width + c] & 0x1fffffff
                row.append(defaultGidMap[gid] ?? "grass")
            }
            tiles.append(row)
        }

        var spawnCol = width / 2
        var spawnRow = height / 2
        for r in 0..<height {
            for c in 0..<width where tiles[r][c] == "spawn" {
                spawnCol = c
                spawnRow = r
            }
        }

        return Ground(
            width: width,
            height: height,
            tileSize: tilewidth,
            orientation: orientation,
            tiles: tiles,
            spawnCol: spawnCol,
            spawnRow: spawnRow
        )
    }
}
