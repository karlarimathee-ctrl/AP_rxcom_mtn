require('dotenv').config({ override: false });
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
 
const app = express();
const port = process.env.PORT || 3000;
 
app.use(cors());
app.use(express.json());
 
let db;
//relier api au chemin du projet
app.get('/', (req, res) => {
  res.json({ status: 'OK', message: 'MTN MoMo Gramm API en ligne ' });
 
});
 if(process.env.DATABASE_URL) {
  // Mode Railway : on parse l'URL fournie par Railway
  const url = new URL(process.env.DATABASE_URL);
  db = mysql.createPool({
    host:     url.hostname,
    port:     Number(url.port) || 3306,
    user:     url.username,
    password: url.password,
    database: url.pathname.slice(1),
    ssl: { rejectUnauthorized: false }, // requis par Railway
    waitForConnections: true,
    connectionLimit: 10,
  });
 }else{
 
 // Mode local : variables classiques du .env
 db = mysql.createPool({
  host:     process.env.DB_HOST || 'localhost',
  user:     process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mtn_gramme',
  port:     Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});
}
 
db.getConnection((err, connection) => {
  if (err) {
    console.error('Erreur connection a la base de donnee:', err);
    return;
  }
  console.log('Connected to database');
  connection.release(); // Libérer la connexion
});
 
// ─── Création des tables au démarrage (directement sur le pool) ───────────────
db.query(`
  CREATE TABLE IF NOT EXISTS messages (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    from_numero VARCHAR(20)   NOT NULL,
    to_numero   VARCHAR(20)   NOT NULL,
    content     TEXT          NOT NULL,
    is_delivered TINYINT(1)    NOT NULL DEFAULT 0,
    is_read     TINYINT(1)    NOT NULL DEFAULT 0,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conv (from_numero, to_numero),
    INDEX idx_to   (to_numero)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`, (err) => {
  if (err) console.error('Erreur création table messages:', err.message);
  else console.log('Table messages prête');
  // Ajouter colonne si table existante
  db.query(`ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_delivered TINYINT(1) NOT NULL DEFAULT 0`, () => {});
});
 
db.query(`
  CREATE TABLE IF NOT EXISTS transferts (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      from_numero VARCHAR(20)    NOT NULL,
      to_numero   VARCHAR(20)    NOT NULL,
      montant     DECIMAL(15,2)  NOT NULL,
      note        TEXT           DEFAULT NULL,
      statut      VARCHAR(20)    NOT NULL DEFAULT 'succes',
      reference   VARCHAR(60)    NOT NULL UNIQUE,
      created_at  DATETIME       NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_from (from_numero),
      INDEX idx_to   (to_numero)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `, (err2) => {
    if (err2) console.error('Erreur création table transferts:', err2.message);
    else console.log('Table transferts prête');
});
 
 
// ─── Table user_presence (doit être créée avant toute requête) ───────────────
db.query(`
  CREATE TABLE IF NOT EXISTS user_presence (
    numero       VARCHAR(20)  NOT NULL PRIMARY KEY,
    is_online    TINYINT(1)   NOT NULL DEFAULT 0,
    last_seen    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    push_token   TEXT         DEFAULT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`, (err) => {
  if (err) console.error('Erreur création table user_presence:', err.message);
  else console.log('Table user_presence prête');
});
 
// ─── 2FA - OTP (DÉSACTIVÉ TEMPORAIREMENT - compte Brevo suspendu) ─────────────
// Pour réactiver : décommenter tout ce bloc + les routes step1, step2, resend-otp
 
// // Stockage temporaire des OTP en mémoire { numero: { code, expiresAt } }
// const otpStore = {};
 
// // Configurer le transporteur email (mettre vos vraies infos SMTP)
// //const transporter = nodemailer.createTransport({
// //  host: 'smtp.gmail.com',
// //  port: 587,
// //  secure: false,
// //  auth: {
// //    user: process.env.EMAIL_USER,
// //    pass: process.env.EMAIL_PASS,
// //  },
// //  connectionTimeout: 5000,  // timeout 5 secondes
// //  greetingTimeout: 5000,
// //  socketTimeout: 5000,
// //});
 
// const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
 
// const maskEmail = (email) => {
//   const [local, domain] = email.split('@');
//   return local[0] + '***@' + domain;
// };
 
// const sendOTP = async (email, code) => {
//   const response = await fetch('https://api.brevo.com/v3/smtp/email', {
//     method: 'POST',
//     headers: {
//       'accept': 'application/json',
//       'api-key': process.env.BREVO_API_KEY,
//       'content-type': 'application/json',
//     },
//     body: JSON.stringify({
//       sender: { name: 'MTN MoMo Gramm', email: process.env.BREVO_SENDER_EMAIL },
//       to: [{ email }],
//       subject: 'Votre code de connexion MTN MoMo Gramm',
//       htmlContent: `
//       <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#1A1A1A;padding:32px;border-radius:16px;">
//         <h2 style="color:#FFCC00;margin-bottom:8px;">MTN MoMo Gramm</h2>
//         <p style="color:#B0B0B0;">Votre code de vérification à 6 chiffres :</p>
//         <div style="background:#2C2C2C;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
//           <span style="font-size:42px;font-weight:900;letter-spacing:12px;color:#FFCC00;">${code}</span>
//         </div>
//         <p style="color:#B0B0B0;font-size:13px;">Ce code expire dans <strong style="color:#fff;">10 minutes</strong>.</p>
//         <p style="color:#B0B0B0;font-size:13px;">Ne partagez ce code avec personne.</p>
//         <hr style="border-color:#2C2C2C;margin:24px 0;">
//         <p style="color:#555;font-size:11px;">MTN Congo — Sécurité de votre compte</p>
//       </div>
//       `,
//     }),
//   });
//   if (!response.ok) {
//     const err = await response.text();
//     throw new Error('Brevo API error: ' + err);
//   }
// };
 
