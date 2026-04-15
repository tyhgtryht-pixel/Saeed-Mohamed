export interface Transaction {
  amount: number;
  user: string;
  date: string;
  type?: 'payment' | 'debt';
  notes?: string;
}

export interface Client {
  id?: string;
  name: string;
  total: number;
  paid: number;
  history: Transaction[];
  createdAt: any;
  createdBy: string;
}

export interface AppConfig {
  name: string;
  logo: string;
  info: string;
}
