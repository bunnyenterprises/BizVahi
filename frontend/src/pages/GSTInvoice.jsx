import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useLang } from "@/context/LangContext";
import { Plus, Trash, Printer, WhatsappLogo, X, GearSix, ArrowLeft } from "@phosphor-icons/react";

const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ["pcs", "kg", "g", "litre", "ml", "box", "dozen", "metre", "set", "pair"];
const EMPTY_ITEM = { name: "", hsn: "", qty: 1, unit: "pcs", rate: "", gst_rate: 18 };

const fmt = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function GSTInvoice() {
  const { t } = useLang();
  const [settings, setSettings] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preview, setPreview] = useState(null);

  // Settings form
  const [sForm, setSForm] = useState({ business_name: "", address: "", gstin: "", phone: "", email: "", state: "", bank_name: "", account_no: "", ifsc: "", upi_id: "", logo_url: "" });

  // Invoice form
  const [buyerName, setBuyerName] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [buyerGstin, setBuyerGstin] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [invDate, setInvDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [isIgst, setIsIgst] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [items, setItems] = useState([{ ...EMPTY_ITEM }]);

  useEffect(() => {
    Promise.all([
      api.get("/business/settings"),
      api.get("/business/invoices"),
      api.get("/business/inventory"),
    ]).then(([s, inv, stock]) => {
      const sd = s.data || {};
      setSettings(sd);
      setSForm({ business_name: sd.business_name || "", address: sd.address || "", gstin: sd.gstin || "", phone: sd.phone || "", email: sd.email || "", state: sd.state || "", bank_name: sd.bank_name || "", account_no: sd.account_no || "", ifsc: sd.ifsc || "", upi_id: sd.upi_id || "", logo_url: sd.logo_url || "" });
      setInvoices(inv.data || []);
      setInventory(stock.data || []);
      if (!sd.business_name) setShowSettings(true);
    }).finally(() => setLoading(false));
  }, []);

  const saveSettings = async () => {
    try {
      const { data } = await api.put("/business/settings", sForm);
      setSettings(data);
      toast.success("Business details saved");
      setShowSettings(false);
    } catch { toast.error("Failed to save settings"); }
  };

  const addItem = () => setItems([...items, { ...EMPTY_ITEM }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i, field, val) => {
    const updated = [...items];
    updated[i] = { ...updated[i], [field]: val };

    // Stock auto-fill: typing a product name that matches Inventory fills HSN, Rate, GST% automatically
    if (field === "name") {
      const match = inventory.find(
        (p) => p.product_name?.toLowerCase() === val.toLowerCase()
      );
      if (match) {
        updated[i].hsn = match.hsn_code || updated[i].hsn;
        updated[i].rate = match.selling_price || updated[i].rate;
        updated[i].gst_rate = match.gst_rate ?? updated[i].gst_rate;
        updated[i].unit = match.unit || updated[i].unit;
      }
    }

    setItems(updated);
  };

  // Business logo upload — resizes to a small width client-side before saving as base64,
  // keeping the settings document small and the upload fast on a slow mobile connection.
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please choose an image file"); return; }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const maxW = 240;
        const scale = Math.min(1, maxW / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const resized = canvas.toDataURL("image/png", 0.85);
        setSForm((f) => ({ ...f, logo_url: resized }));
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  };

  const calcTotals = (itemList, discPct, igst) => {
    const subtotal = itemList.reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.rate) || 0), 0);
    const discAmt = subtotal * (Number(discPct) || 0) / 100;
    const taxable = subtotal - discAmt;
    const taxByCat = {};
    itemList.forEach(item => {
      const gst = Number(item.gst_rate) || 0;
      if (gst === 0) return;
      const itemTax = (Number(item.qty) || 0) * (Number(item.rate) || 0) * gst / 100;
      if (igst) {
        const key = `IGST ${gst}%`;
        taxByCat[key] = (taxByCat[key] || 0) + itemTax;
      } else {
        const half = itemTax / 2;
        const ck = `CGST ${gst / 2}%`; taxByCat[ck] = (taxByCat[ck] || 0) + half;
        const sk = `SGST ${gst / 2}%`; taxByCat[sk] = (taxByCat[sk] || 0) + half;
      }
    });
    const totalTax = Object.values(taxByCat).reduce((s, v) => s + v, 0);
    const grand = taxable + totalTax;
    return { subtotal, discAmt, taxable, taxByCat, totalTax, grand };
  };

  const totals = calcTotals(items, discount, isIgst);

  const createInvoice = async () => {
    if (!buyerName) { toast.error("Enter buyer name"); return; }
    if (!items[0].name || !items[0].rate) { toast.error(t("errorMsg")); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/business/invoices", {
        buyer_name: buyerName, buyer_address: buyerAddress, buyer_gstin: buyerGstin, buyer_phone: buyerPhone,
        items: items.filter(i => i.name && i.rate).map(i => ({ ...i, qty: Number(i.qty), rate: Number(i.rate), gst_rate: Number(i.gst_rate) })),
        date: invDate, due_date: dueDate, notes, is_igst: isIgst, discount_percent: Number(discount),
      });
      setInvoices([data, ...invoices]);
      setPreview(data);
      toast.success(`Invoice ${data.invoice_no} created`);
      setShowForm(false);
    } catch (e) { toast.error("Something went wrong. Try again."); }
    finally { setSaving(false); }
  };

  const deleteInvoice = async (inv) => {
    if (!window.confirm(`Delete invoice ${inv.invoice_no}?`)) return;
    await api.delete(`/business/invoices/${inv.id}`);
    setInvoices(invoices.filter(i => i.id !== inv.id));
    if (preview?.id === inv.id) setPreview(null);
    toast.success("Deleted");
  };

  const printInvoice = () => window.print();

  const shareWhatsApp = (inv) => {
    const text = `*Invoice ${inv.invoice_no}*\nFrom: ${inv.seller?.name}\nTo: ${inv.buyer?.name}\nDate: ${inv.date}\nTotal: ₹${fmt(inv.grand_total)}\n\nThank you for your business!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  if (loading) return <div className="min-h-screen"><Header /><div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div></div>;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 dark:text-white">
      <Header />

      {/* Print CSS — hides everything except the invoice */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { margin: 0; }
          .invoice-sheet { box-shadow: none !important; border: none !important; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>

      <main className="max-w-5xl mx-auto px-4 py-8 no-print" data-testid="gst-invoice-page">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-xs font-bold tracking-wide uppercase text-teal-600 mb-1">GST INVOICES</div>
            <h1 className="text-3xl font-black tracking-tighter">{t("gstInvoice")}</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-2 border border-foreground/20 px-3 py-2 text-sm hover:bg-secondary">
              <GearSix size={15} /> Business Info
            </button>
            <button onClick={() => { setShowForm(!showForm); setPreview(null); }} className="flex items-center gap-2 bg-black text-white px-4 py-2 text-sm font-medium hover:bg-gray-800">
              <Plus size={15} weight="bold" /> New Invoice
            </button>
          </div>
        </div>

        {/* Business Settings */}
        {showSettings && (
          <div className="border border-foreground/15 p-5 mb-6 bg-secondary/30" data-testid="biz-settings-form">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold">Your Business Details</div>
              <button onClick={() => setShowSettings(false)}><X size={18} /></button>
            </div>
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-foreground/10">
              <div className="w-16 h-16 border border-foreground/20 bg-white flex items-center justify-center overflow-hidden shrink-0">
                {sForm.logo_url
                  ? <img src={sForm.logo_url} alt="Business logo" className="w-full h-full object-contain" />
                  : <span className="text-[10px] text-muted-foreground text-center px-1">No logo</span>}
              </div>
              <div>
                <label className="inline-block cursor-pointer bg-secondary border border-foreground/20 px-3 py-1.5 text-xs font-medium hover:bg-foreground/10">
                  Upload Logo
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                </label>
                {sForm.logo_url && (
                  <button onClick={() => setSForm(f => ({ ...f, logo_url: "" }))} className="ml-2 text-xs text-red-500 hover:underline">Remove</button>
                )}
                <div className="text-[10px] text-muted-foreground mt-1">Shows at the top of every printed invoice</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {[
                ["Business Name *", "business_name", "text", "ABC Traders"],
                ["GSTIN", "gstin", "text", "22AAAAA0000A1Z5"],
                ["Phone", "phone", "text", "+91 98765 43210"],
                ["Email", "email", "email", "abc@gmail.com"],
                ["State", "state", "text", "Maharashtra"],
                ["UPI ID", "upi_id", "text", "abc@upi"],
                ["Bank Name", "bank_name", "text", "SBI"],
                ["Account No", "account_no", "text", ""],
                ["IFSC", "ifsc", "text", "SBIN0000001"],
              ].map(([label, key, type, placeholder]) => (
                <div key={key}>
                  <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                  <input type={type} className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                    placeholder={placeholder} value={sForm[key]} onChange={e => setSForm({ ...sForm, [key]: e.target.value })} />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">Address</label>
                <textarea rows={2} className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900"
                  placeholder="Shop/office address" value={sForm.address} onChange={e => setSForm({ ...sForm, address: e.target.value })} />
              </div>
            </div>
            <button onClick={saveSettings} className="bg-black text-white px-6 py-2.5 text-sm font-medium hover:bg-gray-800">Save Details</button>
          </div>
        )}

        {/* Create Invoice Form */}
        {showForm && (
          <div className="border border-foreground/15 p-5 mb-6 bg-secondary/30" data-testid="invoice-form">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold">New Invoice</div>
              <button onClick={() => setShowForm(false)}><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div><label className="text-xs text-muted-foreground block mb-1">Invoice Date</label>
                <input type="date" className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900" value={invDate} onChange={e => setInvDate(e.target.value)} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Due Date</label>
                <input type="date" className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              <div><label className="text-xs text-muted-foreground block mb-1">Buyer Name *</label>
                <input className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900" placeholder="Customer / company name" value={buyerName} onChange={e => setBuyerName(e.target.value)} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Buyer Phone</label>
                <input className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900" placeholder="+91 98765 43210" value={buyerPhone} onChange={e => setBuyerPhone(e.target.value)} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Buyer GSTIN</label>
                <input className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900" placeholder="22AAAAA0000A1Z5" value={buyerGstin} onChange={e => setBuyerGstin(e.target.value)} /></div>
              <div><label className="text-xs text-muted-foreground block mb-1">Buyer Address</label>
                <input className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900" placeholder="City, State" value={buyerAddress} onChange={e => setBuyerAddress(e.target.value)} /></div>
            </div>

            {/* Items */}
            <div className="mb-3">
              <label className="text-xs text-muted-foreground block mb-2">Items *</label>
              <datalist id="stock-item-list">
                {inventory.map(p => (
                  <option key={p.id} value={p.product_name} />
                ))}
              </datalist>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-1.5 mb-2">
                  <input className="col-span-4 border border-foreground/20 p-1.5 text-xs bg-white dark:bg-gray-900" placeholder="Item name" value={item.name} onChange={e => updateItem(idx, "name", e.target.value)} list="stock-item-list" />
                  <input className="col-span-2 border border-foreground/20 p-1.5 text-xs bg-white dark:bg-gray-900" placeholder="HSN" value={item.hsn} onChange={e => updateItem(idx, "hsn", e.target.value)} />
                  <input type="number" className="col-span-1 border border-foreground/20 p-1.5 text-xs bg-white dark:bg-gray-900" placeholder="Qty" value={item.qty} onChange={e => updateItem(idx, "qty", e.target.value)} />
                  <input type="number" className="col-span-2 border border-foreground/20 p-1.5 text-xs bg-white dark:bg-gray-900" placeholder="₹ Rate" value={item.rate} onChange={e => updateItem(idx, "rate", e.target.value)} />
                  <select className="col-span-2 border border-foreground/20 p-1.5 text-xs bg-white dark:bg-gray-900" value={item.gst_rate} onChange={e => updateItem(idx, "gst_rate", e.target.value)}>
                    {GST_RATES.map(r => <option key={r} value={r}>GST {r}%</option>)}
                  </select>
                  <button onClick={() => items.length > 1 && removeItem(idx)} className="col-span-1 text-red-500 flex items-center justify-center"><X size={14} /></button>
                </div>
              ))}
              <button onClick={addItem} className="text-xs underline text-teal-600 mt-1">+ Add item</button>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="igst" checked={isIgst} onChange={e => setIsIgst(e.target.checked)} />
                <label htmlFor="igst" className="text-sm">Inter-state (IGST instead of CGST+SGST)</label>
              </div>
              <div><label className="text-xs text-muted-foreground block mb-1">Discount %</label>
                <input type="number" min={0} max={100} className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900" value={discount} onChange={e => setDiscount(e.target.value)} /></div>
            </div>

            {/* Live totals */}
            <div className="bg-black text-white p-3 mb-4 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>₹{fmt(totals.subtotal)}</span></div>
              {totals.discAmt > 0 && <div className="flex justify-between text-yellow-300"><span>Discount ({discount}%)</span><span>-₹{fmt(totals.discAmt)}</span></div>}
              {Object.entries(totals.taxByCat).map(([label, amt]) => (
                <div key={label} className="flex justify-between text-gray-300"><span>{label}</span><span>₹{fmt(amt)}</span></div>
              ))}
              <div className="flex justify-between font-black text-lg mt-2 pt-2 border-t border-white/30"><span>TOTAL</span><span>₹{fmt(totals.grand)}</span></div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-muted-foreground block mb-1">Notes</label>
              <input className="w-full border border-foreground/20 p-2 text-sm bg-white dark:bg-gray-900" placeholder="Thank you for your business!" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>

            <button onClick={createInvoice} disabled={saving} data-testid="create-invoice-btn"
              className="w-full bg-black text-white py-2.5 text-sm font-bold hover:bg-gray-800 disabled:opacity-50">
              {saving ? "Creating…" : `Create Invoice — ₹${fmt(totals.grand)}`}
            </button>
          </div>
        )}

        {/* Invoice list + preview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="text-xs font-bold tracking-wide uppercase text-muted-foreground mb-3">INVOICES</div>
            {invoices.length === 0 ? (
              <div className="text-sm text-muted-foreground py-4">{t("noRecordsYet")}</div>
            ) : (
              <div className="border border-foreground/15 divide-y divide-foreground/10">
                {invoices.map(inv => (
                  <div key={inv.id} className={`p-3 cursor-pointer hover:bg-secondary transition-colors ${preview?.id === inv.id ? "bg-secondary" : ""}`}
                    onClick={() => setPreview(inv)}>
                    <div className="font-bold text-sm">{inv.invoice_no}</div>
                    <div className="text-xs text-muted-foreground">{inv.buyer?.name} · {inv.date}</div>
                    <div className="text-sm font-semibold mt-1">₹{fmt(inv.grand_total)}</div>
                    <div className="flex gap-2 mt-2">
                      <button onClick={(e) => { e.stopPropagation(); setPreview(inv); setTimeout(printInvoice, 100); }}
                        className="text-xs flex items-center gap-1 border border-foreground/20 px-2 py-1 hover:bg-black hover:text-white transition-colors">
                        <Printer size={11} /> Print
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); shareWhatsApp(inv); }}
                        className="text-xs flex items-center gap-1 border border-green-400 text-green-600 px-2 py-1 hover:bg-green-600 hover:text-white transition-colors">
                        <WhatsappLogo size={11} /> WhatsApp
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); deleteInvoice(inv); }}
                        className="text-xs text-red-500 hover:text-red-700 ml-auto">✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {preview && (
            <div className="md:col-span-2">
              <div className="flex gap-2 mb-3 no-print">
                <button onClick={printInvoice} className="flex items-center gap-2 bg-black text-white px-4 py-2 text-sm hover:bg-gray-800">
                  <Printer size={15} /> Print / Save PDF
                </button>
                <button onClick={() => shareWhatsApp(preview)} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 text-sm hover:bg-green-700">
                  <WhatsappLogo size={15} /> Share on WhatsApp
                </button>
              </div>
              <InvoiceSheet inv={preview} />
            </div>
          )}
        </div>
      </main>

      {/* Full-page print view */}
      {preview && <InvoiceSheet inv={preview} printOnly />}
    </div>
  );
}

function InvoiceSheet({ inv, printOnly = false }) {
  const fmt2 = (n) => Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });
  const s = inv.seller || {};
  const b = inv.buyer || {};

  return (
    <div className={`invoice-sheet ${printOnly ? "print-only fixed inset-0 bg-white z-50 p-8" : "border border-foreground/15 bg-white text-black p-6"}`}
      data-testid="invoice-sheet">
      {/* Header */}
      <div className="flex justify-between items-start mb-4 pb-4 border-b-2 border-black">
        <div className="flex items-start gap-3">
          {s.logo_url && (
            <img src={s.logo_url} alt="" className="w-14 h-14 object-contain border border-gray-200 shrink-0" />
          )}
          <div>
            <div className="text-2xl font-black">{s.name || "Your Business"}</div>
            {s.address && <div className="text-xs text-gray-600 mt-1 max-w-xs">{s.address}</div>}
            {s.gstin && <div className="text-xs mt-1"><span className="font-semibold">GSTIN:</span> {s.gstin}</div>}
            {s.phone && <div className="text-xs"><span className="font-semibold">Ph:</span> {s.phone}</div>}
            {s.email && <div className="text-xs">{s.email}</div>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-black uppercase tracking-widest text-gray-800">Tax Invoice</div>
          <div className="text-sm font-bold mt-1">{inv.invoice_no}</div>
          <div className="text-xs text-gray-600">Date: {inv.date}</div>
          {inv.due_date && <div className="text-xs text-gray-600">Due: {inv.due_date}</div>}
        </div>
      </div>

      {/* Bill To */}
      <div className="mb-4 p-3 bg-gray-50 border border-gray-200">
        <div className="text-xs font-bold text-gray-500 mb-1">BILL TO</div>
        <div className="font-bold">{b.name}</div>
        {b.address && <div className="text-xs text-gray-600">{b.address}</div>}
        {b.gstin && <div className="text-xs"><span className="font-semibold">GSTIN:</span> {b.gstin}</div>}
        {b.phone && <div className="text-xs">{b.phone}</div>}
      </div>

      {/* Items Table */}
      <table className="w-full text-xs mb-4 border border-gray-300">
        <thead className="bg-black text-white">
          <tr>
            <th className="text-left px-2 py-1.5">#</th>
            <th className="text-left px-2 py-1.5">Item</th>
            <th className="text-left px-2 py-1.5">HSN</th>
            <th className="text-right px-2 py-1.5">Qty</th>
            <th className="text-right px-2 py-1.5">Rate (₹)</th>
            <th className="text-right px-2 py-1.5">GST</th>
            <th className="text-right px-2 py-1.5">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {(inv.items || []).map((item, i) => (
            <tr key={i} className="border-b border-gray-200">
              <td className="px-2 py-1.5">{i + 1}</td>
              <td className="px-2 py-1.5 font-medium">{item.name}</td>
              <td className="px-2 py-1.5 text-gray-500">{item.hsn || "—"}</td>
              <td className="px-2 py-1.5 text-right">{item.qty} {item.unit}</td>
              <td className="px-2 py-1.5 text-right">{fmt2(item.rate)}</td>
              <td className="px-2 py-1.5 text-right">{item.gst_rate}%</td>
              <td className="px-2 py-1.5 text-right font-semibold">{fmt2(item.qty * item.rate)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-4">
        <div className="w-56 text-xs">
          <div className="flex justify-between py-1 border-b border-gray-200"><span>Subtotal</span><span>₹{fmt2(inv.subtotal)}</span></div>
          {inv.discount_amount > 0 && <div className="flex justify-between py-1 border-b border-gray-200 text-gray-500"><span>Discount ({inv.discount_percent}%)</span><span>-₹{fmt2(inv.discount_amount)}</span></div>}
          {(inv.tax_summary || []).map(t => (
            <div key={t.label} className="flex justify-between py-1 border-b border-gray-200 text-gray-600"><span>{t.label}</span><span>₹{fmt2(t.amount)}</span></div>
          ))}
          <div className="flex justify-between py-1.5 font-black text-sm border-t-2 border-black"><span>GRAND TOTAL</span><span>₹{fmt2(inv.grand_total)}</span></div>
        </div>
      </div>

      {/* Amount in words */}
      <div className="text-xs text-gray-600 mb-4 italic">{inv.amount_in_words}</div>

      {/* Bank + UPI */}
      {(s.bank_name || s.upi_id) && (
        <div className="border border-gray-200 p-3 mb-3 text-xs">
          <div className="font-bold mb-1">Payment Details</div>
          {s.bank_name && <div><span className="font-semibold">Bank:</span> {s.bank_name} · A/C: {s.account_no} · IFSC: {s.ifsc}</div>}
          {s.upi_id && <div><span className="font-semibold">UPI:</span> {s.upi_id}</div>}
        </div>
      )}

      {inv.notes && <div className="text-xs text-gray-600 border-t border-gray-200 pt-2">{inv.notes}</div>}

      <div className="text-right text-xs text-gray-400 mt-4 border-t pt-2">
        This is a computer-generated invoice. · Powered by Business Vahi
      </div>
    </div>
  );
}
