require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db');

// Roda o schema.sql contra o banco configurado no .env.
// Uso: npm run db:migrate
async function migrate() {
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  try {
    await pool.query(sql);
    console.log('Schema aplicado com sucesso.');
  } catch (err) {
    console.error('Falha ao aplicar schema:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrate();
