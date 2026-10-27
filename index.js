const express = require('express');
const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

require('dotenv').config();

// Fallback: kredensial disimpan di .env.txt (bukan .env), sehingga dotenv default tidak pernah membacanya.
function loadEnvFallback() {
  const hasCreds = process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY;
  if (hasCreds) return;

  const candidates = [
    path.join(process.cwd(), '.env.txt'),
    path.join(__dirname, '..', '.env.txt'),
  ];
  const file = candidates.find(candidate => fs.existsSync(candidate));
  if (file) require('dotenv').config({ path: file });
}

loadEnvFallback();

const app = express();
app.use(express.json());

function getDb() {
  if (!admin.apps.length) {
    const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } = process.env;
    if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
      throw new Error('Firebase Admin credentials are not configured (FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY).');
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
  }

  return admin.firestore();
}

// Middleware untuk menyajikan file statis dari folder 'public' (agar index.html bisa diakses di root '/')
app.use(express.static(path.join(__dirname, '../public')));

// Route Contoh: Mengambil Daftar Konten dari Firestore
app.get('/api/posts', async (req, res) => {
  try {
    const snapshot = await getDb().collection('posts').orderBy('createdAt', 'desc').get();
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(posts);
  } catch (error) {
    console.error('Gagal mengambil posts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route Contoh: Menambah Konten Baru
app.post('/api/posts', async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Judul dan konten wajib diisi.' });
    }
    const newPost = { title, content, createdAt: new Date().toISOString() };
    const docRef = await getDb().collection('posts').add(newPost);
    res.status(201).json({ id: docRef.id, ...newPost });
  } catch (error) {
    console.error('Gagal menyimpan post:', error);
    res.status(500).json({ error: error.message });
  }
});

// Export untuk Vercel Serverless Function
module.exports = app;

// Jalankan server lokal jika tidak di Vercel
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server CMS berjalan di http://localhost:${PORT}`);
  });
}