import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { initDatabase, pool } from './db.js';

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'bpvgame_jwt_secret_2026';

app.use(cors());
app.use(express.json());

// Initialize DB schema on startup
initDatabase();

// Middleware: Authenticate JWT Token
const authenticate = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Missing token' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded: any = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// 1. Auth: Register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const userRes = await pool.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, username, email, level, xp, coins, avatar_skin, avatar_hair, avatar_shirt, avatar_pants`,
      [username, email, password] // In production, password should be hashed with bcrypt
    );

    const user = userRes.rows[0];

    // Seed initial starter Fish Cards for user
    await pool.query(
      `INSERT INTO fish_cards (user_id, card_slug, name, rarity, level, attack, defense, speed, description)
       VALUES
       ($1, 'neon_guppy', 'Neon Guppy', 'Common', 1, 15, 10, 25, 'A swift pixelated freshwater guppy.'),
       ($1, 'cyber_bass', 'Cyber Bass', 'Uncommon', 1, 35, 30, 20, 'Aggressive robotic bass with laser fins.'),
       ($1, 'plasma_salmon', 'Plasma Salmon', 'Rare', 1, 65, 55, 45, 'Legendary river runner glowing with plasma energy.')`,
      [user.id]
    );

    // Seed starter missions
    await pool.query(
      `INSERT INTO missions (user_id, mission_key, title, description, progress, target, reward_xp, reward_coins)
       VALUES
       ($1, 'walk_500m', 'City Explorer', 'Walk 500 meters in Outdoor Mode or explore the virtual district.', 120, 500, 100, 150),
       ($1, 'visit_hub', 'Meet the NPCs', 'Talk to 3 local NPCs in the City Center.', 1, 3, 50, 80),
       ($1, 'join_tournament', 'Challenger', 'Join or create your first Fish Card tournament.', 0, 1, 150, 300)`,
      [user.id]
    );

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err: any) {
    console.error(err);
    res.status(400).json({ error: 'User registration failed or email/username exists.' });
  }
});

// 2. Auth: Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const userRes = await pool.query(
      `SELECT * FROM users WHERE username = $1 OR email = $1`,
      [username]
    );
    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'User not found' });
    }

    const user = userRes.rows[0];
    if (user.password_hash !== password) {
      return res.status(400).json({ error: 'Invalid password' });
    }

    delete user.password_hash;
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user });
  } catch (err: any) {
    res.status(500).json({ error: 'Login error' });
  }
});

