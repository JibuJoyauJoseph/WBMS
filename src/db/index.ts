import mysql from 'mysql2/promise';

export const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'waterbilling',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function initDb() {
  try {
    // Initial connection to create the DB if it doesn't exist
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || '127.0.0.1',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'waterbilling'}\`;`);
    await connection.query(`USE \`${process.env.DB_NAME || 'waterbilling'}\`;`);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        current_name VARCHAR(255) NOT NULL,
        address TEXT NOT NULL,
        meter_number VARCHAR(100) UNIQUE NOT NULL
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS bills (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        previous_reading DECIMAL(10,2) NOT NULL,
        current_reading DECIMAL(10,2) NOT NULL,
        units_consumed DECIMAL(10,2) NOT NULL,
        rate_per_unit DECIMAL(10,2) NOT NULL,
        total_amount DECIMAL(10,2) NOT NULL,
        billing_date DATE NOT NULL,
        due_date DATE NOT NULL,
        status ENUM('Unpaid', 'Paid') DEFAULT 'Unpaid',
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      );
    `);

    await connection.end();
    console.log("MySQL Database & tables initialized successfully.");
  } catch (error) {
    console.error("MySQL Database initialization failed (is it running?):", String(error));
  }
}
