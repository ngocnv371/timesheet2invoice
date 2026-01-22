
import React from 'react';
import { FeatureRow, InvoiceConfig } from '../types';

interface InvoiceTemplateProps {
  items: FeatureRow[];
  config: InvoiceConfig;
  summary: string;
}

const InvoiceTemplate: React.FC<InvoiceTemplateProps> = ({ items, config, summary }) => {
  const subtotal = items.reduce((acc, item) => acc + (item.hours * config.hourlyRate), 0);
  const tax = subtotal * (config.taxRate / 100);
  const total = subtotal + tax;

  const fullAccountName = `${config.accountFirstName} ${config.accountLastName}`.trim();

  return (
    <div id="invoice-content" className="bg-white p-12 md:p-16 shadow-none md:shadow-xl border-none md:border border-slate-200 max-w-5xl mx-auto rounded-none md:rounded-lg text-slate-800 font-sans">
      {/* Header Section */}
      <div className="flex justify-between items-start mb-16">
        <div className="space-y-4">
          <div>
            <h1 className="text-5xl font-black text-slate-900 uppercase tracking-tighter mb-2">Invoice</h1>
            <p className="text-slate-400 font-bold tracking-widest">{config.invoiceNumber}</p>
          </div>
          <div className="text-sm space-y-1">
            <p className="font-bold text-slate-900 text-base">{config.companyName}</p>
            {config.taxCode && <p className="text-slate-500">Tax ID: {config.taxCode}</p>}
            {config.address && <p className="text-slate-500 whitespace-pre-line max-w-xs">{config.address}</p>}
            {config.email && <p className="text-indigo-600 font-medium">{config.email}</p>}
          </div>
        </div>
        <div className="text-right">
          <div className="bg-slate-900 text-white p-4 rounded-xl inline-block mb-4">
            <p className="text-[10px] font-black uppercase tracking-widest mb-1 opacity-60">Date of Issue</p>
            <p className="text-lg font-bold">{config.date}</p>
          </div>
        </div>
      </div>

      {/* Addresses Section */}
      <div className="grid grid-cols-2 gap-12 mb-16 border-y border-slate-100 py-10">
        <div>
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Bill To</h3>
          <p className="text-xl font-bold text-slate-900 mb-2">{config.clientName}</p>
          {config.clientEmail && <p className="text-sm text-indigo-600 font-medium mb-1">{config.clientEmail}</p>}
          <p className="text-sm text-slate-500 whitespace-pre-line leading-relaxed">{config.clientAddress}</p>
          {config.clientPhone && <p className="text-sm text-slate-500 mt-2">Ph: {config.clientPhone}</p>}
        </div>
        <div className="text-right flex flex-col justify-end">
          <p className="text-sm text-slate-400 font-medium">Standard Service Rate</p>
          <p className="text-2xl font-black text-slate-900">{config.currency}{config.hourlyRate.toFixed(2)} / hr</p>
        </div>
      </div>

      {/* Description Block */}
      {config.description && (
        <div className="mb-12">
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Project Overview</h3>
          <p className="text-slate-700 text-lg font-medium leading-snug">{config.description}</p>
          {summary && <p className="text-slate-500 text-sm italic mt-2">{summary}</p>}
        </div>
      )}

      {/* Table Section */}
      <table className="w-full mb-12">
        <thead>
          <tr className="border-b-4 border-slate-900 text-left">
            <th className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400">Description of Service</th>
            <th className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right w-32">Hours</th>
            <th className="py-5 font-black text-[10px] uppercase tracking-widest text-slate-400 text-right w-40">Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {items.map((item, idx) => (
            <tr key={idx} className="group hover:bg-slate-50 transition-colors">
              <td className="py-5 font-semibold text-slate-800">{item.feature}</td>
              <td className="py-5 text-right font-medium text-slate-500">{item.hours.toFixed(1)}</td>
              <td className="py-5 text-right font-bold text-slate-900">
                {config.currency} {(item.hours * config.hourlyRate).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals Section */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-20">
        <div className="flex-1 max-w-sm">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Payment Instructions</h3>
            <div className="space-y-3 text-xs">
              {config.bankName && <div className="flex justify-between"><span className="text-slate-400">Bank:</span><span className="font-bold text-right">{config.bankName}</span></div>}
              {config.swiftCode && <div className="flex justify-between"><span className="text-slate-400">SWIFT:</span><span className="font-bold text-right">{config.swiftCode}</span></div>}
              {fullAccountName && <div className="flex justify-between"><span className="text-slate-400">Name:</span><span className="font-bold text-right">{fullAccountName}</span></div>}
              {config.accountNumber && <div className="flex justify-between"><span className="text-slate-400">Account/IBAN:</span><span className="font-bold text-indigo-600 text-right">{config.accountNumber}</span></div>}
              {config.bankAddress && <p className="text-[9px] text-slate-400 mt-2 leading-tight">Bank Addr: {config.bankAddress}</p>}
            </div>
          </div>
        </div>

        <div className="w-full md:w-80 space-y-4">
          <div className="flex justify-between text-slate-500 font-medium">
            <span>Subtotal</span>
            <span>{config.currency} {subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
          {config.taxRate > 0 && (
            <div className="flex justify-between text-slate-500 font-medium">
              <span>Tax ({config.taxRate}%)</span>
              <span>{config.currency} {tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="flex justify-between items-center py-6 border-t-4 border-slate-900">
            <span className="font-black text-[10px] uppercase tracking-widest text-slate-400">Amount Due</span>
            <span className="font-black text-4xl text-slate-900">{config.currency} {total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* Footer Notes */}
      <div className="pt-10 border-t border-slate-100 text-slate-400 text-[10px] leading-relaxed italic">
        <p className="font-bold uppercase tracking-widest mb-2 not-italic text-slate-900">Important Notes</p>
        <p className="max-w-xl">{config.notes}</p>
        <p className="mt-8 text-center uppercase tracking-[0.2em] font-black opacity-30">Invoice generated via SheetInvoice Pro</p>
      </div>
    </div>
  );
};

export default InvoiceTemplate;
