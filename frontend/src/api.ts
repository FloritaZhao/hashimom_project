/**
 * Centralized API client for the HashiMom frontend.
 *
 * All requests include credentials so that the Flask session cookie is
 * sent.  Functions return JSON data or throw an error on non‑OK
 * responses.  Sensitive information is never logged.
 */

// Prefer localhost to avoid cookie-domain mismatches with 127.0.0.1
// Env override via VITE_API_BASE remains supported for deployments
const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) || 'http://localhost:5001/api';

interface RequestOptions extends RequestInit {
  body?: any;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE}${path}`;
  const opts: RequestInit = {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    method: options.method ?? 'GET',
  };
  if (options.body !== undefined) {
    opts.body = JSON.stringify(options.body);
  }
  const res = await fetch(url, opts);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Authentication
export async function login(nickname: string, email: string): Promise<{ user_id: number; nickname: string; email: string }> {
  return request('/login', { method: 'POST', body: { nickname, email } });
}

export async function logout(): Promise<{ status: string }> {
  return request('/logout', { method: 'POST' });
}

export async function checkSession(): Promise<{ user_id: number; nickname: string; email?: string }> {
  return request('/me');
}

// Labs
export interface LabPayload {
  test_name: string;
  result: string;
  units?: string;
  test_date: string;
}
export async function getLabs(): Promise<any[]> {
  return request('/labs');
}

export async function createLab(payload: LabPayload): Promise<any> {
  return request('/labs', { method: 'POST', body: payload });
}

// Symptoms
export interface SymptomPayload {
  symptom: string;
  severity: number;
  note?: string;
  logged_at?: string;
}
export async function getSymptoms(): Promise<any[]> {
  return request('/symptoms');
}

export async function createSymptom(payload: SymptomPayload): Promise<any> {
  return request('/symptoms', { method: 'POST', body: payload });
}

export async function getSymptomsFiltered(params: { start_date?: string; end_date?: string; symptom_name?: string } = {}): Promise<any[]> {
  const q = new URLSearchParams();
  if (params.start_date) q.set('start_date', params.start_date);
  if (params.end_date) q.set('end_date', params.end_date);
  if (params.symptom_name) q.set('symptom_name', params.symptom_name);
  const qs = q.toString();
  return request(`/symptoms${qs ? `?${qs}` : ''}`);
}

export async function getSymptomAISuggestion(body: { symptom: string; severity: number }): Promise<{ suggestion: string | null; disclaimer: string }> {
  return request('/symptoms/ai_suggestion', { method: 'POST', body });
}

export async function getExportSummary(days = 30): Promise<any> {
  return request(`/exports/summary?days=${days}`);
}

// Medications
export interface MedicationPayload {
  medication_name: string;
  dose?: string;
  time_of_day?: string;
  taken_at?: string;
}
export async function getMedications(): Promise<any[]> {
  return request('/medications');
}

export async function createMedication(payload: MedicationPayload): Promise<any> {
  return request('/medications', { method: 'POST', body: payload });
}

// Gluten scans - Enhanced with AI analysis
export interface GlutenScanPayload {
  image_data: string;
}

export interface GlutenScanResult {
  id: number;
  result_tag: string;
  created_at: string;
  analysis?: string;
  gluten_assessment?: string;
  confidence?: string;
}

export async function getGlutenScans(): Promise<any[]> {
  return request('/gluten_scans');
}

export async function createGlutenScan(payload: GlutenScanPayload): Promise<GlutenScanResult> {
  return request('/gluten_scans', { method: 'POST', body: payload });
}

// Food Chat - New feature for chatting about analyzed food
export interface FoodChatPayload {
  message: string;
  context?: string;
}

export interface FoodChatResponse {
  response: string;
}

export async function sendFoodChatMessage(payload: FoodChatPayload): Promise<FoodChatResponse> {
  return request('/food_chat', { method: 'POST', body: payload });
}

// AI messages
export async function getAIMessage(): Promise<any> {
  return request('/ai_messages/encouragement');
}

// Profile
export interface ProfileOut {
  lmp_date: string | null;
  due_date: string | null;
  high_risk_notes: string;
  gestational_age_weeks: number | null;
  trimester: 'T1' | 'T2' | 'T3' | '-';
}

export interface ProfileIn {
  lmp_date?: string | null;
  due_date?: string | null;
  high_risk_notes?: string | null;
}

export async function getProfile(): Promise<ProfileOut> {
  return request('/profile');
}

export async function putProfile(body: ProfileIn): Promise<ProfileOut> {
  return request('/profile', { method: 'PUT', body });
}

export async function deleteSymptom(id: number): Promise<{ status: string; id: number }> {
  return request(`/symptoms/${id}`, { method: 'DELETE' });
}