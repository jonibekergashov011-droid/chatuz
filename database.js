import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;

// PostgreSQL ulanish sozlamalari
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'upgchat',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

// Databaseni yaratish va jadvallarni sozlash
async function initializeDatabase() {
  try {
    console.log('🔄 Database ulanmoqda...');
    
    // Ulanishni tekshirish
    await pool.connect();
    console.log('✅ Databasega ulandi!');
    
    // Userlar jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE,
        name VARCHAR(255),
        photo TEXT,
        premium BOOLEAN DEFAULT false,
        premium_until TIMESTAMP,
        messages_count INTEGER DEFAULT 0,
        last_message TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Users jadvali tayyor');
    
    // Chat tarixi jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(50),
        message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Chats jadvali tayyor');
    
    // To'lovlar jadvali
    await pool.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        amount INTEGER,
        currency VARCHAR(10),
        status VARCHAR(50),
        plan VARCHAR(50),
        stripe_session_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Payments jadvali tayyor');
    
    console.log('🎉 Barcha jadvallar muvaffaqiyatli yaratildi!');
    
  } catch (error) {
    console.error('❌ Database xatolik:', error);
  }
}

// Database funksiyalari
const db = {
  // ============ USER FUNKSIYALARI ============
  
  // Userni qo'shish yoki yangilash
  async upsertUser(user) {
    try {
      const { id, email, name, photo } = user;
      const query = `
        INSERT INTO users (id, email, name, photo)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (id) 
        DO UPDATE SET 
          email = EXCLUDED.email,
          name = EXCLUDED.name,
          photo = EXCLUDED.photo,
          last_message = NOW()
        RETURNING *
      `;
      const result = await pool.query(query, [id, email, name, photo]);
      return result.rows[0];
    } catch (error) {
      console.error('upsertUser xatolik:', error);
      return null;
    }
  },
  
  // Userni olish
  async getUser(id) {
    try {
      const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
      return result.rows[0];
    } catch (error) {
      console.error('getUser xatolik:', error);
      return null;
    }
  },
  
  // Premium holatini tekshirish
  async checkPremium(id) {
    try {
      const result = await pool.query(
        'SELECT premium, premium_until FROM users WHERE id = $1',
        [id]
      );
      
      if (result.rows[0]) {
        // Premium muddati o'tganmi tekshirish
        if (result.rows[0].premium_until && new Date(result.rows[0].premium_until) < new Date()) {
          // Muddati o'tgan, premium ni false qilish
          await pool.query(
            'UPDATE users SET premium = false WHERE id = $1',
            [id]
          );
          return { premium: false, premium_until: null };
        }
        return result.rows[0];
      }
      return { premium: false };
    } catch (error) {
      console.error('checkPremium xatolik:', error);
      return { premium: false };
    }
  },
  
  // Premium aktivatsiya
  async activatePremium(id, months) {
    try {
      const query = `
        UPDATE users 
        SET premium = true, 
            premium_until = NOW() + INTERVAL '${months} months'
        WHERE id = $1
        RETURNING *
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0];
    } catch (error) {
      console.error('activatePremium xatolik:', error);
      return null;
    }
  },
  
  // Xabarlar sonini oshirish
  async incrementMessageCount(id) {
    try {
      const query = `
        UPDATE users 
        SET messages_count = messages_count + 1,
            last_message = NOW()
        WHERE id = $1
        RETURNING messages_count
      `;
      const result = await pool.query(query, [id]);
      return result.rows[0]?.messages_count || 0;
    } catch (error) {
      console.error('incrementMessageCount xatolik:', error);
      return 0;
    }
  },
  
  // ============ CHAT FUNKSIYALARI ============
  
  // Xabarni saqlash
  async saveMessage(userId, role, message) {
    try {
      const query = `
        INSERT INTO chats (user_id, role, message)
        VALUES ($1, $2, $3)
        RETURNING *
      `;
      const result = await pool.query(query, [userId, role, message]);
      
      // Xabarlar sonini oshirish
      await this.incrementMessageCount(userId);
      
      return result.rows[0];
    } catch (error) {
      console.error('saveMessage xatolik:', error);
      return null;
    }
  },
  
  // Userning chatlarini olish
  async getUserChats(userId, limit = 50) {
    try {
      const query = `
        SELECT * FROM chats 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT $2
      `;
      const result = await pool.query(query, [userId, limit]);
      return result.rows.reverse();
    } catch (error) {
      console.error('getUserChats xatolik:', error);
      return [];
    }
  },
  
  // Userning oxirgi chatini olish
  async getLastChat(userId) {
    try {
      const query = `
        SELECT * FROM chats 
        WHERE user_id = $1 
        ORDER BY created_at DESC 
        LIMIT 1
      `;
      const result = await pool.query(query, [userId]);
      return result.rows[0];
    } catch (error) {
      console.error('getLastChat xatolik:', error);
      return null;
    }
  },
  
  // ============ PAYMENT FUNKSIYALARI ============
  
  // To'lovni saqlash
  async savePayment(paymentData) {
    try {
      const { user_id, amount, currency, status, plan, stripe_session_id } = paymentData;
      const query = `
        INSERT INTO payments (user_id, amount, currency, status, plan, stripe_session_id)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      const result = await pool.query(query, [user_id, amount, currency, status, plan, stripe_session_id]);
      
      // To'lov muvaffaqiyatli bo'lsa premium aktivatsiya
      if (status === 'paid') {
        const months = plan === 'yearly' ? 12 : plan === 'monthly' ? 1 : 0;
        if (months > 0) {
          await this.activatePremium(user_id, months);
        }
      }
      
      return result.rows[0];
    } catch (error) {
      console.error('savePayment xatolik:', error);
      return null;
    }
  },
  
  // User to'lovlarini olish
  async getUserPayments(userId) {
    try {
      const query = `
        SELECT * FROM payments 
        WHERE user_id = $1 
        ORDER BY created_at DESC
      `;
      const result = await pool.query(query, [userId]);
      return result.rows;
    } catch (error) {
      console.error('getUserPayments xatolik:', error);
      return [];
    }
  },
  
  // ============ STATISTIKA ============
  
  // Umumiy statistika
  async getStats() {
    try {
      const usersCount = await pool.query('SELECT COUNT(*) FROM users');
      const chatsCount = await pool.query('SELECT COUNT(*) FROM chats');
      const premiumCount = await pool.query('SELECT COUNT(*) FROM users WHERE premium = true');
      const paymentsTotal = await pool.query('SELECT SUM(amount) FROM payments WHERE status = $1', ['paid']);
      
      return {
        totalUsers: parseInt(usersCount.rows[0].count),
        totalChats: parseInt(chatsCount.rows[0].count),
        premiumUsers: parseInt(premiumCount.rows[0].count),
        totalRevenue: paymentsTotal.rows[0].sum ? parseInt(paymentsTotal.rows[0].sum) / 100 : 0
      };
    } catch (error) {
      console.error('getStats xatolik:', error);
      return null;
    }
  },
  
  // ============ UTILITY ============
  
  // Databaseni tozalash (faqat admin uchun)
  async clearDatabase() {
    try {
      await pool.query('DELETE FROM chats');
      await pool.query('DELETE FROM payments');
      await pool.query('DELETE FROM users');
      console.log('✅ Database tozalandi');
      return true;
    } catch (error) {
      console.error('clearDatabase xatolik:', error);
      return false;
    }
  },
  
  // Ulanishni tekshirish
  async testConnection() {
    try {
      const result = await pool.query('SELECT NOW()');
      return {
        connected: true,
        time: result.rows[0].now
      };
    } catch (error) {
      return {
        connected: false,
        error: error.message
      };
    }
  }
};

// Databaseni ishga tushirish
initializeDatabase().catch(console.error);

// Eksport qilish
export { pool, db };