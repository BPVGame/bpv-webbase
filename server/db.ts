import pg from 'pg';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_1Xf2vhkUlKzm@ep-withered-base-b3zhsqfc-pooler.c-4.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

export const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function initDatabase() {
  const client = await pool.connect();
  try {
    console.log('Connecting to Neon PostgreSQL Database...');

    // 1. Users Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        level INT DEFAULT 1,
        xp INT DEFAULT 0,
        coins INT DEFAULT 250,
        avatar_skin VARCHAR(20) DEFAULT '#fbcfe8',
        avatar_hair VARCHAR(20) DEFAULT '#1e293b',
        avatar_shirt VARCHAR(20) DEFAULT '#2563eb',
        avatar_pants VARCHAR(20) DEFAULT '#1e293b',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Fish Cards Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS fish_cards (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        card_slug VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        rarity VARCHAR(20) NOT NULL,
        level INT DEFAULT 1,
        attack INT NOT NULL,
        defense INT NOT NULL,
        speed INT NOT NULL,
        description TEXT,
        acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Tournaments Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tournaments (
        id SERIAL PRIMARY KEY,
        creator_id INT REFERENCES users(id),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        max_players INT DEFAULT 16,
        current_players INT DEFAULT 1,
        status VARCHAR(20) DEFAULT 'open',
        prize_description VARCHAR(100) DEFAULT '3 Rare Fish Cards + 500 Coins',
        start_time VARCHAR(50) DEFAULT 'Starting Soon',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Missions Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS missions (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        mission_key VARCHAR(50) NOT NULL,
        title VARCHAR(100) NOT NULL,
        description TEXT,
        progress INT DEFAULT 0,
        target INT DEFAULT 100,
        is_completed BOOLEAN DEFAULT FALSE,
        reward_xp INT DEFAULT 50,
        reward_coins INT DEFAULT 100
      );
    `);

    // 5. Friends Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS friends (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        friend_id INT REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'accepted',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, friend_id)
      );
    `);

    // 6. Living NPC world snapshots (ChatBase/ElloFive-backed agents)
    await client.query(`
      CREATE TABLE IF NOT EXISTS npc_world_state (
        user_key VARCHAR(64) PRIMARY KEY,
        state_json JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Database tables successfully migrated!');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
  }
}