// ─── STEP 1 : Vérifier identifiants + envoyer OTP (DÉSACTIVÉ) ────────────────
// app.post('/api/login/step1', async (req, res) => {
//   const { numero, password } = req.body;
//   if (!numero || !password)
//     return res.status(400).json({ error: 'Numéro et mot de passe requis' });
//
//   const cleanNumero = numero.replace(/[\s\-]/g, '').trim();
//
//   const mtnRegex = /^06\d{7}$/;
//   if (!mtnRegex.test(cleanNumero)) {
//     return res.status(400).json({
//       error: 'Numéro invalide. Format attendu : 06XXXXXXX (9 chiffres)',
//     });
//   }
//
//   if (!password || password.length < 6) {
//     return res.status(400).json({ error: 'Mot de passe trop court (6 caractères minimum)' });
//   }
//
//   db.query('SELECT * FROM users WHERE numero = ? AND password = ?', [cleanNumero, password], async (err, results) => {
//     if (err) {
//       console.error('Erreur DB step1:', err);
//       return res.status(500).json({ error: 'Erreur dan la base de données. Contactez le support.' });
//     }
//     if (results.length === 0)
//       return res.status(401).json({ error: 'Numéro MTN ou mot de passe incorrect' });
//
//     const user = results[0];
//     const code = generateOTP();
//     const expiresAt = Date.now() + 10 * 60 * 1000;
//
//     otpStore[cleanNumero] = { code, expiresAt };
//
//     try {
//       await sendOTP(user.email, code);
//     } catch (e) {
//       console.error('Erreur envoi email:', e);
//       console.warn('OTP non envoyé par email, code =', code);
//     }
//
//     res.json({ email: maskEmail(user.email) });
//   });
// });
 
// ─── STEP 2 : Vérifier OTP (DÉSACTIVÉ) ───────────────────────────────────────
// app.post('/api/login/step2', (req, res) => {
//   const { numero, code } = req.body;
//   const cleanNumero = (numero ?? '').replace(/[\s\-]/g, '');
//
//   const stored = otpStore[cleanNumero];
//   if (!stored)
//     return res.status(400).json({ error: 'Aucun code en attente. Recommencez la connexion.' });
//
//   if (Date.now() > stored.expiresAt) {
//     delete otpStore[cleanNumero];
//     return res.status(400).json({ error: 'Code expiré. Cliquez sur "Renvoyer le code".' });
//   }
//
//   if (stored.code !== code)
//     return res.status(400).json({ error: 'Code incorrect. Vérifiez votre email.' });
//
//   delete otpStore[cleanNumero];
//
//   db.query('SELECT * FROM users WHERE numero = ?', [cleanNumero], (err, results) => {
//     if (err) return res.status(500).json({ error: 'Erreur dans la base de données' });
//     res.json(results[0]);
//   });
// });
 
// ─── RENVOYER OTP (DÉSACTIVÉ) ────────────────────────────────────────────────
// app.post('/api/login/resend-otp', async (req, res) => {
//   const { numero } = req.body;
//   const cleanNumero = (numero ?? '').replace(/[\s\-]/g, '');
//
//   db.query('SELECT email FROM users WHERE numero = ?', [cleanNumero], async (err, results) => {
//     if (err || results.length === 0)
//       return res.status(404).json({ error: 'Utilisateur introuvable' });
//
//     const code = generateOTP();
//     otpStore[cleanNumero] = { code, expiresAt: Date.now() + 10 * 60 * 1000 };
//
//     try {
//       await sendOTP(results[0].email, code);
//       res.json({ ok: true });
//     } catch {
//       res.status(500).json({ error: "Erreur lors de l'envoi du code." });
//     }
//   });
// });
 
// ─── LOGIN ────────────────────────────────────────────────────────────────────
// CORRECTION : GET → POST  |  req.query → req.body
app.post('/api/login', (req, res) => {
  const { numero, password } = req.body;
 
  if (!numero || !password) {
    return res.status(400).json({ error: 'Numéro et mot de passe requis' });
  }
 
  // Nettoyage et validation du numéro (attend 06XXXXXXXX, 10 chiffres)
  const cleanNumero = numero.replace(/[\s\-]/g, '');
  const mtnRegex = /^06\d{7}$/;
  if (!mtnRegex.test(cleanNumero)) {
    return res.status(400).json({
      error: 'Numéro invalide. Entrez un numéro MTN commençant par 06 (ex: 0612345678)',
    });
  }
 
  const query = 'SELECT * FROM users WHERE numero = ? AND password = ?';
  db.query(query, [cleanNumero, password], (err, results) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ error: 'erreur de la base de donnee' });
    }
    if (results.length === 0) {
      return res.status(401).json({ error: 'Numéro MTN ou mot de passe incorrect' });
    }
    res.json(results[0]);
  });
});
 
// ─── REGISTER ─────────────────────────────────────────────────────────────────
// CORRECTION : GET → POST  |  req.query → req.body
app.post('/api/register', (req, res) => {
  const { name, username, password, email, numero } = req.body;
 
  // Validation des champs requis
  if (!name || !username || !password || !email || !numero) {
    return res.status(400).json({
      error: 'Tous les champs sont requis (name, username, password, email, numero)',
    });
  }
 
  if (name.trim().length < 6) {
    return res.status(400).json({ error: 'Le nom doit contenir au moins 6 caractères' });
  }
 
  if (username.trim().length < 5) {
    return res.status(400).json({ error: 'Le username doit contenir au moins 5 caractères' });
  }
 
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: 'Adresse email invalide' });
  }
 
  if (password.length < 6) {
    return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 6 caractères' });
  }
 
  // Validation numéro MTN (attend 06XXXXXXXX, 10 chiffres)
  const cleanNumero = numero.replace(/[\s\-]/g, '');
  const mtnRegex = /^06\d{7}$/;
  if (!mtnRegex.test(cleanNumero)) {
    return res.status(400).json({
      error: 'Numéro invalide. Entrez un numéro MTN commençant par 06 (ex: 0612345678)',
    });
  }
 
  // Vérifier si le numéro, l'email ou le nom existe déjà
  const checkQuery = 'SELECT * FROM users WHERE email = ? OR numero = ? OR name = ?';
  db.query(checkQuery, [email, cleanNumero, name], (err, results) => {
    if (err) {
      console.error('Erreur vérification:', err);
      console.error('Erreur SELECT destinataire:', err.message, err.code);
      return res.status(500).json({ error: 'Erreur base de données: ' + err.message });
    }
 
    if (results.length > 0) {
      const existing = results[0];
      if (existing.name === name) return res.status(409).json({ error: 'Ce nom est déjà utilisé' });
      if (existing.email === email) return res.status(409).json({ error: 'Cet email est déjà utilisé' });
      if (existing.numero === cleanNumero) return res.status(409).json({ error: 'Ce numéro MTN est déjà utilisé' });
    }
 
    const insertQuery = 'INSERT INTO users (username, password, email, numero, name) VALUES (?, ?, ?, ?, ?)';
    db.query(insertQuery, [username.trim(), password, email.toLowerCase(), cleanNumero, name.trim()], (err, result) => {
      if (err) {
        console.error('Erreur insertion:', err);
        return res.status(500).json({ error: 'Erreur lors de la création du compte' });
      }
      res.status(201).json({
        message: 'Compte créé avec succès',
        user: {
          id: result.insertId,
          username: username.trim(),
          email: email.toLowerCase(),
          numero: cleanNumero,
        },
      });
    });
  });
});
 
