const express = require('express');
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

// Inisialisasi Firebase Admin SDK menggunakan FIREBASE_SERVICE_ACCOUNT
if (!admin.apps.length) {
  let serviceAccount;
  try {
    // Mem-parsing string JSON dari environment variable FIREBASE_SERVICE_ACCOUNT
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (error) {
    console.error("Gagal mem-parsing FIREBASE_SERVICE_ACCOUNT:", error.message);
  }

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

// Middleware untuk menyajikan file statis dari folder 'public'
app.use(express.static(path.join(__dirname, '../public')));

// Route Contoh: Mengambil Daftar Konten dari Firestore
app.get('/api/posts', async (req, res) => {
  try {
    const snapshot = await db.collection('posts').orderBy('createdAt', 'desc').get();
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Route Contoh: Menambah Konten Baru
app.post('/api/posts', async (req, res) => {
  try {
    const { title, content } = req.body;
    const newPost = { title, content, createdAt: new Date().toISOString() };
    const docRef = await db.collection('posts').add(newPost);
    res.status(201).json({ id: docRef.id, ...newPost });
  } catch (error) {
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
