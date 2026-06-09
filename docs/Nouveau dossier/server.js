require('dotenv').config(); // ← DOIT être la toute première ligne
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
 
const app = express();
const port = process.env.PORT || 3000;
 
app.use(cors());
app.use(express.json());
 
const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'mtngram',
  port: process.env.DB_PORT || 3306,
});
 
db.connect((err) => {
  if (err) {
    console.error('Error connecting to database:', err);
    return;
  }
  console.log('Connected to database');
});
 
 
// ─── 2FA - OTP ────────────────────────────────────────────────────────────────
const nodemailer = require('nodemailer');
 
// Stockage temporaire des OTP en mémoire { numero: { code, expiresAt } }
const otpStore = {};
 
// Configurer le transporteur email (mettre vos vraies infos SMTP)
const transporter = nodemailer.createTransport({
  service: 'gmail',  // ou 'outlook', 'yahoo', etc.
  auth: {
    user: process.env.EMAIL_USER,      // votre email ex: monapp@gmail.com
    pass: process.env.EMAIL_PASS,      // mot de passe d'application Gmail
  },
});
 
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();
 
const maskEmail = (email) => {
  const [local, domain] = email.split('@');
  return local[0] + '***@' + domain;
};
 
const sendOTP = async (email, code) => {
  await transporter.sendMail({
    from: `"MTN MoMo Gramm" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Votre code de connexion MTN MoMo Gramm',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;background:#1A1A1A;padding:32px;border-radius:16px;">
        <h2 style="color:#FFCC00;margin-bottom:8px;">MTN MoMo Gramm</h2>
        <p style="color:#B0B0B0;">Votre code de vérification à 6 chiffres :</p>
        <div style="background:#2C2C2C;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
          <span style="font-size:42px;font-weight:900;letter-spacing:12px;color:#FFCC00;">${code}</span>
        </div>
        <p style="color:#B0B0B0;font-size:13px;">Ce code expire dans <strong style="color:#fff;">10 minutes</strong>.</p>
        <p style="color:#B0B0B0;font-size:13px;">Ne partagez ce code avec personne.</p>
        <hr style="border-color:#2C2C2C;margin:24px 0;">
        <p style="color:#555;font-size:11px;">MTN Congo — Sécurité de votre compte</p>
      </div>
    `,
  });
};
 
// ─── STEP 1 : Vérifier identifiants + envoyer OTP ────────────────────────────
app.post('/api/login/step1', async (req, res) => {
  const { numero, password } = req.body;
  if (!numero || !password)
    return res.status(400).json({ error: 'Numéro et mot de passe requis' });
 
  const cleanNumero = numero.replace(/[\s\-]/g, '').trim();
 
  // Validation format numéro (06XXXXXXX = 9 chiffres)
  const mtnRegex = /^06\d{7}$/;
  if (!mtnRegex.test(cleanNumero)) {
    return res.status(400).json({
      error: 'Numéro invalide. Format attendu : 06XXXXXXX (9 chiffres)',
    });
  }
 
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Mot de passe trop court (6 caractères minimum)' });
  }
 
  db.query('SELECT * FROM users WHERE numero = ? AND password = ?', [cleanNumero, password], async (err, results) => {
    if (err) {
      console.error('Erreur DB step1:', err);
      return res.status(500).json({ error: 'Erreur base de données. Contactez le support.' });
    }
    if (results.length === 0)
      return res.status(401).json({ error: 'Numéro MTN ou mot de passe incorrect' });
 
    const user = results[0];
    const code = generateOTP();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
 
    // Stocker OTP
    otpStore[cleanNumero] = { code, expiresAt };
 
    // Envoyer par email
    try {
      await sendOTP(user.email, code);
    } catch (e) {
      console.error('Erreur envoi email:', e);
      // Ne pas bloquer la connexion si l'email échoue en dev
      if (process.env.NODE_ENV === 'production') {
        return res.status(500).json({ error: "Erreur lors de l'envoi du code email. Vérifiez la config SMTP." });
      }
      console.warn('Mode dev: OTP =', code, '(email non envoyé)');
    }
 
    res.json({ email: maskEmail(user.email) });
  });
});
 
// ─── STEP 2 : Vérifier OTP ───────────────────────────────────────────────────
app.post('/api/login/step2', (req, res) => {
  const { numero, code } = req.body;
  const cleanNumero = (numero ?? '').replace(/[\s\-]/g, '');
 
  const stored = otpStore[cleanNumero];
  if (!stored)
    return res.status(400).json({ error: 'Aucun code en attente. Recommencez la connexion.' });
 
  if (Date.now() > stored.expiresAt) {
    delete otpStore[cleanNumero];
    return res.status(400).json({ error: 'Code expiré. Cliquez sur "Renvoyer le code".' });
  }
 
  if (stored.code !== code)
    return res.status(400).json({ error: 'Code incorrect. Vérifiez votre email.' });
 
  // OTP valide → supprimer + retourner l'utilisateur
  delete otpStore[cleanNumero];
 
  db.query('SELECT * FROM users WHERE numero = ?', [cleanNumero], (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur base de données' });
    res.json(results[0]);
  });
});
 
// ─── RENVOYER OTP ────────────────────────────────────────────────────────────
app.post('/api/login/resend-otp', async (req, res) => {
  const { numero } = req.body;
  const cleanNumero = (numero ?? '').replace(/[\s\-]/g, '');
 
  db.query('SELECT email FROM users WHERE numero = ?', [cleanNumero], async (err, results) => {
    if (err || results.length === 0)
      return res.status(404).json({ error: 'Utilisateur introuvable' });
 
    const code = generateOTP();
    otpStore[cleanNumero] = { code, expiresAt: Date.now() + 10 * 60 * 1000 };
 
    try {
      await sendOTP(results[0].email, code);
      res.json({ ok: true });
    } catch {
      res.status(500).json({ error: "Erreur lors de l'envoi du code." });
    }
  });
});
 
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
      return res.status(500).json({ error: 'Database error' });
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
      return res.status(500).json({ error: 'Erreur base de données' });
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
 
// ─── ENVOYER UN MESSAGE ───────────────────────────────────────────────────────
app.post('/api/messages/send', (req, res) => {
  const { from_numero, to_numero, content } = req.body;
  if (!from_numero || !to_numero || !content?.trim())
    return res.status(400).json({ error: 'Champs manquants' });
 
  db.query('SELECT id FROM users WHERE numero = ?', [to_numero], (err, results) => {
    if (err) return res.status(500).json({ error: 'Erreur base de données' });
    if (results.length === 0)
      return res.status(404).json({ error: 'Destinataire sans compte MTN MoMo Gramm' });
 
    db.query(
      'INSERT INTO messages (from_numero, to_numero, content) VALUES (?, ?, ?)',
      [from_numero, to_numero, content.trim()],
      (err, result) => {
        if (err) return res.status(500).json({ error: 'Erreur envoi message' });
        res.status(201).json({ id: result.insertId, message: 'Message envoyé' });
      }
    );
  });
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
 
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});