// ─── CHECK USERS ─────────────────────────────────────────────────────────────
app.post('/api/check-users', (req, res) => {
  const { numeros } = req.body;
  if (!numeros || !Array.isArray(numeros) || numeros.length === 0)
    return res.status(400).json({ error: 'Liste de numéros requise' });
 
  const placeholders = numeros.map(() => '?').join(',');
  db.query(`SELECT numero, username, name FROM users WHERE numero IN (${placeholders})`, numeros, (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur base de données' });
    const response = numeros.map((numero) => {
      const user = results.find((r) => r.numero === numero);
      return { numero, hasAccount: !!user, username: user?.username ?? null, name: user?.name ?? null };
    });
    res.json({ results: response });
  });
});
 
// ─── FONCTION PUSH NOTIFICATION EXPO ────────────────────────────────────────
async function sendPushNotification(pushToken, title, body, data = {}) {
  if (!pushToken || !pushToken.startsWith('ExponentPushToken')) return;
  try {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        to: pushToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        channelId: 'messages',
      }),
    });
  } catch (e) {
    console.error('Erreur push notification:', e.message);
  }
}
 
// ─── ENVOYER UN MESSAGE ───────────────────────────────────────────────────────
app.post('/api/messages/send', (req, res) => {
  const { from_numero, to_numero, content } = req.body;
  if (!from_numero || !to_numero || !content?.trim())
    return res.status(400).json({ error: 'Champs manquants' });
 
  // Vérifier destinataire + récupérer son push token et son nom
  db.query(
    `SELECT u.id, u.name, p.push_token, p.is_online
     FROM users u
     LEFT JOIN user_presence p ON p.numero = u.numero
     WHERE u.numero = ?`,
    [to_numero],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Erreur base de données' });
      if (results.length === 0)
        return res.status(404).json({ error: 'Destinataire sans compte MTN MoMo Gramm' });
 
      const recipient = results[0];
 
      // Récupérer le nom de l'expéditeur
      db.query('SELECT name FROM users WHERE numero = ?', [from_numero], (err2, senderRows) => {
        const senderName = senderRows?.[0]?.name ?? from_numero;
 
        db.query(
          'INSERT INTO messages (from_numero, to_numero, content) VALUES (?, ?, ?)',
          [from_numero, to_numero, content.trim()],
          (err3, result) => {
            if (err3) {
              console.error('Erreur INSERT messages:', err3.message, err3.code);
              return res.status(500).json({ error: 'Erreur envoi message: ' + err3.message });
            }
 
            // Si le destinataire est en ligne → marquer comme livré immédiatement
            if (recipient.is_online) {
              db.query('UPDATE messages SET is_delivered = 1 WHERE id = ?', [result.insertId], () => {});
            }
 
            // Envoyer la notification push (même si en ligne, pour les apps en arrière-plan)
            if (recipient.push_token) {
              sendPushNotification(
                recipient.push_token,
                senderName,
                content.trim().length > 100 ? content.trim().slice(0, 100) + '…' : content.trim(),
                { from_numero, to_numero, type: 'message' }
              );
            }
 
            // Retourner le message complet
            db.query('SELECT * FROM messages WHERE id = ?', [result.insertId], (err4, rows) => {
              if (err4 || rows.length === 0)
                return res.status(201).json({ id: result.insertId, message: 'Message envoyé' });
              res.status(201).json(rows[0]);
            });
          }
        );
      });
    }
  );
});
 
// ─── MESSAGES D'UNE CONVERSATION ─────────────────────────────────────────────
app.get('/api/messages', (req, res) => {
  const { from, to } = req.query;
  if (!from || !to) return res.status(400).json({ error: 'Paramètres from et to requis' });
 
  const query = `
    SELECT m.*, u.name as from_name
    FROM messages m
    LEFT JOIN users u ON u.numero = m.from_numero
    WHERE (m.from_numero = ? AND m.to_numero = ?)
       OR (m.from_numero = ? AND m.to_numero = ?)
    ORDER BY m.created_at ASC
  `;
  db.query(query, [from, to, to, from], (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur base de données' });
    res.json(results);
  });
});
 
// ─── LISTE DES CONVERSATIONS ──────────────────────────────────────────────────
app.get('/api/conversations', (req, res) => {
  const { numero } = req.query;
  if (!numero) return res.status(400).json({ error: 'Numéro requis' });
 
  const query = `
    SELECT u.numero, u.name, u.username,
      (SELECT content FROM messages
       WHERE (from_numero = ? AND to_numero = u.numero) OR (from_numero = u.numero AND to_numero = ?)
       ORDER BY created_at DESC LIMIT 1) as lastMessage,
      (SELECT created_at FROM messages
       WHERE (from_numero = ? AND to_numero = u.numero) OR (from_numero = u.numero AND to_numero = ?)
       ORDER BY created_at DESC LIMIT 1) as lastTime,
      (SELECT COUNT(*) FROM messages
       WHERE from_numero = u.numero AND to_numero = ? AND is_read = 0) as unread
    FROM users u
    WHERE u.numero != ?
      AND EXISTS (
        SELECT 1 FROM messages
        WHERE (from_numero = ? AND to_numero = u.numero)
           OR (from_numero = u.numero AND to_numero = ?)
      )
    ORDER BY lastTime DESC
  `;
  const p = [numero, numero, numero, numero, numero, numero, numero, numero];
  db.query(query, p, (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur base de données' });
    res.json(results);
  });
});
 
