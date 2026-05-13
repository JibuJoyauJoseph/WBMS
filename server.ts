import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { pool, initDb } from "./src/db/index";
import 'dotenv/config';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Initialize MySQL database
  await initDb();

  app.use(express.json());

  // -- Observer Design Pattern for Notifications --
class BillingSubject {
  private observers: any[] = [];
  subscribe(observer: any) { this.observers.push(observer); }
  unsubscribe(observer: any) { this.observers = this.observers.filter(o => o !== observer); }
  notify(bill: any) { this.observers.forEach(o => o.update(bill)); }
}

class EmailNotifier { update(bill: any) { console.log(`[EmailNotifier] Sending bill email for customer ${bill.customer_id} (Amount: $${bill.total_amount})`); } }
class SMSNotifier { update(bill: any) { console.log(`[SMSNotifier] Sending bill SMS alert for customer ${bill.customer_id} (Amount: $${bill.total_amount})`); } }
class AuditLogger { update(bill: any) { console.log(`[AuditLogger] Audit trail logged for bill ${bill.id}`); } }

class BillingEngine extends BillingSubject {
  async generateBill(billData: any) {
    const { customer_id, previous_reading, current_reading, rate_per_unit, billing_date, due_date } = billData;
    const units_consumed = Number(current_reading) - Number(previous_reading);
    if (units_consumed < 0) throw new Error("Current reading cannot be lower than previous reading.");
    const total_amount = units_consumed * Number(rate_per_unit);

    const [result] = await pool.query<any>(`
      INSERT INTO bills 
      (customer_id, previous_reading, current_reading, units_consumed, rate_per_unit, total_amount, billing_date, due_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Unpaid')
    `, [customer_id, previous_reading, current_reading, units_consumed, rate_per_unit, total_amount, billing_date, due_date]);
    
    const generatedBill = { id: result.insertId, total_amount, units_consumed, customer_id };
    
    // Notify all subscribed observers (Email, SMS, Audit logger)
    this.notify(generatedBill);
    
    return generatedBill;
  }
}

// Initialize Billing Engine and Observers
const billingEngine = new BillingEngine();
billingEngine.subscribe(new EmailNotifier());
billingEngine.subscribe(new SMSNotifier());
billingEngine.subscribe(new AuditLogger());

  // API Routes
  app.get("/api/dashboard", async (req, res) => {
    try {
      const [rows] = await pool.query<any[]>(`
        SELECT 
          (SELECT COUNT(*) FROM customers) as totalCustomers,
          (SELECT COUNT(*) FROM bills WHERE status = 'Unpaid') as unpaidBills,
          (SELECT COALESCE(SUM(total_amount), 0) FROM bills WHERE status = 'Paid') as revenue
      `);
      res.json(rows[0]);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Customers
  app.get("/api/customers", async (req, res) => {
    try {
      const [customers] = await pool.query("SELECT * FROM customers ORDER BY current_name ASC");
      res.json(customers);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const { current_name, address, meter_number } = req.body;
      const [result] = await pool.query<any>("INSERT INTO customers (current_name, address, meter_number) VALUES (?, ?, ?)", [current_name, address, meter_number]);
      res.json({ id: result.insertId, current_name, address, meter_number });
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      // ON DELETE CASCADE takes care of bills in MySQL
      await pool.query("DELETE FROM customers WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  });

  // Bills
  app.get("/api/bills", async (req, res) => {
    try {
      const [bills] = await pool.query(`
        SELECT bills.*, customers.current_name, customers.meter_number 
        FROM bills 
        JOIN customers ON bills.customer_id = customers.id 
        ORDER BY bills.id DESC
      `);
      res.json(bills);
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  app.post("/api/bills", async (req, res) => {
    try {
      // Uses the Observer Pattern implemented via BillingEngine
      const generatedBill = await billingEngine.generateBill(req.body);
      res.json(generatedBill);
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  });

  app.post("/api/bills/:id/pay", async (req, res) => {
    try {
      await pool.query("UPDATE bills SET status = 'Paid' WHERE id = ?", [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: String(error) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
