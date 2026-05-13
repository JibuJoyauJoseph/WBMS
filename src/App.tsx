import React, { useEffect, useState } from "react";
import { format } from "date-fns";
import { Droplet, Users, FileText, CheckCircle, LayoutDashboard, Plus, Trash2, DollarSign } from "lucide-react";

type Tab = "dashboard" | "customers" | "bills";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-900 text-white flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-blue-800">
          <Droplet className="text-blue-400" />
          <h1 className="text-xl font-bold">AquaManage</h1>
        </div>
        <nav className="flex-1 py-6 px-4 space-y-2">
          <NavItem 
            icon={<LayoutDashboard size={20} />} 
            label="Dashboard" 
            isActive={activeTab === "dashboard"} 
            onClick={() => setActiveTab("dashboard")} 
          />
          <NavItem 
            icon={<Users size={20} />} 
            label="Customers" 
            isActive={activeTab === "customers"} 
            onClick={() => setActiveTab("customers")} 
          />
          <NavItem 
            icon={<FileText size={20} />} 
            label="Billing" 
            isActive={activeTab === "bills"} 
            onClick={() => setActiveTab("bills")} 
          />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b px-8 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-semibold capitalize">{activeTab}</h2>
        </header>
        <div className="flex-1 overflow-auto p-8">
          {activeTab === "dashboard" && <DashboardTab />}
          {activeTab === "customers" && <CustomersTab />}
          {activeTab === "bills" && <BillsTab />}
        </div>
      </main>
    </div>
  );
}

// -- Components --

function NavItem({ icon, label, isActive, onClick }: { icon: React.ReactNode; label: string; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
        isActive ? "bg-blue-800 text-white" : "text-blue-100 hover:bg-blue-800/50"
      }`}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

// -- Dashboard --
function DashboardTab() {
  const [stats, setStats] = useState({ totalCustomers: 0, unpaidBills: 0, revenue: 0 });

  useEffect(() => {
    fetch("/api/dashboard").then(res => res.json()).then(data => {
      if (!data.error) {
        setStats({
          totalCustomers: data.totalCustomers || 0,
          unpaidBills: data.unpaidBills || 0,
          revenue: data.revenue || 0
        });
      }
    }).catch(console.error);
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard icon={<Users className="text-blue-600" size={24} />} bg="bg-blue-100" label="Total Customers" value={stats.totalCustomers} />
      <StatCard icon={<FileText className="text-orange-600" size={24} />} bg="bg-orange-100" label="Unpaid Bills" value={stats.unpaidBills} />
      <StatCard icon={<DollarSign className="text-green-600" size={24} />} bg="bg-green-100" label="Total Revenue" value={`$${Number(stats.revenue || 0).toFixed(2)}`} />
    </div>
  );
}

function StatCard({ icon, bg, label, value }: { icon: React.ReactNode, bg: string, label: string, value: string | number }) {
  return (
    <div className="bg-white p-6 rounded-xl border shadow-sm flex items-center gap-4">
      <div className={`p-4 rounded-full ${bg}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

// -- Customers --
function CustomersTab() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const loadCustomers = () => fetch("/api/customers").then(res => res.json()).then(data => {
    if (Array.isArray(data)) setCustomers(data);
  }).catch(console.error);

  useEffect(() => { loadCustomers(); }, []);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure? This will delete all their bills too.")) return;
    await fetch(`/api/customers/${id}`, { method: 'DELETE' });
    loadCustomers();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
          {showForm ? "Cancel" : <><Plus size={18} /> Add Customer</>}
        </button>
      </div>

      {showForm && <CustomerForm onSuccess={() => { setShowForm(false); loadCustomers(); }} />}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 font-medium text-gray-500">ID</th>
              <th className="p-4 font-medium text-gray-500">Name</th>
              <th className="p-4 font-medium text-gray-500">Address</th>
              <th className="p-4 font-medium text-gray-500">Meter Number</th>
              <th className="p-4 font-medium text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {customers.map(c => (
              <tr key={c.id} className="hover:bg-gray-50/50">
                <td className="p-4 text-gray-500">#{c.id}</td>
                <td className="p-4 font-medium">{c.current_name}</td>
                <td className="p-4">{c.address}</td>
                <td className="p-4 font-mono text-sm">{c.meter_number}</td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDelete(c.id)} className="text-red-500 hover:text-red-700 p-2">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-gray-500">No customers found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CustomerForm({ onSuccess }: { onSuccess: () => void }) {
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    const res = await fetch("/api/customers", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
    });
    if (res.ok) onSuccess();
    else alert("Failed to add customer. Meter number might be a duplicate.");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
        <input required name="current_name" className="w-full border rounded-lg p-2 focus:ring focus:ring-blue-200 outline-none" placeholder="John Doe" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <input required name="address" className="w-full border rounded-lg p-2 focus:ring focus:ring-blue-200 outline-none" placeholder="123 Main St" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Meter Number</label>
        <input required name="meter_number" className="w-full border rounded-lg p-2 focus:ring focus:ring-blue-200 outline-none" placeholder="MTR-1001" />
      </div>
      <div className="md:col-span-3 flex justify-end">
        <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800">Save Customer</button>
      </div>
    </form>
  );
}

