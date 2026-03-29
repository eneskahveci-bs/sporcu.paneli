export type UserRole = 'superadmin' | 'admin' | 'coach' | 'athlete' | 'parent'
export type SubscriptionPlan = 'trial' | 'starter' | 'pro' | 'enterprise'
export type SubscriptionStatus = 'trial' | 'active' | 'overdue' | 'suspended' | 'cancelled'

export const PLAN_CONFIG: Record<SubscriptionPlan, { name: string; max_athletes: number; max_branches: number; price: number; color: string }> = {
  trial:      { name: 'Deneme',      max_athletes: 30,   max_branches: 1,  price: 0,    color: '#6366f1' },
  starter:    { name: 'Başlangıç',   max_athletes: 50,   max_branches: 1,  price: 500,  color: '#0ea5e9' },
  pro:        { name: 'Profesyonel', max_athletes: 200,  max_branches: 5,  price: 1200, color: '#8b5cf6' },
  enterprise: { name: 'Kurumsal',    max_athletes: 9999, max_branches: 99, price: 0,    color: '#f59e0b' },
}

export const STATUS_CONFIG: Record<SubscriptionStatus, { label: string; badge: string }> = {
  trial:     { label: 'Deneme',    badge: 'badge-blue'   },
  active:    { label: 'Aktif',     badge: 'badge-green'  },
  overdue:   { label: 'Gecikmiş', badge: 'badge-yellow' },
  suspended: { label: 'Askıda',   badge: 'badge-red'    },
  cancelled: { label: 'İptal',    badge: 'badge-gray'   },
}
export type AthleteGender = 'male' | 'female'
export type AthleteStatus = 'active' | 'inactive' | 'pending'
export type PaymentType = 'income' | 'expense'
export type PaymentStatus = 'pending' | 'completed' | 'overdue' | 'cancelled'
export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'paytr'
export type AttendanceStatus = 'present' | 'absent' | 'excused'

export interface Organization {
  id: string
  name: string
  slug: string
  logo?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  settings?: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Branch {
  id: string
  organization_id: string
  name: string
  address?: string
  phone?: string
  is_active: boolean
  created_at: string
}

export interface User {
  id: string
  organization_id: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  phone?: string
  avatar_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Athlete {
  id: string
  organization_id: string
  branch_id?: string
  class_id?: string
  sport_id?: string
  first_name: string
  last_name: string
  tc: string
  birth_date?: string
  gender?: AthleteGender
  phone?: string
  email?: string
  address?: string
  city?: string
  license_number?: string
  registration_date?: string
  category?: string
  monthly_fee?: number
  next_payment_date?: string
  parent_name?: string
  parent_phone?: string
  parent_email?: string
  blood_type?: string
  height?: number
  weight?: number
  health_notes?: string
  emergency_contact?: string
  school?: string
  status: AthleteStatus
  notes?: string
  auth_user_id?: string
  created_at: string
  updated_at: string
  created_by?: string
  // Joins
  sport?: Sport
  class?: Class
  branch?: Branch
}

export interface Coach {
  id: string
  organization_id: string
  branch_id?: string
  sport_id?: string
  first_name: string
  last_name: string
  tc?: string
  phone?: string
  email?: string
  address?: string
  specialization?: string
  license_number?: string
  salary?: number
  start_date?: string
  status: 'active' | 'inactive'
  auth_user_id?: string
  created_at: string
  updated_at: string
  // Joins
  sport?: Sport
  branch?: Branch
}

export interface Sport {
  id: string
  organization_id: string
  name: string
  description?: string
  icon?: string
  is_active: boolean
  created_at: string
}

export interface Class {
  id: string
  organization_id: string
  branch_id?: string
  sport_id?: string
  coach_id?: string
  name: string
  description?: string
  schedule?: string
  schedule_days?: number[]
  schedule_time?: string
  schedule_time_end?: string
  max_students?: number
  age_group?: string
  is_active: boolean
  created_at: string
  // Joins
  sport?: Sport
  coach?: Coach
  branch?: Branch
}

export interface Payment {
  id: string
  organization_id: string
  athlete_id?: string
  athlete_name?: string
  amount: number
  type: PaymentType
  category?: string
  description?: string
  status: PaymentStatus
  due_date?: string
  paid_date?: string
  method?: PaymentMethod
  source?: 'manual' | 'plan' | 'parent_notification'
  slip_code?: string
  paytr_order_id?: string
  paytr_token?: string
  notification_status?: 'pending_approval' | 'approved' | 'rejected'
  created_at: string
  updated_at: string
  created_by?: string
  // Joins
  athlete?: Athlete
}

export interface PaymentPlan {
  id: string
  athlete_id: string
  month: number
  year: number
  amount: number
  status: PaymentStatus
  due_date?: string
  paid_date?: string
  payment_id?: string
  created_at: string
}

export interface Attendance {
  id: string
  organization_id: string
  athlete_id: string
  date: string
  status: AttendanceStatus
  notes?: string
  recorded_by?: string
  created_at: string
  // Joins
  athlete?: Athlete
}

export interface Message {
  id: string
  sender_id: string
  sender_name: string
  sender_role: string
  receiver_id: string
  receiver_name: string
  subject: string
  content: string
  is_read: boolean
  created_at: string
}

export interface PreRegistration {
  id: string
  organization_id: string
  first_name: string
  last_name: string
  tc?: string
  birth_date?: string
  gender?: AthleteGender
  phone: string
  email?: string
  parent_name?: string
  parent_phone?: string
  sport_id?: string
  preferred_class_id?: string
  notes?: string
  status: 'pending' | 'converted' | 'rejected'
  converted_athlete_id?: string
  created_at: string
  updated_at: string
  // Joins
  sport?: Sport
}

export interface DashboardStats {
  total_athletes: number
  active_athletes: number
  monthly_income: number
  pending_payments: number
  overdue_payments: number
  today_attendance: number
  attendance_rate: number
}