// 3. Player: Get Profile & Stats
app.get('/api/player', authenticate, async (req: any, res) => {
  try {
    const userRes = await pool.query(`SELECT id, username, email, level, xp, coins, avatar_skin, avatar_hair, avatar_shirt, avatar_pants FROM users WHERE id = $1`, [req.userId]);
    res.json(userRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch player profile' });
  }
});

// Update Avatar Customization
app.put('/api/player/avatar', authenticate, async (req: any, res) => {
  const { avatar_skin, avatar_hair, avatar_shirt, avatar_pants } = req.body;
  try {
    const userRes = await pool.query(
      `UPDATE users
       SET avatar_skin = $1, avatar_hair = $2, avatar_shirt = $3, avatar_pants = $4
       WHERE id = $5
       RETURNING id, username, level, xp, coins, avatar_skin, avatar_hair, avatar_shirt, avatar_pants`,
      [avatar_skin, avatar_hair, avatar_shirt, avatar_pants, req.userId]
    );
    res.json(userRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update avatar' });
  }
});

// 4. Cards: Get Player Card Collection
app.get('/api/player/cards', authenticate, async (req: any, res) => {
  try {
    const cardsRes = await pool.query(`SELECT * FROM fish_cards WHERE user_id = $1 ORDER BY id DESC`, [req.userId]);
    res.json(cardsRes.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Upgrade Card
app.post('/api/cards/:id/upgrade', authenticate, async (req: any, res) => {
  const cardId = req.params.id;
  try {
    const cardRes = await pool.query(`SELECT * FROM fish_cards WHERE id = $1 AND user_id = $2`, [cardId, req.userId]);
    if (cardRes.rows.length === 0) return res.status(404).json({ error: 'Card not found' });

    const card = cardRes.rows[0];
    const upgradeCost = card.level * 100;

    const userRes = await pool.query(`SELECT coins FROM users WHERE id = $1`, [req.userId]);
    if (userRes.rows[0].coins < upgradeCost) {
      return res.status(400).json({ error: 'Not enough coins' });
    }

    // Deduct coins and boost stats
    await pool.query(`UPDATE users SET coins = coins - $1 WHERE id = $2`, [upgradeCost, req.userId]);
    const updatedCard = await pool.query(
      `UPDATE fish_cards
       SET level = level + 1, attack = attack + 10, defense = defense + 8, speed = speed + 6
       WHERE id = $1 RETURNING *`,
      [cardId]
    );

    res.json(updatedCard.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to upgrade card' });
  }
});

// 5. Tournaments: List & Create
app.get('/api/tournaments', async (req, res) => {
  try {
    const tournamentsRes = await pool.query(`SELECT t.*, u.username as creator_name FROM tournaments t LEFT JOIN users u ON t.creator_id = u.id ORDER BY t.id DESC`);
    res.json(tournamentsRes.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tournaments' });
  }
});

app.post('/api/tournaments', authenticate, async (req: any, res) => {
  const { name, description, max_players, prize_description } = req.body;
  try {
    const tournamentRes = await pool.query(
      `INSERT INTO tournaments (creator_id, name, description, max_players, prize_description)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.userId, name, description || 'Collectible Fish Card + 500 Coins', max_players || 16, prize_description || '2 Rare Fish Cards']
    );
    res.json(tournamentRes.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create tournament' });
  }
});

// 6. Missions: List & Claim
app.get('/api/missions', authenticate, async (req: any, res) => {
  try {
    const missionsRes = await pool.query(`SELECT * FROM missions WHERE user_id = $1 ORDER BY id ASC`, [req.userId]);
    res.json(missionsRes.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch missions' });
  }
});

app.post('/api/missions/:id/claim', authenticate, async (req: any, res) => {
  const missionId = req.params.id;
  try {
    const missionRes = await pool.query(`SELECT * FROM missions WHERE id = $1 AND user_id = $2`, [missionId, req.userId]);
    if (missionRes.rows.length === 0) return res.status(404).json({ error: 'Mission not found' });

    const mission = missionRes.rows[0];
    if (mission.is_completed) return res.status(400).json({ error: 'Mission already claimed' });

    // Mark completed & award XP / Coins
    await pool.query(`UPDATE missions SET is_completed = TRUE, progress = target WHERE id = $1`, [missionId]);
    await pool.query(`UPDATE users SET xp = xp + $1, coins = coins + $2 WHERE id = $3`, [mission.reward_xp, mission.reward_coins, req.userId]);

    res.json({ success: true, reward_xp: mission.reward_xp, reward_coins: mission.reward_coins });
  } catch (err) {
    res.status(500).json({ error: 'Failed to claim mission' });
  }
});

// 7. Nearby Players / Friends
app.get('/api/players/nearby', async (req, res) => {
  try {
    const playersRes = await pool.query(`SELECT id, username, level, avatar_skin, avatar_shirt FROM users ORDER BY RANDOM() LIMIT 8`);
    res.json(playersRes.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch nearby players' });
  }
});

// 8. Multiplayer presence heartbeat (IsoEarth / Outdoor GPS foundation)
// In-memory presence map — replace with Redis for multi-instance scale.
type Presence = {
  id: string;
  username: string;
  district: string;
  col: number;
  row: number;
  lat?: number;
  lng?: number;
  updatedAt: number;
};
const presenceByUser = new Map<string, Presence>();
const PRESENCE_TTL_MS = 15_000;

app.post('/api/multiplayer/heartbeat', (req, res) => {
  const { username, district, col, row, lat, lng } = req.body || {};
  if (!username || district == null || col == null || row == null) {
    return res.status(400).json({ error: 'Missing presence fields' });
  }

  const id = String(username);
  const now = Date.now();
  presenceByUser.set(id, {
    id,
    username: String(username),
    district: String(district),
    col: Number(col),
    row: Number(row),
    lat: lat != null ? Number(lat) : undefined,
    lng: lng != null ? Number(lng) : undefined,
    updatedAt: now
  });

  // Evict stale
  for (const [key, p] of presenceByUser) {
    if (now - p.updatedAt > PRESENCE_TTL_MS) presenceByUser.delete(key);
  }

  const nearby = [...presenceByUser.values()]
    .filter(p => p.id !== id && p.district === String(district))
    .map(({ id, username, col, row }) => ({ id, username, col, row }));

  res.json({ ok: true, nearby });
});

app.listen(PORT, () => {
  console.log(`BPV Game Server running on port ${PORT}`);
});
