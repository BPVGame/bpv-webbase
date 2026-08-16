import SpriteKit

#if canImport(AppKit) && !targetEnvironment(macCatalyst)
import AppKit
#endif

/// 16-bit isometric foundation scene for BPV Game (SpriteKit).
/// Loads Tiled maps, draws procedural tiles, hooks Core Location + bpvgame.com API.
public final class GameScene: SKScene {
    private var mapGround: TiledMapLoader.Ground?
    private var playerNode: SKNode?
    private var playerCol = 0
    private var playerRow = 0
    private let tileW: CGFloat = 64
    private let tileH: CGFloat = 32

    public var locationManager: LocationManager?
    public var api = BpvApiClient.shared

    public override func didMove(to view: SKView) {
        backgroundColor = SKColor(red: 0.05, green: 0.08, blue: 0.13, alpha: 1)
        anchorPoint = CGPoint(x: 0.5, y: 0.35)

        if let url = Bundle.main.url(forResource: "city-center", withExtension: "tmj") {
            mapGround = try? TiledMapLoader.load(from: url)
        }

        rebuildMap()
        spawnPlayer()
        locationManager?.requestAccess()
        locationManager?.start()
    }

    private func rebuildMap() {
        removeAllChildren()
        guard let ground = mapGround else { return }

        var cells: [(c: Int, r: Int)] = []
        for r in 0..<ground.height {
            for c in 0..<ground.width {
                cells.append((c, r))
            }
        }
        cells.sort { $0.c + $0.r < $1.c + $1.r }

        for cell in cells {
            let id = ground.tiles[cell.r][cell.c]
            let pos = gridToScreen(col: cell.c, row: cell.r)
            let tile = makeIsoTile(id: id)
            tile.position = pos
            tile.zPosition = CGFloat(cell.c + cell.r)
            addChild(tile)
        }

        playerCol = ground.spawnCol
        playerRow = ground.spawnRow
    }

    private func spawnPlayer() {
        let node = SKNode()
        let body = SKSpriteNode(color: .systemBlue, size: CGSize(width: 16, height: 22))
        node.addChild(body)
        let label = SKLabelNode(text: "You")
        label.fontName = "Courier-Bold"
        label.fontSize = 9
        label.fontColor = .yellow
        label.position = CGPoint(x: 0, y: 18)
        node.addChild(label)
        node.zPosition = 1000
        playerNode = node
        addChild(node)
        syncPlayerPosition()
    }

    private func syncPlayerPosition() {
        playerNode?.position = gridToScreen(col: playerCol, row: playerRow)
        playerNode?.zPosition = CGFloat(playerCol + playerRow) + 0.5
    }

    private func gridToScreen(col: Int, row: Int) -> CGPoint {
        let x = CGFloat(col - row) * (tileW / 2)
        let y = -CGFloat(col + row) * (tileH / 2)
        return CGPoint(x: x, y: y)
    }

    private func makeIsoTile(id: String) -> SKShapeNode {
        let path = CGMutablePath()
        path.move(to: CGPoint(x: 0, y: tileH / 2))
        path.addLine(to: CGPoint(x: tileW / 2, y: 0))
        path.addLine(to: CGPoint(x: 0, y: -tileH / 2))
        path.addLine(to: CGPoint(x: -tileW / 2, y: 0))
        path.closeSubpath()

        let node = SKShapeNode(path: path)
        node.fillColor = color(for: id)
        node.strokeColor = SKColor(white: 0.1, alpha: 0.35)
        node.lineWidth = 1
        return node
    }

    private func color(for id: String) -> SKColor {
        switch id {
        case "water", "shallow": return SKColor(red: 0.15, green: 0.45, blue: 0.95, alpha: 1)
        case "cobble", "plaza": return SKColor(red: 0.55, green: 0.6, blue: 0.7, alpha: 1)
        case "bridge", "dirt", "sand": return SKColor(red: 0.75, green: 0.5, blue: 0.15, alpha: 1)
        case "tree", "pine", "park", "tall_grass": return SKColor(red: 0.15, green: 0.55, blue: 0.25, alpha: 1)
        case "hub", "shop", "lab", "tower", "house": return SKColor(red: 0.85, green: 0.55, blue: 0.15, alpha: 1)
        case "spawn": return SKColor(red: 0.95, green: 0.75, blue: 0.2, alpha: 1)
        default: return SKColor(red: 0.25, green: 0.75, blue: 0.4, alpha: 1)
        }
    }

    #if canImport(AppKit) && !targetEnvironment(macCatalyst)
    public override func keyDown(with event: NSEvent) {
        var dc = 0, dr = 0
        switch event.charactersIgnoringModifiers {
        case "w": dr = -1
        case "s": dr = 1
        case "a": dc = -1
        case "d": dc = 1
        default: break
        }
        attemptMove(dc: dc, dr: dr)
    }
    #endif

    public func attemptMove(dc: Int, dr: Int) {
        guard let ground = mapGround else { return }
        let nc = playerCol + dc
        let nr = playerRow + dr
        guard nr >= 0, nc >= 0, nr < ground.height, nc < ground.width else { return }
        let tile = ground.tiles[nr][nc]
        let blocked: Set<String> = ["water", "shallow", "tree", "pine", "bush", "house", "shop", "hub", "lab", "tower"]
        guard !blocked.contains(tile) else { return }
        playerCol = nc
        playerRow = nr
        syncPlayerPosition()
        Task {
            let district = await MainActor.run { locationManager?.district ?? "City Center" }
            let coord = await MainActor.run { locationManager?.coordinate }
            _ = try? await api.heartbeat(
                PresencePayload(
                    username: "Trainer",
                    district: district,
                    col: playerCol,
                    row: playerRow,
                    lat: coord?.latitude,
                    lng: coord?.longitude
                )
            )
        }
    }
}
