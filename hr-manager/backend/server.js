const express = require('express');
const { Pool } = require('pg');

const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  max: 10
});

const wait = ms => new Promise(r => setTimeout(r, ms));

// Wait for the database, and make sure the tables exist
async function initDb() {
  for (let i = 1; i <= 20; i++) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS departments (
          department_id   SERIAL PRIMARY KEY,
          department_name VARCHAR(50) NOT NULL
        )`);
      await pool.query(`
        CREATE TABLE IF NOT EXISTS employees (
          employee_id   SERIAL PRIMARY KEY,
          first_name    VARCHAR(30),
          last_name     VARCHAR(30) NOT NULL,
          email         VARCHAR(50) NOT NULL UNIQUE,
          phone_number  VARCHAR(20),
          hire_date     DATE NOT NULL DEFAULT CURRENT_DATE,
          job_title     VARCHAR(50),
          salary        NUMERIC(10,2) CHECK (salary >= 0),
          department_id INTEGER REFERENCES departments(department_id)
        )`);
      console.log('Database ready');
      return;
    } catch (e) {
      console.log(`Database not ready (${i}/20): ${e.message}`);
      await wait(3000);
    }
  }
  console.error('Could not connect to the database. Exiting.');
  process.exit(1);
}

// ---------- helpers ----------
const text = v => (v === undefined || v === null || String(v).trim() === '' ? null : String(v).trim());
const num = v => (text(v) === null ? null : Number(v));

function sendError(res, e) {
  console.error(e);
  const map = {
    '23505': [409, 'This value already exists (for example the email). Use a different one.'],
    '23503': [409, 'This record is linked to other data (for example a department that still has employees), or the selected department does not exist.'],
    '23502': [400, 'A required field is empty.'],
    '22001': [400, 'One of the values is too long.'],
    '23514': [400, 'A value is not allowed (for example a negative salary).'],
    '22P02': [400, 'A value has the wrong format.'],
    '22007': [400, 'The date is not valid.'],
    '22008': [400, 'The date is not valid.']
  };
  const [status, message] = map[e.code] || [500, 'Server error: ' + e.message];
  res.status(status).json({ error: message });
}

const handle = fn => async (req, res) => {
  try { await fn(req, res); } catch (e) { sendError(res, e); }
};

function readEmployee(b) {
  return {
    first_name: text(b.first_name),
    last_name: text(b.last_name),
    email: text(b.email),
    phone_number: text(b.phone_number),
    hire_date: text(b.hire_date),
    job_title: text(b.job_title),
    salary: num(b.salary),
    department_id: num(b.department_id)
  };
}

function validateEmployee(e) {
  if (!e.last_name) return 'Last name is required.';
  if (!e.email) return 'Email is required.';
  if (!/^[^@\s]+@[^@\s]+$/.test(e.email)) return 'Email is not valid.';
  if (e.salary !== null && (Number.isNaN(e.salary) || e.salary < 0)) return 'Salary must be a positive number.';
  if (e.department_id !== null && Number.isNaN(e.department_id)) return 'Department is not valid.';
  return null;
}

const EMP_SELECT = `
  SELECT e.employee_id, e.first_name, e.last_name, e.email, e.phone_number,
         to_char(e.hire_date, 'YYYY-MM-DD') AS hire_date,
         e.job_title, e.salary, e.department_id, d.department_name
  FROM employees e
  LEFT JOIN departments d ON e.department_id = d.department_id`;

const idOf = req => Number(req.params.id);

// ---------- health ----------
app.get('/api/health', handle(async (req, res) => {
  await pool.query('SELECT 1');
  res.json({ status: 'ok' });
}));

// ---------- departments ----------
app.get('/api/departments', handle(async (req, res) => {
  const r = await pool.query(`
    SELECT d.department_id, d.department_name, count(e.employee_id)::int AS employee_count
    FROM departments d
    LEFT JOIN employees e ON e.department_id = d.department_id
    GROUP BY d.department_id, d.department_name
    ORDER BY d.department_name`);
  res.json(r.rows);
}));

app.post('/api/departments', handle(async (req, res) => {
  const name = text(req.body.department_name);
  if (!name) return res.status(400).json({ error: 'Department name is required.' });
  const r = await pool.query(
    'INSERT INTO departments (department_name) VALUES ($1) RETURNING department_id, department_name', [name]);
  res.status(201).json(r.rows[0]);
}));

app.put('/api/departments/:id', handle(async (req, res) => {
  const name = text(req.body.department_name);
  if (!name) return res.status(400).json({ error: 'Department name is required.' });
  const r = await pool.query(
    'UPDATE departments SET department_name = $1 WHERE department_id = $2 RETURNING department_id, department_name',
    [name, idOf(req)]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'Department not found.' });
  res.json(r.rows[0]);
}));

app.delete('/api/departments/:id', handle(async (req, res) => {
  const r = await pool.query('DELETE FROM departments WHERE department_id = $1', [idOf(req)]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'Department not found.' });
  res.json({ message: 'Deleted.' });
}));

// ---------- employees ----------
app.get('/api/employees', handle(async (req, res) => {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 10, 1), 100);
  const search = '%' + String(req.query.search || '').toLowerCase() + '%';
  const where = `WHERE lower(coalesce(e.first_name, '') || ' ' || e.last_name || ' ' || e.email) LIKE $1`;

  const count = await pool.query(`SELECT count(*) AS total FROM employees e ${where}`, [search]);
  const total = Number(count.rows[0].total);

  const data = await pool.query(
    `${EMP_SELECT} ${where} ORDER BY e.employee_id LIMIT $2 OFFSET $3`,
    [search, pageSize, (page - 1) * pageSize]);

  res.json({
    data: data.rows, total, page, pageSize,
    totalPages: Math.max(Math.ceil(total / pageSize), 1)
  });
}));

app.get('/api/employees/:id', handle(async (req, res) => {
  const r = await pool.query(`${EMP_SELECT} WHERE e.employee_id = $1`, [idOf(req)]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'Employee not found.' });
  res.json(r.rows[0]);
}));

app.post('/api/employees', handle(async (req, res) => {
  const e = readEmployee(req.body);
  const problem = validateEmployee(e);
  if (problem) return res.status(400).json({ error: problem });
  const r = await pool.query(
    `INSERT INTO employees
       (first_name, last_name, email, phone_number, hire_date, job_title, salary, department_id)
     VALUES ($1, $2, $3, $4, COALESCE($5::date, CURRENT_DATE), $6, $7, $8)
     RETURNING employee_id`,
    [e.first_name, e.last_name, e.email, e.phone_number, e.hire_date, e.job_title, e.salary, e.department_id]);
  res.status(201).json({ message: 'Employee added.', employee_id: r.rows[0].employee_id });
}));

app.put('/api/employees/:id', handle(async (req, res) => {
  const e = readEmployee(req.body);
  const problem = validateEmployee(e);
  if (problem) return res.status(400).json({ error: problem });
  const r = await pool.query(
    `UPDATE employees SET
       first_name = $1, last_name = $2, email = $3, phone_number = $4,
       hire_date = COALESCE($5::date, hire_date), job_title = $6, salary = $7, department_id = $8
     WHERE employee_id = $9`,
    [e.first_name, e.last_name, e.email, e.phone_number, e.hire_date, e.job_title, e.salary, e.department_id, idOf(req)]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'Employee not found.' });
  res.json({ message: 'Employee updated.' });
}));

app.delete('/api/employees/:id', handle(async (req, res) => {
  const r = await pool.query('DELETE FROM employees WHERE employee_id = $1', [idOf(req)]);
  if (r.rowCount === 0) return res.status(404).json({ error: 'Employee not found.' });
  res.json({ message: 'Employee deleted.' });
}));

initDb().then(() => app.listen(3000, () => console.log('Backend running on port 3000')));
