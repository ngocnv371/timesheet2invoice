
export interface FeatureRow {
  feature: string;
  hours: number;
}

export interface SheetData {
  name: string;
  rows: FeatureRow[];
  allColumns: string[];
}

export interface InvoiceConfig {
  companyName: string;
  taxCode: string;
  address: string;
  email: string;
  invoiceNumber: string;
  date: string;
  
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientPhone: string;
  
  hourlyRate: number;
  currency: string;
  taxRate: number;

  // Payment Details
  bankName: string;
  bankAddress: string;
  swiftCode: string;
  accountFirstName: string;
  accountLastName: string;
  accountNumber: string;
  accountHolderAddress: string;

  // Text contents
  description: string;
  notes: string;
}

export interface TimesheetState {
  workbook: any | null;
  sheetNames: string[];
  selectedSheets: string[];
  dateRange: { start: string; end: string };
  availableDateColumns: string[];
}
