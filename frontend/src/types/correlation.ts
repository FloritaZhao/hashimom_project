export interface TimelineRow {
  date: string; // YYYY-MM-DD
  lab?: { analyte: string; value: number; unit?: string; status?: 'LOW' | 'NORMAL' | 'HIGH' | 'NA'; deltaPct?: number | null };
  symptoms?: { name: string; severity: number; note?: string }[];
  diet?: { type: 'gluten'; confidence: number; keywords?: string }[];
}

export interface Cluster {
  id: string;
  time_window: { start: string; end: string }; // YYYY-MM-DD boundaries
  members: {
    labs: { analyte: string; date: string; value: number; deltaPct: number | null; status?: string }[];
    symptoms: { name: string; date: string; severity: number; deltaSeverity?: number; note?: string }[];
    gluten: { date: string; confidence: number; keywords?: string }[];
  };
  score: number;
  ai: ClusterAI | null;
}

export interface ClusterAI {
  summary: string;
  recommendations?: string[];
}


