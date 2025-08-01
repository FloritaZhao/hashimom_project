/**
 * Centralized API client for the HashiMom frontend.
 *
 * All requests include credentials so that the Flask session cookie is
 * sent.  Functions return JSON data or throw an error on non‑OK
 * responses.  Sensitive information is never logged.
 */

const API_BASE = 'http://localhost:5001/api';

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