// ─── MARQUER MESSAGES COMME LUS ──────────────────────────────────────────────
app.post('/api/messages/read', (req, res) => {
  const { from_numero, to_numero } = req.body;
  db.query(
    'UPDATE messages SET is_read = 1 WHERE from_numero = ? AND to_numero = ?',
    [from_numero, to_numero],
    (err) => {
      if (err) return res.status(500).json({ error: 'Erreur' });
      res.json({ ok: true });
    }
  );
});
 
 
// ─── RECHERCHE UTILISATEURS ───────────────────────────────────────────────────
app.get('/api/users/search', (req, res) => {
  const { q, exclude } = req.query;
  if (!q || q.trim().length < 2)
    return res.status(400).json({ error: 'Requête trop courte' });
 
  const search = `%${q.trim()}%`;
  const excludeId = parseInt(exclude) || 0;
 
  db.query(
    `SELECT id, name, username, numero FROM users
     WHERE id != ? AND (name LIKE ? OR username LIKE ? OR numero LIKE ?)
     LIMIT 20`,
    [excludeId, search, search, search],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Erreur base de données' });
      res.json(results);
    }
  );
});
 
// ─── CONVERSATIONS PAR ID UTILISATEUR ────────────────────────────────────────
app.get('/api/conversations/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  if (!userId) return res.status(400).json({ error: 'userId requis' });
 
  const query = `
    SELECT
      m_last.id,
      u.id as other_user_id,
      u.name as other_name,
      u.username as other_username,
      m_last.content as last_message,
      m_last.created_at as last_message_time,
      (SELECT COUNT(*) FROM messages
       WHERE sender_id = u.id AND receiver_id = ? AND is_read = 0) as unread_count
    FROM users u
    JOIN messages m_last ON m_last.id = (
      SELECT id FROM messages
      WHERE (sender_id = ? AND receiver_id = u.id)
         OR (sender_id = u.id AND receiver_id = ?)
      ORDER BY created_at DESC LIMIT 1
    )
    WHERE u.id != ?
    ORDER BY m_last.created_at DESC
  `;
  db.query(query, [userId, userId, userId, userId], (err, results) => {
    if (err) {
      console.error('Erreur conversations:', err);
      return res.status(500).json({ error: 'Erreur base de données' });
    }
    res.json(results);
  });
});
 
// ─── MESSAGES ENTRE DEUX UTILISATEURS (par ID) ───────────────────────────────
app.get('/api/messages/:userId/:otherId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const otherId = parseInt(req.params.otherId);
  if (!userId || !otherId) return res.status(400).json({ error: 'IDs requis' });
 
  db.query(
    `SELECT * FROM messages
     WHERE (sender_id = ? AND receiver_id = ?)
        OR (sender_id = ? AND receiver_id = ?)
     ORDER BY created_at ASC`,
    [userId, otherId, otherId, userId],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Erreur base de données' });
      res.json(results);
    }
  );
});
 
// ─── ENVOYER UN MESSAGE (par ID) ─────────────────────────────────────────────
app.post('/api/messages', (req, res) => {
  const { sender_id, receiver_id, content } = req.body;
  if (!sender_id || !receiver_id || !content?.trim())
    return res.status(400).json({ error: 'Champs manquants' });
 
  db.query(
    'INSERT INTO messages (sender_id, receiver_id, content, is_read) VALUES (?, ?, ?, 0)',
    [sender_id, receiver_id, content.trim()],
    (err, result) => {
      if (err) {
        console.error('Erreur insertion message:', err);
        return res.status(500).json({ error: 'Erreur envoi message' });
      }
      res.status(201).json({ id: result.insertId, message: 'Message envoyé' });
    }
  );
});
 
// ─── MARQUER MESSAGES LUS (par ID) ───────────────────────────────────────────
app.put('/api/messages/read', (req, res) => {
  const { sender_id, receiver_id } = req.body;
  db.query(
    'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ?',
    [sender_id, receiver_id],
    (err) => {
      if (err) return res.status(500).json({ error: 'Erreur' });
      res.json({ ok: true });
    }
  );
});
 
 
// ════════════════════════════════════════════════════════════════════════════
// ─── ÉPARGNE PERSONNELLE ──────────────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
 
// Liste des épargnes d'un utilisateur
app.get('/api/epargnes', (req, res) => {
  const { numero } = req.query;
  if (!numero) return res.status(400).json({ error: 'Numéro requis' });
  db.query('SELECT * FROM epargnes WHERE numero = ? ORDER BY date_creation DESC', [numero], (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur base de données' });
    res.json(results);
  });
});
 
// Créer une épargne
app.post('/api/epargnes', (req, res) => {
  const { numero, nom, objectif, couleur, icone } = req.body;
  if (!numero || !nom) return res.status(400).json({ error: 'Champs requis manquants' });
  db.query(
    'INSERT INTO epargnes (numero, nom, objectif, couleur, icone) VALUES (?, ?, ?, ?, ?)',
    [numero, nom.trim(), parseFloat(objectif) || 0, couleur || '#FFCC00', icone || 'savings'],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Erreur création épargne' });
      res.status(201).json({ id: result.insertId, message: 'Épargne créée' });
    }
  );
});
 
// Déposer dans une épargne
app.post('/api/epargnes/:id/depot', (req, res) => {
  const { id } = req.params;
  const { numero, montant } = req.body;
  const mt = parseFloat(montant);
  if (!numero || !mt || mt <= 0) return res.status(400).json({ error: 'Montant invalide' });
 
  db.query('SELECT * FROM epargnes WHERE id = ? AND numero = ?', [id, numero], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ error: 'Épargne introuvable' });
 
    db.query('UPDATE epargnes SET solde = solde + ? WHERE id = ?', [mt, id], (err2) => {
      if (err2) return res.status(500).json({ error: 'Erreur dépôt' });
      db.query(
        'INSERT INTO epargne_transactions (epargne_id, numero, type, montant) VALUES (?, ?, "depot", ?)',
        [id, numero, mt],
        () => res.json({ message: 'Dépôt effectué', nouveau_solde: results[0].solde + mt })
      );
    });
  });
});
 
// ════════════════════════════════════════════════════════════════════════════
// ─── TONTINES / CAISSES COMMUNES ─────────────────────────────────────────
// ════════════════════════════════════════════════════════════════════════════
 
const genCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
 
// Liste des tontines d'un utilisateur (membre ou admin)
app.get('/api/tontines', (req, res) => {
  const { numero } = req.query;
  if (!numero) return res.status(400).json({ error: 'Numéro requis' });
 
  const query = `
    SELECT t.*,
      (SELECT COUNT(*) FROM tontine_membres WHERE tontine_id = t.id) as membres_actuels,
      (SELECT u.name FROM tontine_membres tm
       LEFT JOIN users u ON u.numero = tm.numero
       WHERE tm.tontine_id = t.id AND tm.ordre_tour = t.tour_actuel AND tm.a_recu = 0
       LIMIT 1) as prochain_beneficiaire,
      DATE_ADD(t.date_creation, INTERVAL t.tour_actuel MONTH) as prochain_date,
      (t.admin_numero = ?) as est_admin,
      (SELECT COUNT(*) FROM tontine_membres WHERE tontine_id = t.id AND numero = ?) as est_membre
    FROM tontines t
    WHERE t.admin_numero = ?
       OR t.id IN (SELECT tontine_id FROM tontine_membres WHERE numero = ?)
    ORDER BY t.date_creation DESC
  `;
  db.query(query, [numero, numero, numero, numero], (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur base de données' });
    res.json(results.map(r => ({ ...r, est_admin: !!r.est_admin, est_membre: r.est_membre > 0 })));
  });
});
 
// Créer une tontine
app.post('/api/tontines', (req, res) => {
  const { numero, nom, cotisation_mensuelle, nombre_membres } = req.body;
  if (!numero || !nom || !cotisation_mensuelle || !nombre_membres)
    return res.status(400).json({ error: 'Tous les champs sont requis' });
 
  const code = genCode();
  db.query(
    'INSERT INTO tontines (nom, admin_numero, cotisation_mensuelle, nombre_membres, code_invitation) VALUES (?, ?, ?, ?, ?)',
    [nom.trim(), numero, parseFloat(cotisation_mensuelle), parseInt(nombre_membres), code],
    (err, result) => {
      if (err) return res.status(500).json({ error: 'Erreur création tontine' });
      const tontineId = result.insertId;
      // Ajouter l'admin comme premier membre (ordre 1)
      db.query(
        'INSERT INTO tontine_membres (tontine_id, numero, ordre_tour) VALUES (?, ?, 1)',
        [tontineId, numero],
        () => res.status(201).json({ id: tontineId, code_invitation: code, message: 'Caisse créée' })
      );
    }
  );
});
 
// Rejoindre une tontine avec un code
app.post('/api/tontines/rejoindre', (req, res) => {
  const { numero, code } = req.body;
  if (!numero || !code) return res.status(400).json({ error: 'Champs requis manquants' });
 
  db.query('SELECT * FROM tontines WHERE code_invitation = ?', [code.toUpperCase()], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ error: 'Code d invitation invalide' });
    const t = results[0];
 
    // Vérifier si la tontine est pleine
    db.query('SELECT COUNT(*) as cnt FROM tontine_membres WHERE tontine_id = ?', [t.id], (err2, cnt) => {
      if (err2) return res.status(500).json({ error: 'Erreur' });
      if (cnt[0].cnt >= t.nombre_membres)
        return res.status(400).json({ error: 'Cette caisse est complète' });
 
      // Vérifier si déjà membre
      db.query('SELECT id FROM tontine_membres WHERE tontine_id = ? AND numero = ?', [t.id, numero], (err3, ex) => {
        if (ex && ex.length > 0) return res.status(409).json({ error: 'Vous êtes déjà membre de cette caisse' });
 
        const ordre = cnt[0].cnt + 1;
        db.query(
          'INSERT INTO tontine_membres (tontine_id, numero, ordre_tour) VALUES (?, ?, ?)',
          [t.id, numero, ordre],
          (err4) => {
            if (err4) return res.status(500).json({ error: 'Erreur lors de ladhésion' });
 
            // Activer si la caisse est maintenant complète
            if (ordre === t.nombre_membres) {
              db.query('UPDATE tontines SET statut = "actif" WHERE id = ?', [t.id]);
            }
            res.json({ message: 'Vous avez rejoint la caisse avec succès', tontine: t.nom });
          }
        );
      });
    });
  });
});
 
// Payer sa cotisation mensuelle
app.post('/api/tontines/:id/cotiser', (req, res) => {
  const { id } = req.params;
  const { numero } = req.body;
 
  db.query('SELECT * FROM tontines WHERE id = ? AND statut = "actif"', [id], (err, results) => {
    if (err || results.length === 0) return res.status(404).json({ error: 'Tontine introuvable ou inactive' });
    const t = results[0];
 
    // Vérifier si déjà payé ce tour
    db.query(
      'SELECT id FROM tontine_cotisations WHERE tontine_id = ? AND numero = ? AND tour = ?',
      [id, numero, t.tour_actuel],
      (err2, existing) => {
        if (existing && existing.length > 0)
          return res.status(409).json({ error: 'Vous avez déjà payé votre cotisation ce tour' });
 
        // Enregistrer le paiement
        db.query(
          'INSERT INTO tontine_cotisations (tontine_id, numero, tour, montant) VALUES (?, ?, ?, ?)',
          [id, numero, t.tour_actuel, t.cotisation_mensuelle],
          (err3) => {
            if (err3) return res.status(500).json({ error: 'Erreur paiement cotisation' });
 
            // Mettre à jour le solde total
            db.query('UPDATE tontines SET solde_total = solde_total + ? WHERE id = ?', [t.cotisation_mensuelle, id]);
 
            // Vérifier si tous ont payé → virer au bénéficiaire du tour
            db.query(
              'SELECT COUNT(*) as cnt FROM tontine_cotisations WHERE tontine_id = ? AND tour = ?',
              [id, t.tour_actuel],
              (err4, cnts) => {
                if (cnts[0].cnt >= t.nombre_membres) {
                  // Trouver le bénéficiaire du tour actuel
                  db.query(
                    'SELECT numero FROM tontine_membres WHERE tontine_id = ? AND ordre_tour = ?',
                    [id, t.tour_actuel],
                    (err5, ben) => {
                      if (ben && ben.length > 0) {
                        const montantVerse = t.cotisation_mensuelle * t.nombre_membres;
                        // Enregistrer le versement
                        db.query(
                          'INSERT INTO tontine_versements (tontine_id, beneficiaire, tour, montant) VALUES (?, ?, ?, ?)',
                          [id, ben[0].numero, t.tour_actuel, montantVerse]
                        );
                        // Marquer membre comme ayant reçu + passer au tour suivant
                        db.query('UPDATE tontine_membres SET a_recu = 1 WHERE tontine_id = ? AND numero = ?', [id, ben[0].numero]);
 
                        const prochainTour = t.tour_actuel + 1;
                        if (prochainTour > t.nombre_membres) {
                          db.query('UPDATE tontines SET statut = "complet", tour_actuel = ?, solde_total = 0 WHERE id = ?', [prochainTour, id]);
                        } else {
                          db.query('UPDATE tontines SET tour_actuel = ?, solde_total = 0 WHERE id = ?', [prochainTour, id]);
                        }
                      }
                    }
                  );
                }
                res.json({ message: 'Cotisation payée avec succès' });
              }
            );
          }
        );
      }
    );
  });
});
 
 
 
