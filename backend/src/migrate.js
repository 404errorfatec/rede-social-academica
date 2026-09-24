require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db');

// Roda o schema.sql contra o banco configurado no .env.
// Uso: npm run db:migrate
async function migrate() {
  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const idxsPath = path.join(__dirname, '..', 'db', 'idxs.sql');
  
  const sql_schema = fs.readFileSync(schemaPath, 'utf8');
  const sql_idxs = fs.readFileSync(idxsPath, 'utf8');

  try {
    await pool.query(sql_schema);
    await pool.query(sql_idxs);
    
    console.log('DataBase Init Sucessful...');
  } catch (err) {
    console.error('Fail[Init DataBase]:', err.message);
    process.exitCode = 1;
  } finally { await pool.end(); }
}

migrate();
