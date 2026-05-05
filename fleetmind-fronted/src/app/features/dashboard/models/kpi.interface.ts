export interface KPI {
  id: string;
  title: string;
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

export interface Metric {
  id: string;
  name: string;
  data: { date: string; value: number }[];
  type: 'line' | 'bar' | 'pie';
}