// ─── TRANSFERTS D'ARGENT ─────────────────────────────────────────────────
 
 
const genRef = () => 'MTN' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
 
// ─── Vérifier si un numéro existe + récupérer infos ─────────────────────────
app.get('/api/users/check', (req, res) => {
  const { numero } = req.query;
  if (!numero) return res.status(400).json({ error: 'Numéro requis' });
 
  const cleanNumero = numero.replace(/[\s\-]/g, '');
  db.query('SELECT name, username, numero FROM users WHERE numero = ?', [cleanNumero], (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur base de données' });
    if (results.length === 0) return res.status(404).json({ error: 'Aucun compte MTN MoMo Gramm trouvé pour ce numéro' });
    res.json(results[0]);
  });
});
 
// ─── Solde d'un utilisateur ──────────────────────────────────────────────────
app.get('/api/users/solde', (req, res) => {
  const { numero } = req.query;
  if (!numero) return res.status(400).json({ error: 'Numéro requis' });
  db.query('SELECT solde FROM users WHERE numero = ?', [numero], (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur base de données' });
    if (results.length === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json({ solde: results[0].solde });
  });
});
 
// ─── Effectuer un transfert ──────────────────────────────────────────────────
app.post('/api/transferts', (req, res) => {
  const { from_numero, to_numero, montant, note } = req.body;
 
  if (!from_numero || !to_numero || !montant)
    return res.status(400).json({ error: 'Champs requis manquants' });
 
  const mt = parseFloat(montant);
  if (isNaN(mt) || mt < 100)
    return res.status(400).json({ error: 'Montant minimum : 100 FCFA' });
 
  const fromClean = from_numero.replace(/[\s\-]/g, '');
  const toClean   = to_numero.replace(/[\s\-]/g, '');
 
  if (fromClean === toClean)
    return res.status(400).json({ error: 'Vous ne pouvez pas vous envoyer de largent à vous-même' });
 
  // 1. Vérifier solde expéditeur
  db.query('SELECT solde, name FROM users WHERE numero = ?', [fromClean], (err, senderRows) => {
    if (err || senderRows.length === 0)
      return res.status(404).json({ error: 'Compte expéditeur introuvable' });
 
    const sender = senderRows[0];
    if (parseFloat(sender.solde) < mt)
      return res.status(400).json({ error: `Solde insuffisant. Solde disponible : ${parseFloat(sender.solde).toLocaleString('fr-FR')} FCFA` });
 
    // 2. Vérifier destinataire
    db.query('SELECT name, username, numero FROM users WHERE numero = ?', [toClean], (err2, destRows) => {
      if (err2 || destRows.length === 0)
        return res.status(404).json({ error: 'Aucun compte MTN MoMo Gramm trouvé pour ce numéro' });
 
      const dest = destRows[0];
      const ref  = genRef();
 
      // 3. Transaction atomique via getConnection (Pool ne supporte pas beginTransaction)
      db.getConnection((errConn, conn) => {
        if (errConn) return res.status(500).json({ error: 'Erreur connexion DB' });
 
        conn.beginTransaction((errTx) => {
          if (errTx) { conn.release(); return res.status(500).json({ error: 'Erreur transaction' }); }
 
          conn.query('UPDATE users SET solde = solde - ? WHERE numero = ?', [mt, fromClean], (e1) => {
            if (e1) return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Erreur débit' }); });
 
            conn.query('UPDATE users SET solde = solde + ? WHERE numero = ?', [mt, toClean], (e2) => {
              if (e2) return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Erreur crédit' }); });
 
              conn.query(
                'INSERT INTO transferts (from_numero, to_numero, montant, note, statut, reference) VALUES (?, ?, ?, ?, "succes", ?)',
                [fromClean, toClean, mt, note?.trim() || null, ref],
                (e3) => {
                  if (e3) {
                    console.error('Erreur INSERT transferts:', e3.message);
                    return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Erreur enregistrement: ' + e3.message }); });
                  }
 
                  conn.commit((eCom) => {
                    conn.release();
                    if (eCom) return res.status(500).json({ error: 'Erreur validation' });
                    res.status(201).json({
                      message: 'Transfert effectué avec succès',
                      reference: ref,
                      montant: mt,
                      destinataire: { name: dest.name, username: dest.username, numero: toClean },
                      nouveau_solde: parseFloat(sender.solde) - mt,
                    });
                  });
                }
              );
            });
          });
        });
      });
    });
  });
});
 
// ─── Historique des transferts ───────────────────────────────────────────────
app.get('/api/transferts', (req, res) => {
  const { numero, limit = 20 } = req.query;
  if (!numero) return res.status(400).json({ error: 'Numéro requis' });
 
  const query = `
    SELECT t.*,
      us.name as from_name, us.username as from_username,
      ud.name as to_name,   ud.username as to_username,
      CASE WHEN t.from_numero = ? THEN 'envoi' ELSE 'reception' END as type
    FROM transferts t
    LEFT JOIN users us ON us.numero = t.from_numero
    LEFT JOIN users ud ON ud.numero = t.to_numero
    WHERE t.from_numero = ? OR t.to_numero = ?
    ORDER BY t.created_at DESC
    LIMIT ?
  `;
  db.query(query, [numero, numero, numero, parseInt(limit)], (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur base de données' });
    res.json(results);
  });
});
 
 
 
// ─── RECHARGE ─────────────────────────────────────────────────────────────
 
 
const genRefRecharge = () => 'RCH' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
 
// ─── Vérifier un code de recharge (aperçu avant confirmation) ────────────────
app.get('/api/recharge/verifier', (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Code requis' });
 
  // Normaliser : retirer espaces ET tirets, puis reformater avec tirets pour matcher la DB
  const digits = code.replace(/[\s\-]/g, '');
  const cleanCode = digits.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4');
 
  db.query('SELECT * FROM cartes_recharge WHERE code = ?', [cleanCode], (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur base de données' });
    if (results.length === 0)
      return res.status(404).json({ error: 'Code de recharge invalide. Vérifiez et réessayez.' });
 
    const carte = results[0];
 
    if (carte.statut === 'utilisée')
      return res.status(400).json({ error: 'Ce code a déjà été utilisé.' });
 
    if (carte.statut === 'expirée' || (carte.expires_at && new Date(carte.expires_at) < new Date()))
      return res.status(400).json({ error: 'Ce code de recharge a expiré.' });
 
    res.json({
      code: carte.code,
      montant: carte.montant,
      statut: carte.statut,
      expires_at: carte.expires_at,
    });
  });
});
 
// ─── Confirmer la recharge ────────────────────────────────────────────────────
app.post('/api/recharge', (req, res) => {
  const { numero, code, methode } = req.body;
 
  if (!numero || !code)
    return res.status(400).json({ error: 'Numéro et code requis' });
 
  const digits2 = code.replace(/[\s\-]/g, '');
  const cleanCode = digits2.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '$1-$2-$3-$4');
 
  // 1. Vérifier la carte
  db.query('SELECT * FROM cartes_recharge WHERE code = ?', [cleanCode], (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur base de données' });
    if (results.length === 0)
      return res.status(404).json({ error: 'Code invalide.' });
 
    const carte = results[0];
 
    if (carte.statut !== 'disponible')
      return res.status(400).json({ error: carte.statut === 'utilisée' ? 'Ce code a déjà été utilisé.' : 'Ce code a expiré.' });
 
    if (carte.expires_at && new Date(carte.expires_at) < new Date())
      return res.status(400).json({ error: 'Ce code de recharge a expiré.' });
 
    const montant = parseFloat(carte.montant);
    const ref = genRefRecharge();
 
    // ÉTAPE 1 : S'assurer que la colonne solde existe
    db.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS solde DECIMAL(15,2) DEFAULT 0", () => {
 
      // ÉTAPE 2 : Créditer le compte
      db.query('UPDATE users SET solde = solde + ? WHERE numero = ?', [montant, numero], (e1) => {
        if (e1) {
          console.error('Erreur crédit solde:', e1.message);
          return res.status(500).json({ error: 'Erreur crédit compte : ' + e1.message });
        }
 
        // ÉTAPE 3 : Marquer la carte comme utilisée
        db.query(
          "UPDATE cartes_recharge SET statut = 'utilisée', numero_utilisateur = ?, used_at = NOW() WHERE code = ?",
          [numero, cleanCode],
          (e2) => {
            if (e2) {
              console.error('Erreur marquage carte:', e2.message);
              // Annuler le crédit
              db.query('UPDATE users SET solde = solde - ? WHERE numero = ?', [montant, numero], () => {});
              return res.status(500).json({ error: 'Erreur marquage carte : ' + e2.message });
            }
 
            // ÉTAPE 4 : Enregistrer dans l'historique
            db.query(
              'INSERT INTO recharges (numero, montant, methode, code_carte, reference) VALUES (?, ?, ?, ?, ?)',
              [numero, montant, methode || 'code', cleanCode, ref],
              (e3) => {
                if (e3) console.error('Avertissement historique:', e3.message);
                // L'historique est non-bloquant : la recharge est déjà créditée
 
                // ÉTAPE 5 : Retourner le nouveau solde
                db.query('SELECT solde FROM users WHERE numero = ?', [numero], (e4, rows) => {
                  const nouveauSolde = (rows && rows.length > 0) ? parseFloat(rows[0].solde) : 0;
                  res.status(201).json({
                    message: 'Recharge effectuée avec succès',
                    montant,
                    reference: ref,
                    nouveau_solde: nouveauSolde,
                  });
                });
              }
            );
          }
        );
      });
    });
  });
});
 
