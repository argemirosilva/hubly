import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL || '';
const m = url.match(/mysql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);
if (!m) { console.log('No DB URL'); process.exit(1); }
const [,user,pass,host,port,db] = m;

const conn = await mysql.createConnection({
  host, port: parseInt(port), user, password: pass, database: db,
  ssl: { rejectUnauthorized: false }
});

const [rows] = await conn.execute('DESCRIBE agendamento_itens');
rows.forEach(r => console.log(r.Field, r.Type, r.Null, r.Default));
conn.end();
