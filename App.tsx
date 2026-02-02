
import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileSpreadsheet, ChevronRight, Check, Printer, Sparkles, Settings2, Trash2, Calendar, Layout, Building2, User, CreditCard, FileText } from 'lucide-react';
import { FeatureRow, InvoiceConfig, TimesheetState } from './types';
import InvoiceTemplate from './components/InvoiceTemplate';

// Access XLSX from window because it's loaded via CDN in index.html
declare const XLSX: any;

const STORAGE_KEY = 'sheet_invoice_config';

const DEFAULT_CONFIG: InvoiceConfig = {
  companyName: 'Creative Studio Name',
  taxCode: 'TAX-00123456',
  address: '123 Studio Blvd, Suite 400\nCreative District, City 10101\nCountry',
  email: 'billing@creativestudio.com',
  invoiceNumber: 'INV-' + Math.floor(Math.random() * 10000),
  date: new Date().toLocaleDateString(),
  clientName: 'Acme Corporation LLC',
  clientEmail: 'accounts@acmecorp.com',
  clientAddress: '456 Business Way\nMetropolis, State 54321\nUSA',
  clientPhone: '+1 (555) 123-4567',
  hourlyRate: 85,
  currency: '$',
  taxRate: 0,
  bankName: 'Standard International Bank',
  bankAddress: 'Financial Plaza, Wall St, New York, USA',
  swiftCode: 'STNDUS33',
  accountFirstName: 'John',
  accountLastName: 'Doe',
  accountNumber: '998877665544',
  accountHolderAddress: '123 Studio Blvd, Suite 400, Creative District, City 10101, Country',
  description: 'Services rendered for project development and design consultation',
  notes: 'Please specify the invoice number in your wire transfer description for faster processing.',
};

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<TimesheetState>({
    workbook: null,
    sheetNames: [],
    selectedSheets: [],
    dateRange: { start: '', end: '' },
    availableDateColumns: [],
  });

  // Initialize config from localStorage or fallback to default
  const [invoiceConfig, setInvoiceConfig] = useState<InvoiceConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure the invoice number and date are refreshed even if loaded from storage
        return {
          ...parsed,
          invoiceNumber: parsed.invoiceNumber || 'INV-' + Math.floor(Math.random() * 10000),
          date: new Date().toLocaleDateString()
        };
      } catch (e) {
        console.error("Failed to parse saved config", e);
        return DEFAULT_CONFIG;
      }
    }
    return DEFAULT_CONFIG;
  });

  // Save config to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(invoiceConfig));
  }, [invoiceConfig]);

  const [processedItems, setProcessedItems] = useState<FeatureRow[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [step, setStep] = useState(1);
  const [warnings, setWarnings] = useState<{ date: string; hours: number }[]>([]);

  const sortMonthDay = (dates: string[]) => {
    return [...dates].sort((a, b) => {
      const [ma, da] = a.split('/').map(Number);
      const [mb, db] = b.split('/').map(Number);
      if (ma !== mb) return ma - mb;
      return da - db;
    });
  };

  const getMonthDayColumns = (wb: any, sheetNames: string[]) => {
    const allDateCols = new Set<string>();
    const dateRegex = /^\d{1,2}\/\d{1,2}$/;

    sheetNames.forEach(name => {
      const sheet = wb.Sheets[name];
      if (!sheet) return;
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: range.s.r, c: C });
        const cell = sheet[address];
        if (!cell) continue;
        const val = String(cell.w || cell.v || '').trim();
        if (dateRegex.test(val)) allDateCols.add(val);
      }
    });
    return sortMonthDay(Array.from(allDateCols));
  };

  useEffect(() => {
    if (state.workbook && state.selectedSheets.length > 0) {
      const dateCols = getMonthDayColumns(state.workbook, state.selectedSheets);
      setState(prev => {
        const newStart = dateCols.includes(prev.dateRange.start) ? prev.dateRange.start : (dateCols[0] || '');
        const newEnd = dateCols.includes(prev.dateRange.end) ? prev.dateRange.end : (dateCols[dateCols.length - 1] || '');
        return {
          ...prev,
          availableDateColumns: dateCols,
          dateRange: { start: newStart, end: newEnd }
        };
      });
    } else if (state.workbook) {
       setState(prev => ({ ...prev, availableDateColumns: [], dateRange: { start: '', end: '' } }));
    }
  }, [state.selectedSheets, state.workbook]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary', cellNF: true, cellText: true });
        setState(prev => ({ ...prev, workbook: wb, sheetNames: wb.SheetNames, selectedSheets: [wb.SheetNames[0]] }));
        setStep(2);
      } catch (err) {
        alert("Error parsing Excel file.");
      }
    };
    reader.readAsBinaryString(uploadedFile);
  };

  const toggleSheet = (name: string) => {
    setState(prev => ({
      ...prev,
      selectedSheets: prev.selectedSheets.includes(name) ? prev.selectedSheets.filter(n => n !== name) : [...prev.selectedSheets, name]
    }));
  };

  const handleProcess = useCallback(() => {
    if (!state.workbook) return;
    const { start, end } = state.dateRange;
    const masterList = state.availableDateColumns;
    const startIndex = masterList.indexOf(start);
    const endIndex = masterList.indexOf(end);
    if (startIndex === -1 || endIndex === -1) { alert("Invalid date range."); return; }
    
    const startIdx = Math.min(startIndex, endIndex);
    const endIdx = Math.max(startIndex, endIndex);
    const activeDateKeys = masterList.slice(startIdx, endIdx + 1);
    const aggregated: Record<string, number> = {};
    const dailyTotals: Record<string, number> = {};

    // Initialize daily totals
    activeDateKeys.forEach(dateKey => {
      dailyTotals[dateKey] = 0;
    });

    state.selectedSheets.forEach(sheetName => {
      const sheet = state.workbook.Sheets[sheetName];
      const data: any[] = XLSX.utils.sheet_to_json(sheet, { raw: false });
      data.forEach(row => {
        const featureKey = Object.keys(row).find(k => k.toLowerCase() === 'feature');
        const feature = (featureKey ? row[featureKey] : 'Uncategorized') || 'Uncategorized';
        let totalHours = 0;
        activeDateKeys.forEach(dateKey => {
          if (row[dateKey]) {
            const val = parseFloat(row[dateKey]);
            if (!isNaN(val)) {
              totalHours += val;
              dailyTotals[dateKey] += val;
            }
          }
        });
        if (totalHours > 0) {
          const featureStr = String(feature);
          aggregated[featureStr] = (aggregated[featureStr] || 0) + totalHours;
        }
      });
    });

    // Check for dates with less than 8 hours
    const datesWithLowHours = activeDateKeys
      .filter(dateKey => dailyTotals[dateKey] > 0 && dailyTotals[dateKey] < 8)
      .map(dateKey => ({ date: dateKey, hours: dailyTotals[dateKey] }));
    setWarnings(datesWithLowHours);

    const items = Object.entries(aggregated).map(([feature, hours]) => ({ feature, hours }));
    setProcessedItems(items);
    if (items.length > 0) {
      const topItems = [...items].sort((a, b) => b.hours - a.hours).slice(0, 3);
      const mainWorks = topItems.map(i => i.feature).join(', ');
      setSummary(`Services for period ${start} to ${end}, focusing on ${mainWorks}${items.length > 3 ? ` and others` : ''}.`);
    }
    setStep(3);
  }, [state]);

  const reset = () => {
    setFile(null);
    setState({ workbook: null, sheetNames: [], selectedSheets: [], dateRange: { start: '', end: '' }, availableDateColumns: [] });
    setStep(1);
    setProcessedItems([]);
    setSummary("");
    setWarnings([]);
  };

  const inputClass = "w-full bg-slate-50 border-2 border-slate-100 rounded-xl p-3 font-medium outline-none focus:border-indigo-500 transition-all text-sm";
  const labelClass = "block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5";

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 pb-32">
      {/* Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 no-print">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-200">
            <Layout size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Sheet<span className="text-indigo-600">Invoice</span></h1>
            <p className="text-slate-400 text-sm font-medium">Expert Billing Automation</p>
          </div>
        </div>
        <nav className="flex items-center bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200">
          {[1, 2, 3].map((s) => (
            <button key={s} onClick={() => step > s && setStep(s)} className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all ${step === s ? 'bg-indigo-600 text-white shadow-md' : step > s ? 'text-indigo-600 hover:bg-indigo-50' : 'text-slate-400 cursor-not-allowed'}`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-white text-indigo-600' : 'bg-slate-100'}`}>{s}</span>
              <span className="font-semibold text-sm">{s === 1 ? 'Upload' : s === 2 ? 'Settings' : 'Result'}</span>
            </button>
          ))}
        </nav>
      </div>

      <main>
        {step === 1 && (
          <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in duration-500">
            <label className="w-full max-w-xl group relative flex flex-col items-center justify-center p-12 border-2 border-dashed border-slate-300 rounded-3xl bg-white hover:border-indigo-500 hover:bg-indigo-50 transition-all cursor-pointer shadow-sm">
              <div className="p-6 bg-slate-100 rounded-2xl group-hover:bg-indigo-100 group-hover:scale-110 transition-all duration-300 mb-6"><Upload className="text-slate-400 group-hover:text-indigo-600" size={48} /></div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">Upload Timesheet</h2>
              <p className="text-slate-500 text-center max-w-xs mb-8 font-medium">Drop your Excel file to transform hours into a professional invoice instantly.</p>
              <div className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-xl group-hover:bg-indigo-700 transition-colors">Select File</div>
              <input type="file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
            </label>

            {/* Example Image Section */}
            <div className="mt-16 flex flex-col items-center">
              <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">Example Timesheet Format</p>
              <div className="relative group max-w-3xl">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <img 
                  src={`${import.meta.env.BASE_URL}/assets/example.png`}
                  alt="Example Timesheet Format" 
                  className="relative rounded-xl shadow-2xl border border-slate-200 w-full"
                />
              </div>
              <p className="mt-6 text-slate-400 text-xs font-medium max-w-md text-center">
                Ensure your Excel has a <span className="text-indigo-600 font-bold">Feature</span> column and date columns in <span className="text-indigo-600 font-bold">m/d</span> format.
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in slide-in-from-bottom-4 duration-500">
            {/* Sheet Selection Sidebar */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Settings2 size={18} /></div>
                  <h3 className="text-base font-bold">Timesheet Source</h3>
                </div>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                  {state.sheetNames.map(name => (
                    <button key={name} onClick={() => toggleSheet(name)} className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all ${state.selectedSheets.includes(name) ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-300'}`}>
                      <span className="font-semibold text-xs truncate">{name}</span>
                      {state.selectedSheets.includes(name) ? <Check size={14} className="text-indigo-600" /> : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Calendar size={18} /></div>
                  <h3 className="text-base font-bold">Billing Period</h3>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className={labelClass}>Start</label>
                    <select value={state.dateRange.start} onChange={(e) => setState(prev => ({ ...prev, dateRange: { ...prev.dateRange, start: e.target.value } }))} className={inputClass}>
                      {state.availableDateColumns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>End</label>
                    <select value={state.dateRange.end} onChange={(e) => setState(prev => ({ ...prev, dateRange: { ...prev.dateRange, end: e.target.value } }))} className={inputClass}>
                      {state.availableDateColumns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Form Area */}
            <div className="lg:col-span-3 space-y-8">
              {/* Business Section */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><Building2 size={20} /></div>
                  <h3 className="text-lg font-bold">Your Business Profile</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className={labelClass}>Business Name</label>
                    <input type="text" value={invoiceConfig.companyName} onChange={(e) => setInvoiceConfig({...invoiceConfig, companyName: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Tax Code / VAT ID</label>
                    <input type="text" value={invoiceConfig.taxCode} onChange={(e) => setInvoiceConfig({...invoiceConfig, taxCode: e.target.value})} className={inputClass} placeholder="e.g. EU12345678" />
                  </div>
                  <div>
                    <label className={labelClass}>Business Email</label>
                    <input type="email" value={invoiceConfig.email} onChange={(e) => setInvoiceConfig({...invoiceConfig, email: e.target.value})} className={inputClass} placeholder="billing@yourstudio.com" />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Business Address</label>
                    <textarea value={invoiceConfig.address} onChange={(e) => setInvoiceConfig({...invoiceConfig, address: e.target.value})} className={`${inputClass} h-20 resize-none`} placeholder="Full postal address..." />
                  </div>
                </div>
              </div>

              {/* Client Section */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><User size={20} /></div>
                  <h3 className="text-lg font-bold">Client Information</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Client Name</label>
                    <input type="text" value={invoiceConfig.clientName} onChange={(e) => setInvoiceConfig({...invoiceConfig, clientName: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Client Email</label>
                    <input type="email" value={invoiceConfig.clientEmail} onChange={(e) => setInvoiceConfig({...invoiceConfig, clientEmail: e.target.value})} className={inputClass} placeholder="client@company.com" />
                  </div>
                  <div>
                    <label className={labelClass}>Client Phone</label>
                    <input type="text" value={invoiceConfig.clientPhone} onChange={(e) => setInvoiceConfig({...invoiceConfig, clientPhone: e.target.value})} className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Client Address</label>
                    <textarea value={invoiceConfig.clientAddress} onChange={(e) => setInvoiceConfig({...invoiceConfig, clientAddress: e.target.value})} className={`${inputClass} h-20 resize-none`} placeholder="Client billing address..." />
                  </div>
                </div>
              </div>

              {/* Payment Section */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CreditCard size={20} /></div>
                  <h3 className="text-lg font-bold">Payment Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Bank Name</label>
                    <input type="text" value={invoiceConfig.bankName} onChange={(e) => setInvoiceConfig({...invoiceConfig, bankName: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>SWIFT / BIC Code</label>
                    <input type="text" value={invoiceConfig.swiftCode} onChange={(e) => setInvoiceConfig({...invoiceConfig, swiftCode: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Account First Name</label>
                    <input type="text" value={invoiceConfig.accountFirstName} onChange={(e) => setInvoiceConfig({...invoiceConfig, accountFirstName: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Account Last Name</label>
                    <input type="text" value={invoiceConfig.accountLastName} onChange={(e) => setInvoiceConfig({...invoiceConfig, accountLastName: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Account / IBAN Number</label>
                    <input type="text" value={invoiceConfig.accountNumber} onChange={(e) => setInvoiceConfig({...invoiceConfig, accountNumber: e.target.value})} className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Bank Address</label>
                    <input type="text" value={invoiceConfig.bankAddress} onChange={(e) => setInvoiceConfig({...invoiceConfig, bankAddress: e.target.value})} className={inputClass} />
                  </div>
                  <div className="md:col-span-2">
                    <label className={labelClass}>Account Holder Address</label>
                    <input type="text" value={invoiceConfig.accountHolderAddress} onChange={(e) => setInvoiceConfig({...invoiceConfig, accountHolderAddress: e.target.value})} className={inputClass} />
                  </div>
                </div>
              </div>

              {/* Terms & Description Section */}
              <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-2 mb-6">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><FileText size={20} /></div>
                  <h3 className="text-lg font-bold">Additional Terms & Details</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  <div>
                    <label className={labelClass}>Invoice No</label>
                    <input type="text" value={invoiceConfig.invoiceNumber} onChange={(e) => setInvoiceConfig({...invoiceConfig, invoiceNumber: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Hourly Rate ({invoiceConfig.currency})</label>
                    <input type="number" value={invoiceConfig.hourlyRate} onChange={(e) => setInvoiceConfig({...invoiceConfig, hourlyRate: parseFloat(e.target.value)})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Tax Rate (%)</label>
                    <input type="number" value={invoiceConfig.taxRate} onChange={(e) => setInvoiceConfig({...invoiceConfig, taxRate: parseFloat(e.target.value)})} className={inputClass} />
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <label className={labelClass}>Project Description</label>
                    <input type="text" value={invoiceConfig.description} onChange={(e) => setInvoiceConfig({...invoiceConfig, description: e.target.value})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Footer Notes</label>
                    <textarea value={invoiceConfig.notes} onChange={(e) => setInvoiceConfig({...invoiceConfig, notes: e.target.value})} className={`${inputClass} h-20 resize-none`} />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-4">
                 <button onClick={reset} className="px-8 py-4 rounded-2xl font-bold text-slate-500 hover:bg-slate-100 transition-all">Cancel</button>
                 <button onClick={handleProcess} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">
                  Generate Invoice <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-12 no-print p-6 bg-slate-900 rounded-3xl shadow-2xl">
              <div className="flex items-center gap-6">
                 <button onClick={() => setStep(2)} className="text-slate-400 hover:text-white font-bold text-sm transition-colors">Back to Settings</button>
                 <div className="h-8 w-px bg-slate-800" />
                 <div className="flex flex-col"><span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Tasks</span><span className="text-white font-bold">{processedItems.length}</span></div>
                 <div className="flex flex-col"><span className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Hours</span><span className="text-white font-bold">{processedItems.reduce((acc, i) => acc + i.hours, 0).toFixed(1)}h</span></div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => window.print()} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/40"><Printer size={16} /> Print or Save as PDF</button>
                <button onClick={reset} className="p-3 bg-red-500/10 text-red-500 rounded-xl hover:bg-red-500 hover:text-white transition-all"><Trash2 size={20} /></button>
              </div>
            </div>
            {warnings.length > 0 && (
              <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-6 mb-8 no-print">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-amber-100 rounded-lg flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-amber-900 mb-2">⚠️ Low Hours Detected</h4>
                    <p className="text-amber-800 text-sm mb-3">The following dates have less than 8 hours recorded:</p>
                    <div className="flex flex-wrap gap-2">
                      {warnings.map(w => (
                        <div key={w.date} className="bg-white border border-amber-200 rounded-lg px-3 py-2">
                          <span className="font-bold text-amber-900 text-sm">{w.date}</span>
                          <span className="text-amber-700 text-sm ml-2">({w.hours.toFixed(1)}h)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            <InvoiceTemplate items={processedItems} config={invoiceConfig} summary={summary} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