// ─── Historique des recharges ─────────────────────────────────────────────────
app.get('/api/recharges', (req, res) => {
  const { numero, limit = 10 } = req.query;
  if (!numero) return res.status(400).json({ error: 'Numéro requis' });
 
  db.query(
    'SELECT * FROM recharges WHERE numero = ? ORDER BY created_at DESC LIMIT ?',
    [numero, parseInt(limit)],
    (err, results) => {
      if (err) return res.status(500).json({ error: 'Erreur base de données' });
      res.json(results);
    }
  );
});
 
 
// ─── RECHARGE PAR VIREMENT BANCAIRE ──────────────────────────────────────────
 
 
const BANQUES_AUTORISEES = ['UBA','BGFI','LCB','ECOBANK','CREDIT_DU_CONGO','SOCIETE_GENERALE','COFIPA','MUCODEC'];
const genRefVirement = () => 'VIR' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2,5).toUpperCase();
 
// Créer table virements si inexistante
db.query(`
  CREATE TABLE IF NOT EXISTS virements_bancaires (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    numero      VARCHAR(20)   NOT NULL,
    banque      VARCHAR(50)   NOT NULL,
    num_compte  VARCHAR(100)  NOT NULL,
    titulaire   VARCHAR(150)  NOT NULL,
    montant     DECIMAL(15,2) NOT NULL,
    statut      VARCHAR(20)   NOT NULL DEFAULT 'succes',
    reference   VARCHAR(60)   NOT NULL UNIQUE,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_num (numero)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
`, (err) => {
  if (err) console.error('Erreur création table virements_bancaires:', err.message);
  else console.log('Table virements_bancaires prête');
});
 
