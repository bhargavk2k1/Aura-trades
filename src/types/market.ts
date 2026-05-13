export interface IndexData {
  symbol: string;
  label: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
}

export interface LivePrice {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  addedAt?: string;
  priceAtAdd?: number;
  sinceAddedPercent?: number;
}

export interface Mover {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
}

export interface ChartBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface StockDetail {
  symbol: string;
  price: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  change: number;
  changePercent: number;
  volume: number;
  vwap?: number;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}