// -- Bills --
function BillsTab() {
  const [bills, setBills] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);

  const loadBills = () => fetch("/api/bills").then(res => res.json()).then(data => {
    if (Array.isArray(data)) setBills(data);
  }).catch(console.error);

  useEffect(() => { loadBills(); }, []);

  const handlePay = async (id: number) => {
    if (!confirm("Mark this bill as paid?")) return;
    await fetch(`/api/bills/${id}/pay`, { method: 'POST' });
    loadBills();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button onClick={() => setShowForm(!showForm)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
          {showForm ? "Cancel" : <><Plus size={18} /> Generate Bill</>}
        </button>
      </div>

      {showForm && <BillForm onSuccess={() => { setShowForm(false); loadBills(); }} />}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 font-medium text-gray-500">Bill ID</th>
              <th className="p-4 font-medium text-gray-500">Customer</th>
              <th className="p-4 font-medium text-gray-500">Consumption</th>
              <th className="p-4 font-medium text-gray-500">Amount</th>
              <th className="p-4 font-medium text-gray-500">Due Date</th>
              <th className="p-4 font-medium text-gray-500">Status</th>
              <th className="p-4 font-medium text-gray-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {bills.map(b => (
              <tr key={b.id} className="hover:bg-gray-50/50">
                <td className="p-4 text-gray-500 font-mono text-sm">BIL-{b.id}</td>
                <td className="p-4">
                  <div className="font-medium">{b.current_name}</div>
                  <div className="text-xs text-gray-500">{b.meter_number}</div>
                </td>
                <td className="p-4">
                  <div className="font-medium">{b.units_consumed} units</div>
                  <div className="text-xs text-gray-500">Rate: ${b.rate_per_unit}</div>
                </td>
                <td className="p-4 font-bold text-gray-900">${Number(b.total_amount).toFixed(2)}</td>
                <td className="p-4">{format(new Date(b.due_date), "MMM d, yyyy")}</td>
                <td className="p-4">
                  {b.status === "Paid" ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <CheckCircle size={14} /> Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      Unpaid
                    </span>
                  )}
                </td>
                <td className="p-4 text-right">
                  {b.status === "Unpaid" && (
                    <button onClick={() => handlePay(b.id)} className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700">
                      Mark Paid
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {bills.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500">No bills generated yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillForm({ onSuccess }: { onSuccess: () => void }) {
  const [customers, setCustomers] = useState<any[]>([]);
  useEffect(() => { fetch("/api/customers").then(res => res.json()).then(setCustomers); }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data = Object.fromEntries(fd.entries());
    const res = await fetch("/api/bills", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data)
    });
    if (res.ok) onSuccess();
    else alert("Failed to generate bill. Ensure current reading >= previous reading.");
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border shadow-sm grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="lg:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
        <select required name="customer_id" className="w-full border rounded-lg p-2 focus:ring focus:ring-blue-200 outline-none bg-white">
          <option value="">Select Customer...</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.current_name} ({c.meter_number})</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Previous Reading</label>
        <input required type="number" step="0.01" name="previous_reading" className="w-full border rounded-lg p-2 focus:ring focus:ring-blue-200 outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Current Reading</label>
        <input required type="number" step="0.01" name="current_reading" className="w-full border rounded-lg p-2 focus:ring focus:ring-blue-200 outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Rate per Unit ($)</label>
        <input required type="number" step="0.01" defaultValue="1.50" name="rate_per_unit" className="w-full border rounded-lg p-2 focus:ring focus:ring-blue-200 outline-none" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Billing Date</label>
        <input required type="date" defaultValue={new Date().toISOString().split('T')[0]} name="billing_date" className="w-full border rounded-lg p-2 focus:ring focus:ring-blue-200 outline-none" />
      </div>
      <div className="lg:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
        <input required type="date" name="due_date" className="w-full border rounded-lg p-2 focus:ring focus:ring-blue-200 outline-none" />
      </div>
      <div className="lg:col-span-4 flex justify-end mt-2">
        <button type="submit" className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800">Generate Bill</button>
      </div>
    </form>
  );
}