app.post('/api/recharge/virement', (req, res) => {
  const { numero, banque, num_compte, titulaire, montant } = req.body;
 
  if (!numero || !banque || !num_compte || !titulaire || !montant)
    return res.status(400).json({ error: 'Tous les champs sont obligatoires.' });
 
  if (!BANQUES_AUTORISEES.includes(banque.toUpperCase()))
    return res.status(400).json({ error: 'Banque non reconnue.' });
 
  const mt = parseFloat(montant);
  if (isNaN(mt) || mt < 1000)
    return res.status(400).json({ error: 'Montant minimum : 1 000 FCFA.' });
 
  if (!num_compte.trim() || num_compte.trim().length < 8)
    return res.status(400).json({ error: 'Numéro de compte invalide.' });
 
  // Vérifier que le numéro MoMo existe
  db.query('SELECT solde FROM users WHERE numero = ?', [numero], (err1, rows) => {
    if (err1 || rows.length === 0)
      return res.status(404).json({ error: 'Compte MoMo introuvable.' });
 
    const ref = genRefVirement();
 
    db.getConnection((errConn, conn) => {
      if (errConn) return res.status(500).json({ error: 'Erreur connexion DB.' });
 
      conn.beginTransaction((errTx) => {
        if (errTx) { conn.release(); return res.status(500).json({ error: 'Erreur transaction.' }); }
 
        conn.query('UPDATE users SET solde = solde + ? WHERE numero = ?', [mt, numero], (e1) => {
          if (e1) return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Erreur crédit.' }); });
 
          conn.query(
            'INSERT INTO virements_bancaires (numero, banque, num_compte, titulaire, montant, reference) VALUES (?, ?, ?, ?, ?, ?)',
            [numero, banque.toUpperCase(), num_compte.trim(), titulaire.trim(), mt, ref],
            (e2) => {
              if (e2) {
                console.error('Erreur INSERT virement:', e2.message);
                return conn.rollback(() => { conn.release(); res.status(500).json({ error: 'Erreur enregistrement: ' + e2.message }); });
              }
 
              conn.commit((eCom) => {
                conn.release();
                if (eCom) return res.status(500).json({ error: 'Erreur validation.' });
 
                db.query('SELECT solde FROM users WHERE numero = ?', [numero], (e3, rws) => {
                  const nouveauSolde = rws?.[0] ? parseFloat(rws[0].solde) : parseFloat(rows[0].solde) + mt;
                  res.status(201).json({
                    message: 'Virement enregistré et compte MoMo crédité.',
                    reference: ref,
                    banque: banque.toUpperCase(),
                    montant: mt,
                    nouveau_solde: nouveauSolde,
                  });
                });
              });
            }
          );
        });
      });
    });
  });
});
 
// Historique des virements
app.get('/api/recharge/virements', (req, res) => {
  const { numero } = req.query;
  if (!numero) return res.status(400).json({ error: 'Numéro requis.' });
  db.query(
    'SELECT * FROM virements_bancaires WHERE numero = ? ORDER BY created_at DESC LIMIT 20',
    [numero],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erreur base de données.' });
      res.json(rows);
    }
  );
});
 
 
// ─── ENREGISTRER / METTRE À JOUR PUSH TOKEN ──────────────────────────────────
app.post('/api/presence/token', (req, res) => {
  const { numero, push_token } = req.body;
  if (!numero) return res.status(400).json({ error: 'Numéro requis' });
 
  db.query(
    `INSERT INTO user_presence (numero, push_token, is_online, last_seen)
     VALUES (?, ?, 1, NOW())
     ON DUPLICATE KEY UPDATE push_token = VALUES(push_token), is_online = 1, last_seen = NOW()`,
    [numero, push_token ?? null],
    (err) => {
      if (err) return res.status(500).json({ error: 'Erreur DB' });
      res.json({ ok: true });
    }
  );
});
 
// ─── METTRE À JOUR PRÉSENCE (ONLINE / OFFLINE) ───────────────────────────────
app.post('/api/presence/update', (req, res) => {
  const { numero, is_online } = req.body;
  if (!numero) return res.status(400).json({ error: 'Numéro requis' });
 
  const online = is_online ? 1 : 0;
  db.query(
    `INSERT INTO user_presence (numero, is_online, last_seen)
     VALUES (?, ?, NOW())
     ON DUPLICATE KEY UPDATE is_online = ?, last_seen = NOW()`,
    [numero, online, online],
    (err) => {
      if (err) return res.status(500).json({ error: 'Erreur DB' });
      res.json({ ok: true });
    }
  );
});
 
// ─── OBTENIR PRÉSENCE D'UN UTILISATEUR ───────────────────────────────────────
app.get('/api/presence/:numero', (req, res) => {
  const { numero } = req.params;
  db.query(
    'SELECT is_online, last_seen FROM user_presence WHERE numero = ?',
    [numero],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erreur DB' });
      if (rows.length === 0) return res.json({ is_online: false, last_seen: null });
      res.json({ is_online: !!rows[0].is_online, last_seen: rows[0].last_seen });
    }
  );
});
 
// ─── MARQUER MESSAGES COMME LIVRÉS ───────────────────────────────────────────
app.post('/api/messages/delivered', (req, res) => {
  const { to_numero } = req.body;
  if (!to_numero) return res.status(400).json({ error: 'to_numero requis' });
 
  db.query(
    'UPDATE messages SET is_delivered = 1 WHERE to_numero = ? AND is_delivered = 0',
    [to_numero],
    (err) => {
      if (err) return res.status(500).json({ error: 'Erreur' });
      res.json({ ok: true });
    }
  );
});
 
// ─── STATUT D'UN MESSAGE (pour ticks) ────────────────────────────────────────
app.get('/api/messages/status', (req, res) => {
  const { from_numero, to_numero } = req.query;
  if (!from_numero || !to_numero) return res.status(400).json({ error: 'Paramètres requis' });
 
  db.query(
    `SELECT id, is_delivered, is_read FROM messages
     WHERE from_numero = ? AND to_numero = ?
     ORDER BY created_at DESC LIMIT 50`,
    [from_numero, to_numero],
    (err, rows) => {
      if (err) return res.status(500).json({ error: 'Erreur' });
      res.json(rows);
    }
  );
});
 
// ─── ENVOYER NOTIFICATION PUSH EXPO ──────────────────────────────────────────
 
 
 
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});