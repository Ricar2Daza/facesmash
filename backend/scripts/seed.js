import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';
import { run, initDb } from '../src/db/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadsDir = path.join(__dirname, '../src/uploads');

async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function cleanUploads() {
  console.log('Cleaning uploads directory...');
  try {
    const files = await fs.readdir(uploadsDir);
    for (const file of files) {
      if (file !== '.gitkeep') {
        await fs.unlink(path.join(uploadsDir, file));
      }
    }
  } catch (err) {
    console.log('Uploads directory might not exist yet, skipping clean.');
  }
}

async function downloadImage(url, filepath) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(filepath, buffer);
  return filepath;
}

async function seed() {
  console.log('Initializing DB...');
  await initDb();
  await ensureDir(uploadsDir);
  await cleanUploads();

  // Clear existing data
  console.log('Clearing existing database records...');
  await run('DELETE FROM faces');
  await run('DELETE FROM votes');
  await run('DELETE FROM reports');
  await run('DELETE FROM users');

  // Create a default user
  const hashedPassword = await bcrypt.hash('password123', 10);
  const userResult = await run(
    'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
    ['testuser', 'test@example.com', hashedPassword]
  );
  const userId = userResult.id;
  console.log('Created test user: testuser / password123');

  const faces = [];
  
  // 30 Male AI
  for (let i = 0; i < 30; i++) {
    faces.push({ type: 'AI', name: `AI Male ${i+1}`, url: `https://randomuser.me/api/portraits/men/${i+1}.jpg`, gender: 'male' });
  }
  // 30 Female AI
  for (let i = 0; i < 30; i++) {
    faces.push({ type: 'AI', name: `AI Female ${i+1}`, url: `https://randomuser.me/api/portraits/women/${i+1}.jpg`, gender: 'female' });
  }
  // 15 Male Real
  for (let i = 0; i < 15; i++) {
    faces.push({ type: 'REAL', name: `Real Male ${i+1}`, url: `https://randomuser.me/api/portraits/men/${i+50}.jpg`, gender: 'male' });
  }
  // 15 Female Real
  for (let i = 0; i < 15; i++) {
    faces.push({ type: 'REAL', name: `Real Female ${i+1}`, url: `https://randomuser.me/api/portraits/women/${i+50}.jpg`, gender: 'female' });
  }

  console.log(`Downloading ${faces.length} face images...`);

  for (const face of faces) {
    const filename = `seed_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const filepath = path.join(uploadsDir, filename);
    
    try {
      await downloadImage(face.url, filepath);
      
      const imagePath = `/uploads/${filename}`;
      const revocationToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = crypto.createHash('sha256').update(revocationToken).digest('hex');

      await run(
        `INSERT INTO faces (
           type, image_path, display_name, gender, is_ai_generated, 
           uploader_id, consent_given, is_public, revocation_token_hash
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          face.type,
          imagePath,
          face.name,
          face.gender,
          face.type === 'AI' ? 1 : 0,
          face.type === 'REAL' ? userId : null, // Link real faces to test user
          1, // consent_given
          1, // is_public
          tokenHash
        ]
      );
      // console.log(`Created ${face.type} (${face.gender}): ${face.name}`);
      process.stdout.write('.');
    } catch (err) {
      console.error(`\nFailed to process ${face.name}:`, err.message);
    }
  }

  console.log('\nSeeding complete!');
}

seed().catch(console.error);
