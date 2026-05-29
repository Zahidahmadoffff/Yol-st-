'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'

// LiveMap SSR olmadan yüklənir (Leaflet browser API tələb edir)
const LiveMap = dynamic(() => import('./components/LiveMap'), { ssr: false })
const LocationPicker = dynamic(() => import('./components/LocationPicker'), { ssr: false })

type RideStatus = 'active' | 'full' | 'cancelled' | 'completed'
type UserRole = 'driver' | 'passenger'
type AppRole = UserRole | 'admin'
type ConversationStatus = 'active' | 'closed'
type RideRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'
type ReportStatus = 'open' | 'in_review' | 'resolved' | 'dismissed'

type TabType =
  | 'dashboard'
  | 'create'
  | 'search'
  | 'requests'
  | 'chat'
  | 'history'
  | 'support'
  | 'profile'
  | 'admin'

type AdminSection =
  | 'overview'
  | 'users'
  | 'rides'
  | 'requests'
  | 'conversations'
  | 'messages'
  | 'reviews'
  | 'reports'
  | 'audit'

type Ride = {
  id: string
  driver_id: number
  origin: string
  destination: string
  origin_lat?: number | null
  origin_lng?: number | null
  destination_lat?: number | null
  destination_lng?: number | null
  ride_date: string | null
  departure_time: string
  seats: number
  price_per_seat: number
  notes: string | null
  status: RideStatus
  role: UserRole | null
  women_only?: boolean
  created_at?: string
  updated_at?: string
  completed_at?: string | null
  closed_reason?: string | null
}

type Profile = {
  id: number
  full_name: string | null
  username: string | null
  phone: string | null
  bio: string | null
  role: UserRole
  gender?: 'male' | 'female'
  home_address?: string | null
  work_address?: string | null
  car_brand: string | null
  license_plate: string | null
  car_color?: string | null
  is_blocked?: boolean
  admin_note?: string | null
  last_seen_at?: string | null
}

type RideRequest = {
  id: number
  ride_id: string
  requester_id: number
  owner_id: number
  requester_role: UserRole
  owner_role: UserRole
  message_text: string | null
  seats_requested: number
  status: RideRequestStatus
  created_at: string
  updated_at: string
}

type RideRequestWithRide = RideRequest & {
  ride?: Ride | null
}

type Conversation = {
  id: number
  ride_id: string
  request_id: number | null
  driver_user_id: number
  passenger_user_id: number
  status: ConversationStatus
  created_at: string
  updated_at: string
}

type ConversationWithMeta = Conversation & {
  ride?: Ride | null
  unread_count?: number
}

type Message = {
  id: number
  conversation_id: number
  sender_id: number
  message_text: string
  is_read: boolean
  created_at: string
}

type Review = {
  id: number
  ride_id: string | null
  conversation_id: number | null
  request_id: number | null
  reviewer_id: number
  reviewee_id: number
  rating: number
  comment_text: string | null
  created_at: string
}

type ReviewWithMeta = Review & {
  ride?: Ride | null
}

type UserOverview = {
  id: number
  full_name: string | null
  username: string | null
  phone: string | null
  bio: string | null
  role: UserRole
  car_brand: string | null
  license_plate: string | null
  is_blocked: boolean
  admin_note: string | null
  last_seen_at: string | null
  total_rides: number
  active_rides: number
  total_requests: number
  pending_requests: number
  received_reviews_count: number
  avg_rating: number
}

type UserReport = {
  id: number
  target_user_id: number | null
  ride_id: string | null
  request_id: number | null
  conversation_id: number | null
  message_id: number | null
  reporter_id: number
  reason: string
  details: string | null
  status: ReportStatus
  admin_note: string | null
  created_at: string
  updated_at: string
}

type AdminAuditLog = {
  id: number
  admin_user_id: number
  action_type: string
  entity_type: string
  entity_id: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  note: string | null
  created_at: string
}

const LIMITS = {
  messageMax: 1000,
  rideRequestMessageMax: 1000,
  reviewCommentMax: 1000,
  notesMax: 2000,
  adminNoteMax: 2000,
  reportReasonMax: 300,
  reportDetailsMax: 2000,
}

const styles: Record<string, React.CSSProperties> = {
  page: { maxWidth: 1280, margin: '0 auto', padding: '20px 16px 120px', fontFamily: 'Arial, sans-serif', background: '#f8fafc', minHeight: '100vh', color: '#0f172a' },
  headerCard: { background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)', border: '1px solid #e2e8f0', borderRadius: 20, padding: 22, marginBottom: 18, boxShadow: '0 6px 20px rgba(15, 23, 42, 0.06)' },
  title: { margin: 0, fontSize: 30, fontWeight: 800, color: '#0f172a' },
  subtitle: { marginTop: 8, marginBottom: 0, color: '#475569', fontSize: 15, lineHeight: 1.5 },
  sectionCard: { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 20, marginBottom: 18, boxShadow: '0 3px 14px rgba(15, 23, 42, 0.05)' },
  sectionTitle: { marginTop: 0, marginBottom: 16, fontSize: 22, fontWeight: 800, color: '#0f172a' },
  form: { display: 'grid', gap: 14 },
  fieldWrap: { display: 'grid', gap: 6 },
  label: { fontSize: 14, fontWeight: 700, color: '#334155' },
  input: { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: 15, outline: 'none', boxSizing: 'border-box', transition: 'border 0.2s' },
  select: { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: 15, outline: 'none', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #cbd5e1', background: '#ffffff', color: '#0f172a', fontSize: 15, outline: 'none', boxSizing: 'border-box', resize: 'vertical' },
  primaryButton: { padding: '12px 16px', background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 800, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)' },
  secondaryButton: { padding: '10px 14px', background: '#e2e8f0', color: '#0f172a', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700 },
  ghostButton: { padding: '10px 14px', background: '#ffffff', color: '#0f172a', border: '1px solid #cbd5e1', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700 },
  successButton: { padding: '10px 14px', background: '#16a34a', color: '#ffffff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 800 },
  dangerButton: { padding: '10px 14px', background: '#dc2626', color: '#ffffff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 800 },
  warningButton: { padding: '10px 14px', background: '#f59e0b', color: '#ffffff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 800 },
  closeButton: { padding: '10px 14px', background: '#7c3aed', color: '#ffffff', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 800 },
  cancelButton: { padding: '12px 16px', background: '#94a3b8', color: '#ffffff', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 800 },
  ridesGrid: { display: 'grid', gap: 16 },
  statsGrid: { display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' },
  twoColumnGrid: { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' },
  statsCard: { border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, background: '#ffffff', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.02)' },
  adminStatsCard: { border: '1px solid #e9d5ff', borderRadius: 16, padding: 16, background: '#faf5ff' },
  statLabel: { margin: 0, fontSize: 13, color: '#64748b', fontWeight: 700 },
  statValue: { margin: '8px 0 0', fontSize: 26, color: '#0f172a', fontWeight: 800 },
  myRideCard: { border: '1px solid #bfdbfe', borderRadius: 16, padding: 16, background: '#eff6ff', color: '#0f172a', boxShadow: '0 1px 6px rgba(37, 99, 235, 0.08)' },
  resultCard: { border: '1px solid #cbd5e1', borderRadius: 16, padding: 16, background: '#ffffff', color: '#0f172a', boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)' },
  adminCard: { border: '1px solid #e9d5ff', borderRadius: 16, padding: 16, background: '#fcfaff', color: '#0f172a', boxShadow: '0 1px 6px rgba(124, 58, 237, 0.06)' },
  infoRow: { margin: '6px 0', color: '#1e293b', lineHeight: 1.5 },
  mutedText: { color: '#64748b', fontSize: 14, lineHeight: 1.5 },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 10 },
  chip: { padding: '8px 12px', borderRadius: 999, border: '1px solid #cbd5e1', background: '#ffffff', color: '#334155', cursor: 'pointer', fontSize: 13, fontWeight: 700 },
  chipActive: { padding: '8px 12px', borderRadius: 999, border: '1px solid #2563eb', background: '#dbeafe', color: '#1d4ed8', cursor: 'pointer', fontSize: 13, fontWeight: 800 },
  chipAdmin: { padding: '8px 12px', borderRadius: 999, border: '1px solid #7c3aed', background: '#faf5ff', color: '#6d28d9', cursor: 'pointer', fontSize: 13, fontWeight: 800 },
  buttonRow: { display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 4 },
  actionRow: { display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 10 },
  badge: { display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, marginBottom: 8, background: '#e2e8f0', color: '#0f172a' },
  adminBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, marginBottom: 8, background: '#f3e8ff', color: '#6b21a8' },
  pendingBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, marginBottom: 8, background: '#fef3c7', color: '#92400e' },
  approvedBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, marginBottom: 8, background: '#dcfce7', color: '#166534' },
  rejectedBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, marginBottom: 8, background: '#fee2e2', color: '#991b1b' },
  fullBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, marginBottom: 8, background: '#ede9fe', color: '#5b21b6' },
  completedBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, marginBottom: 8, background: '#d1fae5', color: '#065f46' },
  warningBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800, marginBottom: 8, background: '#fef9c3', color: '#b45309' }, 
  unreadBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 22, height: 22, padding: '0 8px', borderRadius: 999, background: '#ef4444', color: '#ffffff', fontSize: 12, fontWeight: 800, marginLeft: 8 },
  chatLayout: { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' },
  conversationList: { display: 'grid', gap: 12 },
  conversationCard: { border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, background: '#ffffff', cursor: 'pointer', transition: '0.2s' },
  conversationCardActive: { border: '1px solid #2563eb', borderRadius: 14, padding: 14, background: '#eff6ff', cursor: 'pointer' },
  chatPanel: { border: '1px solid #e2e8f0', borderRadius: 16, background: '#ffffff', padding: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.03)' },
  messageList: { display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto', paddingBottom: 8, marginBottom: 14 },
  myMessage: { alignSelf: 'flex-end', maxWidth: '80%', background: '#2563eb', color: '#ffffff', padding: '10px 14px', borderRadius: '16px 16px 2px 16px' },
  otherMessage: { alignSelf: 'flex-start', maxWidth: '80%', background: '#f1f5f9', color: '#0f172a', padding: '10px 14px', borderRadius: '16px 16px 16px 2px' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', padding: '10px 8px', borderBottom: '1px solid #e2e8f0', color: '#475569', whiteSpace: 'nowrap' },
  td: { padding: '10px 8px', borderBottom: '1px solid #eef2f7', verticalAlign: 'top' },
  bottomNav: { position: 'fixed', bottom: 0, left: 0, right: 0, background: '#ffffff', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-around', paddingBottom: '22px', paddingTop: '10px', zIndex: 1000, boxShadow: '0 -4px 20px rgba(0,0,0,0.05)' },
  navItem: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#64748b', cursor: 'pointer', fontSize: 11, fontWeight: 700, background: 'transparent', border: 'none', outline: 'none', transition: 'color 0.2s' },
  navItemActive: { color: '#2563eb' },
  profileBlock: { padding: 20, background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }
}

function pad(value: number) { return String(value).padStart(2, '0') }
function addDays(base: Date, days: number) { const d = new Date(base); d.setDate(d.getDate() + days); return d }
function toDateInputValue(date: Date) { return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` }
function toTimeInputValue(date: Date) { return `${pad(date.getHours())}:${pad(date.getMinutes())}` }
function roundToNextMinutes(date: Date, step = 5) { const d = new Date(date); d.setSeconds(0, 0); const minutes = d.getMinutes(); const rounded = Math.ceil(minutes / step) * step; if (rounded === 60) { d.setHours(d.getHours() + 1); d.setMinutes(0); } else { d.setMinutes(rounded); } return d }

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  try { return new Date(value).toLocaleString() } catch { return String(value) }
}

function normalizeText(value: string | null | undefined) { return (value || '').toLowerCase().trim() }
function getRoleLabel(role: UserRole | null) { return role === 'passenger' ? 'Sərnişin' : 'Sürücü' }

function getRequestStatusLabel(status: RideRequestStatus) {
  if (status === 'accepted') return 'Qəbul edildi'
  if (status === 'rejected') return 'Rədd edildi'
  if (status === 'cancelled') return 'Ləğv edildi'
  return 'Gözləmədə'
}

function getRequestBadgeStyle(status: RideRequestStatus) {
  if (status === 'accepted') return styles.approvedBadge
  if (status === 'rejected' || status === 'cancelled') return styles.rejectedBadge
  return styles.pendingBadge
}

function getReportBadgeStyle(status: ReportStatus) {
  if (status === 'resolved') return styles.approvedBadge
  if (status === 'dismissed') return styles.rejectedBadge
  if (status === 'in_review') return styles.fullBadge
  return styles.pendingBadge
}

function renderStars(ratingStr: string | number) {
  const r = Number(ratingStr)
  if (isNaN(r) || r === 0) return '★★★★★ (5.0)'
  const full = Math.round(r)
  const empty = Math.max(0, 5 - full)
  return '★'.repeat(full) + '☆'.repeat(empty) + ` (${r.toFixed(1)})`
}

function getReportStatusLabel(status: ReportStatus) {
  if (status === 'in_review') return 'Baxılır'
  if (status === 'resolved') return 'Həll edildi'
  if (status === 'dismissed') return 'Ləğv edilib'
  return 'Açıq'
}

function isRideExpired(ride: Ride | null | undefined) {
  if (!ride || !ride.ride_date) return false;
  const rideDateTime = new Date(`${ride.ride_date}T${ride.departure_time}:00`);
  return rideDateTime.getTime() + 2 * 60 * 60 * 1000 < new Date().getTime(); // 2 saat
}

function getRideStatusLabel(ride: Ride) {
  if (ride.status === 'full') return 'Bağlı'
  if (ride.status === 'cancelled') return 'Ləğv edildi'
  if (ride.status === 'completed') return 'Tamamlandı'
  if (isRideExpired(ride) && ride.status === 'active') return 'Vaxtı bitib'
  return 'Aktiv'
}
function getRideBadgeStyle(ride: Ride) {
  if (ride.status === 'full') return styles.fullBadge
  if (ride.status === 'completed') return styles.completedBadge
  if (ride.status === 'cancelled') return styles.rejectedBadge
  if (isRideExpired(ride) && ride.status === 'active') return styles.warningBadge
  return styles.approvedBadge
}

const triggerVibration = (type: string = 'medium') => {
  try { if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.HapticFeedback) { (window as any).Telegram.WebApp.HapticFeedback.impactOccurred(type); } } catch (e) { }
};

export default function Home() {
  const [isAdminMode, setIsAdminMode] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')
  const [chatFilter, setChatFilter] = useState<'active' | 'closed'>('active')
  const [reqView, setReqView] = useState<'incoming' | 'outgoing'>('incoming')
  const [reqStatus, setReqStatus] = useState<'active' | 'archived'>('active')
  const [adminSection, setAdminSection] = useState<AdminSection>('overview')

  const [tgReady, setTgReady] = useState(false)

  const [rides, setRides] = useState<Ride[]>([])
  const [allRidesAdmin, setAllRidesAdmin] = useState<Ride[]>([])
  const [allMyRides, setAllMyRides] = useState<Ride[]>([])
  const [myRides, setMyRides] = useState<Ride[]>([])
  const [historyRides, setHistoryRides] = useState<Ride[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [rideRequests, setRideRequests] = useState<RideRequestWithRide[]>([])
  const [allRideRequestsAdmin, setAllRideRequestsAdmin] = useState<RideRequestWithRide[]>([])
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([])
  const [allConversationsAdmin, setAllConversationsAdmin] = useState<ConversationWithMeta[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [allMessagesAdmin, setAllMessagesAdmin] = useState<Message[]>([])
  const [reviews, setReviews] = useState<ReviewWithMeta[]>([])
  const [allReviewsAdmin, setAllReviewsAdmin] = useState<ReviewWithMeta[]>([])
  const [adminUsers, setAdminUsers] = useState<UserOverview[]>([])
  const [adminReports, setAdminReports] = useState<UserReport[]>([])
  const [adminAuditLogs, setAdminAuditLogs] = useState<AdminAuditLog[]>([])
  
  const [driverProfilesMap, setDriverProfilesMap] = useState<Record<number, { name: string, rating: string, gender: string, carBrand: string, carColor: string, licensePlate: string }>>({})

  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null)
  const [unreadTotal, setUnreadTotal] = useState(0)

  const selectedConversationIdRef = useRef<number | null>(null)
  
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [rideRequestLoading, setRideRequestLoading] = useState<string | number | null>(null)
  const [rideActionLoading, setRideActionLoading] = useState<string | null>(null)
  const [adminLoadingId, setAdminLoadingId] = useState<string | number | null>(null)
  const [messageSending, setMessageSending] = useState(false)
  const [message, setMessage] = useState('')
  const [locationPickerOpen, setLocationPickerOpen] = useState(false)
  const [locationPickerTarget, setLocationPickerTarget] = useState<'origin' | 'destination'>('origin')
  const [originLat, setOriginLat] = useState<number | null>(null)
  const [originLng, setOriginLng] = useState<number | null>(null)
  const [destLat, setDestLat] = useState<number | null>(null)
  const [destLng, setDestLng] = useState<number | null>(null)
  const [editingRideId, setEditingRideId] = useState<string | null>(null)

  const [initialRole, setInitialRole] = useState<UserRole>('passenger')
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [rideDate, setRideDate] = useState('')
  const [departureTime, setDepartureTime] = useState('')
  const [seats, setSeats] = useState('1')
  const [pricePerSeat, setPricePerSeat] = useState('')
  const [notes, setNotes] = useState('')

  const [profileFullName, setProfileFullName] = useState('')
  const [profileUsername, setProfileUsername] = useState('')
  const [profilePhone, setProfilePhone] = useState('')
  const [profileBio, setProfileBio] = useState('')
  const [profileGender, setProfileGender] = useState<'male' | 'female'>('male')
  const [profileHomeAddress, setProfileHomeAddress] = useState('')
  const [profileWorkAddress, setProfileWorkAddress] = useState('')
  const [womenOnly, setWomenOnly] = useState(false)
  
  const [carBrand, setCarBrand] = useState('')
  const [carColor, setCarColor] = useState('')
  const [licensePlate, setLicensePlate] = useState('')

  const [searchText, setSearchText] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterGender, setFilterGender] = useState('')
  const [filterDate, setFilterDate] = useState('')

  const [requestMessageMap, setRequestMessageMap] = useState<Record<string, string>>({})
  const [requestSeatsMap, setRequestSeatsMap] = useState<Record<string, string>>({})
  const [chatInput, setChatInput] = useState('')

  const [reviewTargetRequestId, setReviewTargetRequestId] = useState<number | null>(null)
  const [reviewRating, setReviewRating] = useState('5')
  const [reviewComment, setReviewComment] = useState('')

  const [supportEmail, setSupportEmail] = useState('')
  const [supportMessage, setSupportMessage] = useState('')
  const [supportLoading, setSupportLoading] = useState(false)

  const [reportTargetUserId, setReportTargetUserId] = useState('')
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')

  const [adminUserBlockedMap, setAdminUserBlockedMap] = useState<Record<number, boolean>>({})
  const [adminUserNoteMap, setAdminUserNoteMap] = useState<Record<number, string>>({})
  const [adminReportStatusMap, setAdminReportStatusMap] = useState<Record<number, ReportStatus>>({})
  const [adminReportNoteMap, setAdminReportNoteMap] = useState<Record<number, string>>({})
  const [adminGlobalSearch, setAdminGlobalSearch] = useState('')

  const [adminEditingRideId, setAdminEditingRideId] = useState<string | null>(null)
  const [adminRideOrigin, setAdminRideOrigin] = useState('')
  const [adminRideDestination, setAdminRideDestination] = useState('')
  const [adminRideDate, setAdminRideDate] = useState('')
  const [adminRideTime, setAdminRideTime] = useState('')
  const [adminRideSeats, setAdminRideSeats] = useState('1')
  const [adminRidePrice, setAdminRidePrice] = useState('0')
  const [adminRideNotes, setAdminRideNotes] = useState('')
  const [adminRideStatus, setAdminRideStatus] = useState<RideStatus>('active')

  const [adminEditingRequestId, setAdminEditingRequestId] = useState<number | null>(null)
  const [adminRequestStatus, setAdminRequestStatus] = useState<RideRequestStatus>('pending')
  const [adminRequestSeats, setAdminRequestSeats] = useState('1')
  const [adminRequestMessage, setAdminRequestMessage] = useState('')

  const [adminEditingMessageId, setAdminEditingMessageId] = useState<number | null>(null)
  const [adminMessageText, setAdminMessageText] = useState('')

  const [adminEditingReviewId, setAdminEditingReviewId] = useState<number | null>(null)
  const [adminReviewRating, setAdminReviewRating] = useState('5')
  const [adminReviewComment, setAdminReviewComment] = useState('')

  const prevUnreadRef = useRef(0);

  useEffect(() => {
    if (unreadTotal > prevUnreadRef.current) {
      setMessage('🔔 Yeni mesajınız var!');
      triggerVibration('medium');
    }
    prevUnreadRef.current = unreadTotal || 0;
  }, [unreadTotal]);
  
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => { setMessage('') }, 4000)
      return () => clearTimeout(timer)
    }
  }, [message])

  function getActiveUser() {
    if (typeof window === 'undefined') { return { driverId: 0, username: '', fullName: '', appRole: 'passenger' as AppRole } }
    const tg = (window as any)?.Telegram?.WebApp
    const user = tg?.initDataUnsafe?.user
    if (!user) { return { driverId: 0, username: 'guest', fullName: 'Guest', appRole: 'passenger' as AppRole } }
    const adminIds = (process.env.NEXT_PUBLIC_ADMIN_IDS ?? '').split(',').map((s: string) => s.trim()).filter(Boolean)
    const userIdStr = String(user.id)
    const isAdminUser = adminIds.includes(userIdStr) || adminIds.includes(String(Number(userIdStr)))
    return { driverId: user.id as number, username: (user.username as string) || `tg${user.id}`, fullName: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'User', appRole: isAdminUser ? ('admin' as AppRole) : ('driver' as AppRole), }
  }

  const currentUser = getActiveUser()
  const isRealAdmin = currentUser.appRole === 'admin'
  const isAdmin = isRealAdmin && isAdminMode

  useEffect(() => { if (isAdmin) { void getAdminData(); } }, [isAdmin]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let rawInput = e.target.value.replace(/\D/g, ''); 
    if (!rawInput) { setProfilePhone(''); return; }
    if (rawInput.startsWith('0')) { rawInput = '994' + rawInput.substring(1); } else if (!rawInput.startsWith('994') && rawInput.length > 0) { rawInput = '994' + rawInput; }
    rawInput = rawInput.substring(0, 12); 
    let formatted = '+994';
    if (rawInput.length > 3) formatted += ' ' + rawInput.substring(3, 5);
    if (rawInput.length > 5) formatted += ' ' + rawInput.substring(5, 8);
    if (rawInput.length > 8) formatted += ' ' + rawInput.substring(8, 10);
    if (rawInput.length > 10) formatted += ' ' + rawInput.substring(10, 12);
    setProfilePhone(formatted);
  };

  function resetRideForm() {
    setEditingRideId(null); setOrigin(''); setDestination(''); setRideDate(''); setDepartureTime(''); setSeats('1'); setPricePerSeat(''); setNotes(''); setOriginLat(null); setOriginLng(null); setDestLat(null); setDestLng(null)
  }

  function setToday() { setRideDate(toDateInputValue(new Date())) }
  function setTomorrow() { setRideDate(toDateInputValue(addDays(new Date(), 1))) }
  function setPlusTwoDays() { setRideDate(toDateInputValue(addDays(new Date(), 2))) }
  function setNowTime() { setDepartureTime(toTimeInputValue(roundToNextMinutes(new Date(), 5))) }
  function setPlus30Min() { const d = new Date(); d.setMinutes(d.getMinutes() + 30); setDepartureTime(toTimeInputValue(roundToNextMinutes(d, 5))) }
  function setPlus60Min() { const d = new Date(); d.setMinutes(d.getMinutes() + 60); setDepartureTime(toTimeInputValue(roundToNextMinutes(d, 5))) }
  function setPresetTime(value: string) { setDepartureTime(value) }

  useEffect(() => { selectedConversationIdRef.current = selectedConversationId }, [selectedConversationId])

  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp
    if (tg) { tg.ready(); tg.expand() }
    setTgReady(true)
    void initializeData()
  }, [])

  useEffect(() => {
    const activeUserId = getActiveUser().driverId
    const channels = [
      supabase.channel(`messages-live-${activeUserId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async () => { const currentSelectedId = selectedConversationIdRef.current; if (currentSelectedId && !isAdmin) { await getMessages(currentSelectedId, false) } await getConversations(false); if (isAdmin) await getAdminData() }).subscribe(),
      supabase.channel(`ride-requests-live-${activeUserId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, async () => { await getRideRequests(); await getAllMyRides(); if (isAdmin) await getAdminData() }).subscribe(),
      supabase.channel(`conversations-live-${activeUserId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, async () => { await getConversations(false); if (isAdmin) await getAdminData() }).subscribe(),
      supabase.channel(`ride-listings-live-${activeUserId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'ride_listings' }, async () => { await getRides(); await getAllMyRides(); if (isAdmin) await getAdminData() }).subscribe(),
      supabase.channel(`reviews-live-${activeUserId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, async () => { await getReviews(); if (isAdmin) await getAdminData() }).subscribe(),
      supabase.channel(`reports-live-${activeUserId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'user_reports' }, async () => { if (isAdmin) await getAdminData() }).subscribe(),
      supabase.channel(`profiles-live-${activeUserId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => { await getProfile(); if (isAdmin) await getAdminData() }).subscribe(),
      supabase.channel(`audit-live-${activeUserId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'admin_audit_logs' }, async () => { if (isAdmin) await getAdminData() }).subscribe(),
    ]
    return () => { channels.forEach((channel) => { void supabase.removeChannel(channel) }) }
  }, [isAdmin])

  useEffect(() => {
    if (isAdmin) return
    if (conversations.length === 0) { if (selectedConversationId !== null) { setSelectedConversationId(null); setMessages([]) }; return }
    const selectedStillExists = conversations.some((item) => item.id === selectedConversationId)
    if (selectedConversationId === null || !selectedStillExists) { setSelectedConversationId(conversations[0].id) }
  }, [conversations, selectedConversationId, isAdmin])

  useEffect(() => {
    if (isAdmin) return; if (!selectedConversationId) return; void getMessages(selectedConversationId)
  }, [selectedConversationId, isAdmin])

  useEffect(() => {
    const fastInterval = setInterval(() => { if (document.hidden) return; getRideRequests(); getConversations(true); getAllMyRides(); if (selectedConversationIdRef.current) { getMessages(selectedConversationIdRef.current, false); } }, 10000);
    const slowInterval = setInterval(() => { if (document.hidden) return; getRides(); }, 60000);
    return () => { clearInterval(fastInterval); clearInterval(slowInterval); };
  }, []);

  async function initializeData() {
    setMessage(''); setSelectedConversationId(null); setMessages([])
    await Promise.all([ ensureUserRecord(), getProfile(), getRides(), getAllMyRides(), getRideRequests(), getConversations(false), getReviews(), isAdmin ? getAdminData() : Promise.resolve(), ])
  }

  async function ensureUserRecord() {
    const current = getActiveUser(); if (!current.driverId) return
    await supabase.from('users').upsert({ id: current.driverId, username: current.username, full_name: current.fullName })
    const { data } = await supabase.from('profiles').select('id,role').eq('id', current.driverId).maybeSingle()
    if (!data) { await supabase.from('profiles').insert({ id: current.driverId, full_name: current.fullName, username: current.username, role: 'passenger' as UserRole, is_blocked: false, admin_note: null, last_seen_at: new Date().toISOString(), }) } else { await supabase.from('profiles').update({ last_seen_at: new Date().toISOString() }).eq('id', current.driverId) }
  }

  async function getProfile() {
    const current = getActiveUser()
    const { data, error } = await supabase.from('profiles').select('*').eq('id', current.driverId).maybeSingle()
    if (error) { console.error('Profile error:', error); return }
    if (data) {
      const p = data as Profile
      setProfile(p); setProfileFullName(p.full_name || current.fullName); setProfileUsername(p.username || current.username); setProfilePhone(p.phone || ''); setProfileBio(p.bio || ''); setProfileGender(p.gender || 'male'); setProfileHomeAddress(p.home_address || ''); setProfileWorkAddress(p.work_address || '');
      setCarBrand(p.car_brand || ''); setLicensePlate(p.license_plate || ''); setCarColor(p.car_color || (p.role === 'driver' ? 'Qara' : '')); setInitialRole(p.role || 'passenger')
    } else {
      setProfile(null); setProfileFullName(current.fullName); setProfileUsername(current.username); setProfilePhone(''); setProfileBio(current.appRole === 'admin' ? 'Admin' : ''); setProfileGender('male'); setProfileHomeAddress(''); setProfileWorkAddress(''); setCarBrand(''); setLicensePlate(''); setCarColor(''); setInitialRole('passenger')
    }
  }

  async function getRides() {
    setLoading(true)
    const { data, error } = await supabase.from('ride_listings').select('*').eq('status', 'active').order('created_at', { ascending: false })
    if (error) { console.error('Ride list error:', error); setMessage('Aktiv elanlar yüklənmədi.') } else {
      const rows = (data as Ride[]) || []
      const validRows = rows.filter(r => !isRideExpired(r));
      setRides(validRows)

      const driverIds = [...new Set(validRows.map((r) => r.driver_id))]
      if (driverIds.length > 0) {
          const [profilesRes, reviewsRes] = await Promise.all([
          supabase.from('profiles').select('id, full_name, username, gender, car_brand, car_color, license_plate').in('id', driverIds),
          supabase.from('reviews').select('reviewee_id, rating').in('reviewee_id', driverIds)
        ])
        const pData = profilesRes.data || []; const rData = reviewsRes.data || []; const newMap: Record<number, { name: string, rating: string, gender: string, carBrand: string, carColor: string, licensePlate: string }> = {}
        pData.forEach(p => {
          const userReviews = rData.filter(r => r.reviewee_id === p.id)
          const avgRating = userReviews.length > 0 ? (userReviews.reduce((sum, r) => sum + r.rating, 0) / userReviews.length).toFixed(1) : '5.0'
          newMap[p.id] = { name: p.full_name || p.username || 'User', rating: avgRating, gender: p.gender || 'male', carBrand: p.car_brand || '', carColor: p.car_color || 'Qara', licensePlate: p.license_plate || '' }
        })
        setDriverProfilesMap(newMap)
      }
    }
    setLoading(false)
  }

  async function getAllMyRides() {
    const current = getActiveUser()
    const { data, error } = await supabase.from('ride_listings').select('*').eq('driver_id', current.driverId).order('created_at', { ascending: false })
    if (error) { console.error('My rides error:', error); return }

    const rows = (data as Ride[]) || []
    const active = rows.filter(r => r.status === 'active' && !isRideExpired(r));
    const history = rows.filter(r => !active.includes(r));

    setAllMyRides(rows); setMyRides(active); setHistoryRides(history)
  }

  async function getRideRequests() {
    const current = getActiveUser()
    const { data, error } = await supabase.from('ride_requests').select('*').or(`requester_id.eq.${current.driverId},owner_id.eq.${current.driverId}`).order('id', { ascending: false })
    if (error) { console.error('Requests error:', error); return }
    const rows = (data as RideRequest[]) || []
    const rideIds = [...new Set(rows.map((x) => x.ride_id).filter(Boolean))]
    let rideMap = new Map<string, Ride>()
    if (rideIds.length > 0) { const { data: ridesData } = await supabase.from('ride_listings').select('*').in('id', rideIds); rideMap = new Map(((ridesData as Ride[]) || []).map((ride) => [ride.id, ride])) }
    setRideRequests(rows.map((item) => ({ ...item, ride: rideMap.get(item.ride_id) || null })))
  }

  async function getReviews() {
    const current = getActiveUser()
    const { data, error } = await supabase.from('reviews').select('*').or(`reviewer_id.eq.${current.driverId},reviewee_id.eq.${current.driverId}`).order('id', { ascending: false })
    if (error) { console.error('Reviews error:', error); return }
    const rows = (data as Review[]) || []
    const rideIds = [...new Set(rows.map((x) => x.ride_id).filter(Boolean))] as string[]
    let rideMap = new Map<string, Ride>()
    if (rideIds.length > 0) { const { data: ridesData } = await supabase.from('ride_listings').select('*').in('id', rideIds); rideMap = new Map(((ridesData as Ride[]) || []).map((ride) => [ride.id, ride])) }
    setReviews(rows.map((item) => ({ ...item, ride: item.ride_id ? rideMap.get(item.ride_id) || null : null })))
  }

  async function getAdminData() {
    if (!isAdmin) return
    const [ridesRes, requestsRes, conversationsRes, messagesRes, reviewsRes, usersRes, reportsRes, auditRes] = await Promise.all([
        supabase.from('ride_listings').select('*').order('created_at', { ascending: false }), supabase.from('ride_requests').select('*').order('id', { ascending: false }), supabase.from('conversations').select('*').order('updated_at', { ascending: false }), supabase.from('messages').select('*').order('created_at', { ascending: false }), supabase.from('reviews').select('*').order('id', { ascending: false }), supabase.from('admin_user_overview').select('*').order('id', { ascending: false }), supabase.from('user_reports').select('*').order('created_at', { ascending: false }), supabase.from('admin_audit_logs').select('*').order('created_at', { ascending: false }).limit(200),
      ])

    const ridesRows = (ridesRes.data as Ride[]) || []; const requestRows = (requestsRes.data as RideRequest[]) || []; const conversationRows = (conversationsRes.data as Conversation[]) || []; const messageRows = (messagesRes.data as Message[]) || []; const reviewRows = (reviewsRes.data as Review[]) || []; const userRows = (usersRes.data as UserOverview[]) || []; const reportRows = (reportsRes.data as UserReport[]) || []; const auditRows = (auditRes.data as AdminAuditLog[]) || []
    const rideMap = new Map(ridesRows.map((ride) => [ride.id, ride]))

    setAllRidesAdmin(ridesRows); setAllRideRequestsAdmin(requestRows.map((item) => ({ ...item, ride: rideMap.get(item.ride_id) || null }))); setAllConversationsAdmin(conversationRows.map((item) => ({ ...item, ride: rideMap.get(item.ride_id) || null, unread_count: 0 }))); setAllMessagesAdmin(messageRows); setAllReviewsAdmin(reviewRows.map((item) => ({ ...item, ride: item.ride_id ? rideMap.get(item.ride_id) || null : null }))); setAdminUsers(userRows); setAdminReports(reportRows); setAdminAuditLogs(auditRows)

    const userBlockedMap: Record<number, boolean> = {}; const userNoteMap: Record<number, string> = {}; const reportStatusMap: Record<number, ReportStatus> = {}; const reportNoteMap: Record<number, string> = {}
    userRows.forEach((user) => { userBlockedMap[user.id] = user.is_blocked; userNoteMap[user.id] = user.admin_note || '' }); reportRows.forEach((report) => { reportStatusMap[report.id] = report.status; reportNoteMap[report.id] = report.admin_note || '' })
    setAdminUserBlockedMap(userBlockedMap); setAdminUserNoteMap(userNoteMap); setAdminReportStatusMap(reportStatusMap); setAdminReportNoteMap(reportNoteMap)
  }

  async function markConversationMessagesAsRead(conversationId: number) {
    const current = getActiveUser(); if (isAdmin) return
    await supabase.from('messages').update({ is_read: true }).eq('conversation_id', conversationId).eq('is_read', false).neq('sender_id', current.driverId)
  }

  async function getConversations(preserveSelection = true) {
    const current = getActiveUser()
    const { data, error } = await supabase.from('conversations').select('*').or(`driver_user_id.eq.${current.driverId},passenger_user_id.eq.${current.driverId}`).order('updated_at', { ascending: false })
    if (error) { console.error('Conversations error:', error); return }

    const rows = (data as Conversation[]) || []
    const rideIds = [...new Set(rows.map((x) => x.ride_id).filter(Boolean))]
    let rideMap = new Map<string, Ride>()

    if (rideIds.length > 0) {
      const { data: ridesData } = await supabase.from('ride_listings').select('*').in('id', rideIds)
      rideMap = new Map(((ridesData as Ride[]) || []).map((ride) => [ride.id, ride]))

      const driverIds = [...new Set(((ridesData as Ride[]) || []).map(r => r.driver_id))];
      if (driverIds.length > 0) {
        const { data: pData } = await supabase.from('profiles').select('id, full_name, username, gender, car_brand, car_color, license_plate').in('id', driverIds);
        if (pData) {
          setDriverProfilesMap(prev => {
            const newMap = { ...prev };
            pData.forEach(p => {
              if (!newMap[p.id]) { newMap[p.id] = { name: p.full_name || p.username || 'User', rating: '5.0', gender: p.gender || 'male', carBrand: p.car_brand || '', carColor: p.car_color || 'Qara', licensePlate: p.license_plate || '' }; } 
              else { newMap[p.id].carBrand = p.car_brand || ''; newMap[p.id].carColor = p.car_color || 'Qara'; newMap[p.id].licensePlate = p.license_plate || ''; }
            }); return newMap;
          });
        }
      }
    }

    const unreadMap = new Map<number, number>()
    const activeConversationIds = rows.filter(c => c.status !== 'closed').map((x) => x.id)
    if (activeConversationIds.length > 0) {
      const { data: unreadRows } = await supabase.from('messages').select('conversation_id').in('conversation_id', activeConversationIds).eq('is_read', false).neq('sender_id', current.driverId)
      for (const row of unreadRows || []) { const conversationId = (row as { conversation_id: number }).conversation_id; unreadMap.set(conversationId, (unreadMap.get(conversationId) || 0) + 1) }
    }

    const enriched = rows.map((item) => ({ ...item, ride: rideMap.get(item.ride_id) || null, unread_count: unreadMap.get(item.id) || 0 }))
    setConversations(enriched); setUnreadTotal(enriched.reduce((sum, item) => sum + (item.unread_count || 0), 0))

    if (enriched.length === 0) { setSelectedConversationId(null); setMessages([]); return }
    if (!preserveSelection) return
    const currentSelectedId = selectedConversationIdRef.current; const selectedStillExists = enriched.some((item) => item.id === currentSelectedId)
    if (currentSelectedId === null || !selectedStillExists) { setSelectedConversationId(enriched[0].id) }
  }

  async function getMessages(conversationId: number, markRead = true) {
    const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true })
    if (error) { console.error('Messages error:', error); return }
    setMessages((data as Message[]) || [])
    if (markRead) { await markConversationMessagesAsRead(conversationId); await getConversations(false) }
  }

  async function logAdminAction( actionType: string, entityType: string, entityId: string, oldData: Record<string, unknown> | null = null, newData: Record<string, unknown> | null = null, note: string | null = null ) {
    if (!isAdmin) return
    await supabase.from('admin_audit_logs').insert({ admin_user_id: currentUser.driverId, action_type: actionType, entity_type: entityType, entity_id: entityId, old_data: oldData, new_data: newData, note, })
  }

  async function handleCreateOrUpdateProfile(e: React.FormEvent) {
    e.preventDefault(); setProfileSaving(true); setMessage('')
    const current = getActiveUser()
    const safePhone = profilePhone || ''; const digitsOnly = safePhone.replace(/\D/g, ''); 

    if (digitsOnly.length !== 12) { setMessage('⚠️ Telefon nömrəsini tam daxil edin (Məs: +994 50 123 45 67)'); setProfileSaving(false); return }

    const effectiveRole = profile ? profile.role : initialRole

    if (effectiveRole === 'driver' && (!carBrand.trim() || !licensePlate.trim() || !carColor.trim())) {
      setMessage('⚠️ Sürücü üçün avtomobil markası, nömrəsi və rəngi məcburidir.')
      setProfileSaving(false)
      return
    }

    const payload = { id: current.driverId, full_name: profileFullName.trim(), username: profileUsername.trim(), phone: profilePhone.trim(), bio: profileBio.trim(), gender: profileGender, home_address: profileHomeAddress.trim() || null, work_address: profileWorkAddress.trim() || null, role: effectiveRole, car_brand: carBrand.trim() || null, license_plate: licensePlate.trim() || null, car_color: carColor.trim() || 'Qara', last_seen_at: new Date().toISOString(), }
    const { error } = await supabase.from('profiles').upsert(payload)
    if (error) { setMessage('Profil yadda saxlanmadı.') } else { setMessage('✅ Profil yadda saxlanıldı.'); await getProfile() }
    setProfileSaving(false)
  }

  async function handleSubmitRide(e: React.FormEvent) {
    triggerVibration('medium'); e.preventDefault(); triggerVibration('heavy'); setSubmitting(true); setMessage('')

    const current = getActiveUser()
    if (!profile) { setMessage('Əvvəl profil yaratmaq lazımdır.'); setSubmitting(false); return }
    if (profile.is_blocked) { setMessage('Profil bloklandığı üçün elan yarada bilməzsən.'); setSubmitting(false); return }

    const cleanOrigin = origin.trim(); const cleanDestination = destination.trim(); const cleanNotes = notes.trim()

    if (!cleanOrigin || !cleanDestination) { setMessage('Haradan və hara məcburidir.'); setSubmitting(false); return }
    if (cleanNotes.length > LIMITS.notesMax) { setMessage(`Qeyd max ${LIMITS.notesMax} simvol ola bilər.`); setSubmitting(false); return }

    const seatsNumber = Number(seats); const priceNumber = Number(pricePerSeat)
    if (!Number.isFinite(seatsNumber) || seatsNumber < 1 || seatsNumber > 20) { setMessage('Yer sayı 1-20 arası olmalıdır.'); setSubmitting(false); return }
    if (!Number.isFinite(priceNumber) || priceNumber < 0) { setMessage('Qiymət düzgün daxil edilməlidir.'); setSubmitting(false); return }

    const duplicateActiveRide = myRides.find((ride) => {
      if (editingRideId && ride.id === editingRideId) return false
      return ( normalizeText(ride.origin) === normalizeText(cleanOrigin) && normalizeText(ride.destination) === normalizeText(cleanDestination) && (ride.ride_date || '') === rideDate && ride.departure_time === departureTime && ride.status === 'active' )
    })

    if (duplicateActiveRide) { setMessage('Bu marşrut, tarix və saat üçün artıq aktiv elan var.'); setSubmitting(false); return }

    if (editingRideId) {
      const { error } = await supabase.from('ride_listings').update({ role: profile.role, origin: cleanOrigin, destination: cleanDestination, ride_date: rideDate, departure_time: departureTime, seats: seatsNumber, price_per_seat: priceNumber, women_only: womenOnly, notes: cleanNotes || null, updated_at: new Date().toISOString(), }).eq('id', editingRideId)
      if (error) { setMessage('Elan yenilənmədi.') } else { setMessage('Elan yeniləndi.'); resetRideForm(); await initializeData(); setActiveTab('dashboard') }
    } else {
      const { error } = await supabase.from('ride_listings').insert({ driver_id: current.driverId, role: profile.role, origin: cleanOrigin, destination: cleanDestination, origin_lat: originLat, origin_lng: originLng, destination_lat: destLat, destination_lng: destLng, ride_date: rideDate, departure_time: departureTime, seats: seatsNumber, price_per_seat: priceNumber, is_recurring: false, women_only: womenOnly, notes: cleanNotes || null, status: 'active', })
      if (error) { setMessage('Elan əlavə olunmadı.') } else { setMessage('🎉 Elanınız uğurla yerləşdirildi!'); resetRideForm(); await initializeData(); setActiveTab('dashboard') }
    }
    setSubmitting(false)
  }

  function handleEditRide(ride: Ride) {
    setEditingRideId(ride.id); setOrigin(ride.origin || ''); setDestination(ride.destination || ''); setRideDate(ride.ride_date || ''); setDepartureTime(ride.departure_time || ''); setSeats(String(ride.seats ?? 1)); setPricePerSeat(String(ride.price_per_seat ?? '')); setNotes(ride.notes || ''); setWomenOnly(ride.women_only || false);
    setActiveTab('create'); window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDeleteRide(rideId: string) {
    if (!window.confirm('Bu elanı ləğv etmək istəyirsən?')) return
    setRideActionLoading(rideId)
    const { error } = await supabase.from('ride_listings').update({ status: 'cancelled', closed_reason: 'driver_cancelled', updated_at: new Date().toISOString() }).eq('id', rideId)
    if (error) { setMessage('Elan ləğv edilmədi.') } else { setMessage('Elan ləğv edildi.'); if (editingRideId === rideId) resetRideForm(); await initializeData() }
    setRideActionLoading(null)
  }

  async function handleCloseRide(rideId: string) {
    if (!window.confirm('Bu elanı bağlamaq istəyirsən?')) return
    setRideActionLoading(rideId)
    const { error } = await supabase.from('ride_listings').update({ status: 'full', closed_reason: 'manually_closed', updated_at: new Date().toISOString() }).eq('id', rideId)
    if (error) { setMessage('Elan bağlanmadı.') } else { setMessage('Elan bağlandı.'); await initializeData() }
    setRideActionLoading(null)
  }

  async function handleCompleteRide(rideId: string) {
    if (!window.confirm('Bu elanı tamamlandı kimi işarələmək istəyirsən?')) return
    setRideActionLoading(rideId)
    const { error } = await supabase.from('ride_listings').update({ status: 'completed', completed_at: new Date().toISOString(), closed_reason: 'completed', updated_at: new Date().toISOString() }).eq('id', rideId)
    if (error) { setMessage('Elan tamamlanmadı.') } else { setMessage('Elan tamamlandı.'); await initializeData() }
    setRideActionLoading(null)
  }

  async function handleCreateRideRequest(ride: Ride) {
    const current = getActiveUser()
    if (!profile) { setMessage('Əvvəl profil yaratmaq lazımdır.'); return }
    if (profile.is_blocked) { setMessage('Profil bloklandığı üçün müraciət göndərə bilməzsən.'); return }
    if (ride.driver_id === current.driverId) { setMessage('Öz elanına müraciət edə bilməzsən.'); return }
    if (ride.status !== 'active') { setMessage('Bu elan artıq aktiv deyil.'); return }

    const requestMessage = (requestMessageMap[ride.id] || '').trim()
    const requestedSeats = Number(requestSeatsMap[ride.id] || '1')

    if (requestMessage.length > LIMITS.rideRequestMessageMax) { setMessage(`Mesaj max ${LIMITS.rideRequestMessageMax} simvol.`); return }
    if (!Number.isFinite(requestedSeats) || requestedSeats < 1 || requestedSeats > 20) { setMessage('Yer sayı 1-20 arası olmalıdır.'); return }
    if (requestedSeats > ride.seats) { setMessage(`Maksimum ${ride.seats} yer qalıb.`); return }

    const existingPending = rideRequests.find((item) => item.ride_id === ride.id && item.requester_id === current.driverId && (item.status === 'pending' || item.status === 'accepted'))
    if (existingPending) { setMessage('Bu elana artıq aktiv müraciətin var.'); return }

    setRideRequestLoading(ride.id)
    const requesterRole = profile.role; const ownerRole = ride.role === 'driver' ? 'driver' : 'passenger'

    const { error } = await supabase.from('ride_requests').insert({ ride_id: ride.id, requester_id: current.driverId, owner_id: ride.driver_id, requester_role: requesterRole, owner_role: ownerRole, message_text: requestMessage || null, seats_requested: requestedSeats, status: 'pending' })

    if (error) { setMessage('Müraciət göndərilmədi.') } else {
      setMessage('Müraciət göndərildi. ✅')
      setRequestMessageMap((prev) => ({ ...prev, [ride.id]: '' }))
      setRequestSeatsMap((prev) => ({ ...prev, [ride.id]: '1' }))
      try { await fetch(`https://api.telegram.org/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: ride.driver_id, text: `🚗 <b>YolDash: Yeni müraciət!</b>\n\n<b>Marşrut:</b> ${ride.origin} → ${ride.destination}\n<b>Tarix:</b> ${ride.ride_date || '-'} ${ride.departure_time}\n\nYolDash-ı açın: @yolustubot`, parse_mode: 'HTML' }) }) } catch (_) { }
      await getRideRequests(); setActiveTab('requests')
    }
    setRideRequestLoading(null)
  }

  async function ensureConversationForRequest(request: RideRequestWithRide) {
    const { data: existingConversation } = await supabase.from('conversations').select('*').eq('request_id', request.id).maybeSingle()
    if (existingConversation) return (existingConversation as Conversation).id

    const driverUserId = request.owner_role === 'driver' ? request.owner_id : request.requester_id
    const passengerUserId = request.owner_role === 'passenger' ? request.owner_id : request.requester_id

    const { data: newConversation, error: conversationError } = await supabase.from('conversations').insert({ ride_id: request.ride_id, request_id: request.id, driver_user_id: driverUserId, passenger_user_id: passengerUserId, status: 'active', updated_at: new Date().toISOString() }).select('*').single()

    if (conversationError) return null
    return (newConversation as Conversation).id
  }

  async function handleRideRequestDecision(request: RideRequestWithRide, decision: 'accepted' | 'rejected') {
    setRideRequestLoading(request.id)
    const { error } = await supabase.from('ride_requests').update({ status: decision, updated_at: new Date().toISOString() }).eq('id', request.id)

    if (error) { setMessage('Status yenilənmədi.'); setRideRequestLoading(null); return }

    if (decision === 'accepted') {
      const finalConversationId = await ensureConversationForRequest(request)
      if (!finalConversationId) { setMessage('Chat açıla bilmədi.'); setRideRequestLoading(null); return }
      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', finalConversationId)
      setSelectedConversationId(finalConversationId)
      setMessage('Müraciət qəbul edildi. Chat açıldı.')
      await Promise.all([getRideRequests(), getConversations(true), getRides(), getAllMyRides()])
      setActiveTab('chat')
    } else {
      setMessage('Müraciət rədd edildi.')
      await getRideRequests()
    }

    const statusAz = decision === 'accepted' ? '✅ QƏBUL EDİLDİ' : '❌ RƏDD EDİLDİ';
    try {
      await fetch(`https://api.telegram.org/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: request.requester_id, text: `🔔 <b>YolDash: Müraciətiniz ${statusAz}!</b>\n\n<b>Marşrut:</b> ${request.ride?.origin || '-'} → ${request.ride?.destination || '-'}\n\nYolDash-ı açın: @yolustubot`, parse_mode: 'HTML' })
      });
    } catch (_) {}

    setRideRequestLoading(null)
  }

  async function handleConfirmDeal(request: RideRequestWithRide) {
    const ride = allMyRides.find((item) => item.id === request.ride_id)
    if (!ride) { setMessage('Elan tapılmadı.'); return }
    if (request.status !== 'accepted') { setMessage('Əvvəlcə müraciət qəbul edilməlidir.'); return }
    if (request.seats_requested > ride.seats) { setMessage(`Kifayət qədər yer yoxdur. Qalan: ${ride.seats}`); return }

    setRideRequestLoading(request.id)
    const remainingSeats = Math.max(0, ride.seats - request.seats_requested)
    const nextStatus: RideStatus = remainingSeats === 0 ? 'full' : 'active'

    const { error: rideError } = await supabase.from('ride_listings').update({ seats: remainingSeats, status: nextStatus, closed_reason: remainingSeats === 0 ? 'matched' : null, updated_at: new Date().toISOString() }).eq('id', request.ride_id)

    if (rideError) { setMessage('Deal təsdiqlənmədi.'); setRideRequestLoading(null); return }

    setMessage(remainingSeats === 0 ? 'Deal təsdiqləndi, elan bağlandı.' : `Deal təsdiqləndi. Qalan yer: ${remainingSeats}`)
    
    try {
      await fetch(`https://api.telegram.org/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/sendMessage`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: request.requester_id, text: `🤝 <b>YolDash: Səfər (Deal) Təsdiqləndi!</b>\n\nSürücü sizinlə səfəri rəsmiləşdirdi. Xoş yollar!\n\nYolDash-ı açın: @yolustubot`, parse_mode: 'HTML' })
      });
    } catch (_) {}

    await Promise.all([getRideRequests(), getRides(), getAllMyRides()])
    setRideRequestLoading(null)
  }

  async function handleOpenConversation(conversationId: number) {
    setSelectedConversationId(conversationId); await getMessages(conversationId); await getConversations(false); setActiveTab('chat')
  }

  async function handleCloseConversation(conversationId: number) {
    if (!window.confirm('Bu çatı bağlamaq və arxivə atmaq istədiyinizə əminsiniz?')) return;
    const { error } = await supabase.from('conversations').update({ status: 'closed', updated_at: new Date().toISOString() }).eq('id', conversationId);
    if (error) { setMessage('Çat bağlanmadı.'); } else { setMessage('Çat bağlandı.'); await getConversations(true); if (selectedConversationId === conversationId) { setSelectedConversationId(null); } }
  }

  async function handleSendMessage() {
    if (!selectedConversationId) { setMessage('Əvvəl chat seç.'); return }
    if (!chatInput.trim()) return
    if (chatInput.trim().length > LIMITS.messageMax) { setMessage(`Mesaj max ${LIMITS.messageMax} simvol.`); return }

    setMessageSending(true)
    const { error } = await supabase.from('messages').insert({ conversation_id: selectedConversationId, sender_id: currentUser.driverId, message_text: chatInput.trim(), is_read: false })

    if (error) { setMessage('Mesaj göndərilmədi.') } else {
      const selectedConv = conversations.find(c => c.id === selectedConversationId);
      if (selectedConv) {
        const receiverId = selectedConv.driver_user_id === currentUser.driverId ? selectedConv.passenger_user_id : selectedConv.driver_user_id;
        try {
          await fetch(`https://api.telegram.org/bot${process.env.NEXT_PUBLIC_BOT_TOKEN}/sendMessage`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: receiverId, text: `💬 <b>YolDash: Yeni mesajınız var!</b>\n\n<b>Kimdən:</b> ${profile?.full_name || profile?.username || 'İstifadəçi'}\n<b>Mesaj:</b> ${chatInput.trim()}\n\nYolDash-ı açın: @yolustubot`, parse_mode: 'HTML' })
          });
        } catch (_) {}
      }

      setChatInput(''); await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', selectedConversationId)
      await getMessages(selectedConversationId, false); await getConversations(false)
    }
    setMessageSending(false)
  }

  async function handleCreateReview() {
    if (!reviewTargetRequestId) { setMessage('Əvvəl request seç.'); return }
    const req = rideRequests.find((item) => item.id === reviewTargetRequestId)
    if (!req) { setMessage('Request tapılmadı.'); return }

    const rating = Number(reviewRating)
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) { setMessage('Reytinq 1-5 arası olmalıdır.'); return }
    const comment = reviewComment.trim()
    if (comment.length > LIMITS.reviewCommentMax) { setMessage(`Review max ${LIMITS.reviewCommentMax} simvol.`); return }

    const revieweeId = req.owner_id === currentUser.driverId ? req.requester_id : req.owner_id
    const existing = reviews.find((item) => item.request_id === req.id && item.reviewer_id === currentUser.driverId && item.reviewee_id === revieweeId )

    if (existing) { setMessage('Bu request üçün artıq review yazmısan.'); return }

    const { error } = await supabase.from('reviews').insert({ ride_id: req.ride_id, conversation_id: null, request_id: req.id, reviewer_id: currentUser.driverId, reviewee_id: revieweeId, rating, comment_text: comment || null })

    if (error) { setMessage('Review göndərilmədi.') } else { setMessage('Review göndərildi.'); setReviewTargetRequestId(null); setReviewRating('5'); setReviewComment(''); await getReviews() }
  }

  async function handleSOS() {
    if (!window.confirm('🚨 DİQQƏT! 🚨\n\nBu düyməni təsdiqləsəniz, adminə TƏCİLİ HƏYƏCAN siqnalı göndəriləcək və telefonunuz Polisə (102) zəng edəcək. Davam edilsin?')) return;
    const current = getActiveUser();
    await supabase.from('user_reports').insert({ reporter_id: current.driverId || 0, target_user_id: null, reason: '🚨 SOS TƏCİLİ SİQNAL! 🚨', details: `İstifadəçi təcili SOS düyməsini basdı! Dərhal onunla əlaqə saxlayın.`, status: 'open' });
    alert('SOS siqnalı adminə göndərildi!\nİndi Polisə (102) yönləndirilirsiniz...');
    window.location.href = 'tel:102';
  }

  async function handleCreateSupport(e: React.FormEvent) {
    e.preventDefault(); setSupportLoading(true); setMessage('')
    const current = getActiveUser()
    if (!current.driverId) { setMessage('İstifadəçi tapılmadı.'); setSupportLoading(false); return }
    if (!supportEmail.trim() || !supportMessage.trim()) { setMessage('Bütün xanaları doldurun.'); setSupportLoading(false); return }

    const yesterday = new Date(); yesterday.setHours(yesterday.getHours() - 24)
    const { data: existingReports } = await supabase.from('user_reports').select('id').eq('reporter_id', current.driverId).ilike('reason', 'Dəstək%').gte('created_at', yesterday.toISOString())

    if (existingReports && existingReports.length > 0) { setMessage('Gün ərzində 1 dəfə dəstək müraciəti olar.'); setSupportLoading(false); return }

    const { error } = await supabase.from('user_reports').insert({ reporter_id: current.driverId, reason: `Dəstək: ${supportEmail.trim()}`.slice(0, 300), details: supportMessage.trim().slice(0, 2000), status: 'open' })

    if (error) { setMessage('Müraciət göndərilmədi.'); } else { setMessage('Müraciətiniz qeydə alındı.'); setSupportEmail(''); setSupportMessage(''); if (isAdmin) await getAdminData() }
    setSupportLoading(false)
  }

  async function handleSwitchRole() {
    if (!profile) { setMessage('Əvvəl profil yaratmaq lazımdır.'); return }
    const newRole: UserRole = profile.role === 'driver' ? 'passenger' : 'driver'

    if (newRole === 'driver' && (!profile.car_brand || !profile.license_plate || !profile.car_color)) {
      setMessage('⚠️ Sürücü olmaq üçün əvvəlcə profil bölməsində avtomobil markası, nömrəsi və RƏNGİNİ daxil edin.')
      setActiveTab('profile'); window.scrollTo({ top: 0, behavior: 'smooth' }); return
    }

    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', currentUser.driverId)
    if (error) { setMessage(`Xəta: ${error.message}`) } else { setMessage(newRole === 'driver' ? '🚗 Sürücü rejimi' : '🧑‍✈️ Sərnişin rejimi'); await getProfile(); await getRides(); await getAllMyRides() }
  }

  async function handleCreateReport() {
    if (!reportTargetUserId.trim() || !reportReason.trim()) { setMessage('Bütün xanaları doldurun.'); return }
    const targetUserIdNum = Number(reportTargetUserId)
    if (!Number.isFinite(targetUserIdNum)) { setMessage('ID düzgün deyil.'); return }
    if (reportReason.trim().length > LIMITS.reportReasonMax) { setMessage(`Reason max ${LIMITS.reportReasonMax} simvol.`); return }

    const { error } = await supabase.from('user_reports').insert({ target_user_id: targetUserIdNum, reporter_id: currentUser.driverId, reason: reportReason.trim(), details: reportDetails.trim() || null, status: 'open' })
    if (error) { setMessage('Report göndərilmədi.') } else { setMessage('Report göndərildi.'); setReportTargetUserId(''); setReportReason(''); setReportDetails(''); if (isAdmin) await getAdminData() }
  }

  async function handleAdminToggleUser(user: UserOverview) {
    setAdminLoadingId(user.id); const nextBlocked = !adminUserBlockedMap[user.id]; const nextNote = (adminUserNoteMap[user.id] || '').trim()
    const { error } = await supabase.from('profiles').update({ is_blocked: nextBlocked, admin_note: nextNote || null }).eq('id', user.id)
    if (error) { setMessage('User update olmadı.') } else { await logAdminAction(nextBlocked ? 'block' : 'unblock', 'profile', String(user.id), null, null, nextNote); setMessage(nextBlocked ? 'User bloklandı.' : 'User blokdan çıxarıldı.'); await getAdminData() }
    setAdminLoadingId(null)
  }

  async function handleAdminDeleteUser(user: UserOverview) {
    if (!window.confirm('Tamamilə silinsin?')) return; setAdminLoadingId(user.id);
    const { error } = await supabase.from('profiles').delete().eq('id', user.id);
    if (error) { setMessage('Silinmədi.'); } else { await logAdminAction('delete', 'profile', String(user.id)); setMessage('İstifadəçi silindi.'); await getAdminData(); }
    setAdminLoadingId(null);
  }

  async function handleAdminUpdateReport(report: UserReport) {
    setAdminLoadingId(report.id); const nextStatus = adminReportStatusMap[report.id]; const nextNote = (adminReportNoteMap[report.id] || '').trim()
    const { error } = await supabase.from('user_reports').update({ status: nextStatus, admin_note: nextNote || null, updated_at: new Date().toISOString() }).eq('id', report.id)
    if (error) { setMessage('Xəta.') } else { await logAdminAction('update', 'report', String(report.id)); setMessage('Yeniləndi.'); await getAdminData() }
    setAdminLoadingId(null)
  }

  function handleAdminStartEditRide(ride: Ride) {
    setAdminEditingRideId(ride.id); setAdminRideOrigin(ride.origin || ''); setAdminRideDestination(ride.destination || ''); setAdminRideDate(ride.ride_date || ''); setAdminRideTime(ride.departure_time || ''); setAdminRideSeats(String(ride.seats ?? 1)); setAdminRidePrice(String(ride.price_per_seat ?? 0)); setAdminRideNotes(ride.notes || ''); setAdminRideStatus(ride.status)
  }

  async function handleAdminSaveRide() {
    if (!adminEditingRideId) return; setAdminLoadingId(adminEditingRideId)
    const payload = { origin: adminRideOrigin.trim(), destination: adminRideDestination.trim(), ride_date: adminRideDate || null, departure_time: adminRideTime, seats: Number(adminRideSeats), price_per_seat: Number(adminRidePrice), notes: adminRideNotes.trim() || null, status: adminRideStatus, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('ride_listings').update(payload).eq('id', adminEditingRideId)
    if (error) { setMessage('Xəta.') } else { await logAdminAction('edit', 'ride', adminEditingRideId); setMessage('Yeniləndi.'); setAdminEditingRideId(null); await getAdminData(); await getRides(); await getAllMyRides() }
    setAdminLoadingId(null)
  }

  async function handleAdminDeleteRide(ride: Ride) {
    if (!window.confirm(`Silinsin?`)) return; setAdminLoadingId(ride.id)
    const { error } = await supabase.from('ride_listings').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', ride.id)
    if (error) { setMessage('Xəta.') } else { await logAdminAction('delete', 'ride', ride.id); setMessage('Ləğv edildi.'); await getAdminData(); await getRides(); await getAllMyRides() }
    setAdminLoadingId(null)
  }

  function handleAdminStartEditRequest(item: RideRequestWithRide) {
    setAdminEditingRequestId(item.id); setAdminRequestStatus(item.status); setAdminRequestSeats(String(item.seats_requested)); setAdminRequestMessage(item.message_text || '')
  }

  async function handleAdminSaveRequest() {
    if (!adminEditingRequestId) return; setAdminLoadingId(adminEditingRequestId)
    const payload = { status: adminRequestStatus, seats_requested: Number(adminRequestSeats), message_text: adminRequestMessage.trim() || null, updated_at: new Date().toISOString() }
    const { error } = await supabase.from('ride_requests').update(payload).eq('id', adminEditingRequestId)
    if (error) { setMessage('Xəta.') } else { await logAdminAction('edit', 'request', String(adminEditingRequestId)); setMessage('Yeniləndi.'); setAdminEditingRequestId(null); await getAdminData(); await getRideRequests() }
    setAdminLoadingId(null)
  }

  async function handleAdminDeleteRequest(item: RideRequestWithRide) {
    if (!window.confirm('Ləğv edilsin?')) return; setAdminLoadingId(item.id)
    const { error } = await supabase.from('ride_requests').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', item.id)
    if (error) { setMessage('Xəta.') } else { await logAdminAction('cancel', 'request', String(item.id)); setMessage('Ləğv edildi.'); await getAdminData(); await getRideRequests() }
    setAdminLoadingId(null)
  }

  function handleAdminStartEditMessage(item: Message) { setAdminEditingMessageId(item.id); setAdminMessageText(item.message_text || '') }

  async function handleAdminSaveMessage() {
    if (!adminEditingMessageId) return; setAdminLoadingId(adminEditingMessageId)
    const { error } = await supabase.from('messages').update({ message_text: adminMessageText.trim() }).eq('id', adminEditingMessageId)
    if (error) { setMessage('Xəta.') } else { await logAdminAction('edit', 'message', String(adminEditingMessageId)); setMessage('Yeniləndi.'); setAdminEditingMessageId(null); await getAdminData() }
    setAdminLoadingId(null)
  }

  async function handleAdminDeleteMessage(item: Message) {
    if (!window.confirm('Silinsin?')) return; setAdminLoadingId(item.id)
    const { error } = await supabase.from('messages').delete().eq('id', item.id)
    if (error) { setMessage('Xəta.') } else { await logAdminAction('delete', 'message', String(item.id)); setMessage('Silindi.'); await getAdminData() }
    setAdminLoadingId(null)
  }

  function handleAdminStartEditReview(item: ReviewWithMeta) { setAdminEditingReviewId(item.id); setAdminReviewRating(String(item.rating)); setAdminReviewComment(item.comment_text || '') }

  async function handleAdminSaveReview() {
    if (!adminEditingReviewId) return; setAdminLoadingId(adminEditingReviewId)
    const { error } = await supabase.from('reviews').update({ rating: Number(adminReviewRating), comment_text: adminReviewComment.trim() || null }).eq('id', adminEditingReviewId)
    if (error) { setMessage('Xəta.') } else { await logAdminAction('edit', 'review', String(adminEditingReviewId)); setMessage('Yeniləndi.'); setAdminEditingReviewId(null); await getAdminData() }
    setAdminLoadingId(null)
  }

  async function handleAdminDeleteReview(item: ReviewWithMeta) {
    if (!window.confirm('Silinsin?')) return; setAdminLoadingId(item.id)
    const { error } = await supabase.from('reviews').delete().eq('id', item.id)
    if (error) { setMessage('Xəta.') } else { await logAdminAction('delete', 'review', String(item.id)); setMessage('Silindi.'); await getAdminData() }
    setAdminLoadingId(null)
  }

  const filteredRides = useMemo(() => {
    const current = getActiveUser()
    const text = searchText.toLowerCase().trim()

    return rides.filter((ride) => {
      const rideOrigin = (ride.origin || '').toLowerCase()
      const rideDestination = (ride.destination || '').toLowerCase()
      const rideNotes = (ride.notes || '').toLowerCase()

      const matchesText = !text || rideOrigin.includes(text) || rideDestination.includes(text) || rideNotes.includes(text)
      const matchesRole = filterRole === 'all' || (ride.role || 'driver') === filterRole
      const matchesDate = !filterDate || (ride.ride_date || '') === filterDate
      const notMine = ride.driver_id !== current.driverId
      
      const matchesWomenOnly = ride.women_only ? profile?.gender === 'female' : true
      const rideUserGender = driverProfilesMap[ride.driver_id]?.gender
      const matchesSearchGender = !filterGender || rideUserGender === filterGender

      return matchesText && matchesRole && matchesSearchGender && matchesDate && notMine && matchesWomenOnly && ride.status === 'active' && !isRideExpired(ride)
    })
  }, [rides, searchText, filterRole, filterDate, isAdmin, driverProfilesMap, profile?.gender])

  const incomingRideRequests = useMemo(() => {
    return rideRequests.filter((item) => item.owner_id === currentUser.driverId)
  }, [rideRequests, currentUser.driverId])

  const outgoingRideRequests = useMemo(() => {
    return rideRequests.filter((item) => item.requester_id === currentUser.driverId)
  }, [rideRequests, currentUser.driverId])

  const selectedConversation = conversations.find((item) => item.id === selectedConversationId) || (isAdmin ? allConversationsAdmin.find((item) => item.id === selectedConversationId) : null) || null
  const selectedConversationRide = selectedConversation?.ride || null

  const currentMessages = useMemo(() => {
    if (!selectedConversationId) return []
    return messages.filter((item) => item.conversation_id === selectedConversationId)
  }, [messages, selectedConversationId])

  const adminUsersFiltered = useMemo(() => {
    const q = adminGlobalSearch.toLowerCase().trim()
    if (!q) return adminUsers
    return adminUsers.filter((user) => [String(user.id), user.full_name || '', user.username || '', user.phone || '', user.bio || ''].join(' ').toLowerCase().includes(q) )
  }, [adminUsers, adminGlobalSearch])

  const adminReportsFiltered = useMemo(() => {
    const q = adminGlobalSearch.toLowerCase().trim()
    if (!q) return adminReports
    return adminReports.filter((report) => [String(report.id), String(report.target_user_id || ''), String(report.reporter_id), report.reason || '', report.details || ''].join(' ').toLowerCase().includes(q) )
  }, [adminReports, adminGlobalSearch])

  if (!tgReady) {
    return (
      <main style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>🚗</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>YolDash yüklənir...</p>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 8 }}>Telegram Mini App açılır</p>
        </div>
      </main>
    )
  }

  if (tgReady && !currentUser.driverId) {
    return (
      <main style={{ ...styles.page, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 40, marginBottom: 16 }}>📱</p>
          <p style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>Telegram tələb olunur</p>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 8 }}>Bu tətbiq yalnız Telegram Mini App kimi işləyir.</p>
          <p style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Botdan açın: @yolustubot</p>
        </div>
      </main>
    )
  }

  return (
    <main style={styles.page}>
      <div style={styles.headerCard}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h1 style={styles.title}>Yolüstü</h1>
            <p style={styles.subtitle}>Bakıda sürücü və sərnişinləri birləşdirən icma platforma.</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {isRealAdmin && (
              <button type="button" onClick={() => { setIsAdminMode(!isAdminMode); setActiveTab(!isAdminMode ? 'admin' : 'dashboard') }} style={{ background: isAdminMode ? '#475569' : '#7c3aed', color: '#ffffff', border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: 900, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', boxShadow: '0 4px 14px rgba(124, 58, 237, 0.4)', }}>
                {isAdminMode ? '👤 İstifadəçi rejimi' : '👨‍💻 Admin rejimi'}
              </button>
            )}
            <button type="button" onClick={() => void handleSOS()} style={{ background: '#ef4444', color: '#ffffff', border: 'none', padding: '12px 20px', borderRadius: '12px', fontWeight: 900, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 14px rgba(239, 68, 68, 0.4)', animation: 'pulse 2s infinite' }}>
              🚨 SOS
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <>
          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Dashboard</h2>
            <div style={styles.statsGrid}>
              <div style={styles.statsCard} onClick={() => { setActiveTab('history'); window.scrollTo({ top: 0 }); }}><p style={styles.statLabel}>Aktiv elanlarım</p><p style={styles.statValue}>{myRides.length}</p></div>
              <div style={styles.statsCard} onClick={() => { setActiveTab('history'); window.scrollTo({ top: 0 }); }}><p style={styles.statLabel}>Tarixçədəki elanlar</p><p style={styles.statValue}>{historyRides.length}</p></div>
             <div style={styles.statsCard} onClick={() => { setActiveTab('requests'); window.scrollTo({ top: 0 }); }}><p style={styles.statLabel}>Gələn müraciətlər</p><p style={styles.statValue}>{incomingRideRequests.filter((x) => x.status === 'pending' && x.ride?.status === 'active' && !isRideExpired(x.ride)).length}</p></div>
             <div style={styles.statsCard} onClick={() => { setActiveTab('chat'); window.scrollTo({ top: 0 }); }}><p style={styles.statLabel}>Oxunmamış mesajlar</p><p style={styles.statValue}>{unreadTotal}</p></div>
              <div style={styles.statsCard} onClick={() => { setActiveTab('history'); window.scrollTo({ top: 0 }); }}><p style={styles.statLabel}>Reytinqim</p><p style={{ ...styles.statValue, color: '#eab308', fontSize: 18 }}>{renderStars(reviews.length > 0 ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviews.length).toFixed(1) : '5.0')}</p></div>
            </div>
          </section>

          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Kəşf Et (Aktiv Elanlar)</h2>
            {loading ? (
              <p style={styles.mutedText}>Yüklənir...</p>
            ) : filteredRides.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: 16, border: '2px dashed #cbd5e1', marginTop: 20 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>🔍</div>
                  <h3 style={{ margin: '0 0 8px', color: '#334155', fontSize: 18, fontWeight: 800 }}>Heç nə tapılmadı</h3>
                  <p style={{ margin: '0 0 16px', color: '#64748b', fontSize: 14 }}>Hələ ki, sənə uyğun aktiv elan yoxdur.</p>
                  <button type="button" onClick={() => setActiveTab('create')} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>🚀 İlk Elanı Sən Yarat!</button>
                </div>
              ) : (
                <div style={styles.ridesGrid}>
                {filteredRides.map((ride) => (
                  <div key={ride.id} style={styles.resultCard}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div style={{...styles.approvedBadge, margin: 0}}>Aktiv</div>
                      {driverProfilesMap[ride.driver_id] && (
                        <div style={{ display: 'flex', gap: 10, background: '#f8fafc', padding: '4px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
                          <span style={{ fontWeight: 700, color: '#334155' }}>{driverProfilesMap[ride.driver_id].gender === 'female' ? '👩' : '👨'} {driverProfilesMap[ride.driver_id].name}</span>
                          <span style={{ fontWeight: 800, color: '#eab308' }}>{renderStars(driverProfilesMap[ride.driver_id].rating)}</span>
                        </div>
                      )}
                    </div>
                    <p style={styles.infoRow}><strong>Rol:</strong> {getRoleLabel(ride.role)}</p>
                    
                    {driverProfilesMap[ride.driver_id]?.carBrand && (
                      <p style={styles.infoRow}>
                        <strong>Avtomobil:</strong> {driverProfilesMap[ride.driver_id].carBrand} ({driverProfilesMap[ride.driver_id].carColor})
                      </p>
                    )}

                    <p style={styles.infoRow}><strong>Haradan:</strong> {ride.origin}</p>
                    <p style={styles.infoRow}><strong>Hara:</strong> {ride.destination}</p>
                    <p style={styles.infoRow}><strong>Tarix:</strong> {ride.ride_date || '-'}</p>
                    <p style={styles.infoRow}><strong>Saat:</strong> {ride.departure_time}</p>
                    <p style={styles.infoRow}><strong>Qalan yer:</strong> {ride.seats}</p>
                    <p style={styles.infoRow}><strong>Qiymət:</strong> {ride.price_per_seat} AZN</p>
                    {ride.notes && <p style={styles.infoRow}><strong>Qeyd:</strong> {ride.notes}</p>}

                    <div style={styles.fieldWrap}>
                      <label style={styles.label}>Müraciət mesajı</label>
                      <textarea rows={2} value={requestMessageMap[ride.id] || ''} onChange={(e) => setRequestMessageMap((prev) => ({ ...prev, [ride.id]: e.target.value, }))} style={styles.textarea} placeholder="Qısa mesaj yaz" />
                    </div>
                    <div style={styles.fieldWrap}>
                      <label style={styles.label}>Neçə yer / nəfər</label>
                      <input type="number" min="1" max={ride.seats} value={requestSeatsMap[ride.id] || '1'} onChange={(e) => setRequestSeatsMap((prev) => ({ ...prev, [ride.id]: e.target.value, }))} style={styles.input} />
                    </div>
                    <div style={styles.actionRow}>
                      <button type="button" onClick={() => void handleCreateRideRequest(ride)} style={styles.primaryButton} disabled={rideRequestLoading === ride.id}>{rideRequestLoading === ride.id ? 'Göndərilir...' : 'Müraciət et'}</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'create' && (
        <section style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>{editingRideId ? 'Elanı redaktə et' : 'Yeni elan yarat'}</h2>
          {!profile ? (
            <p style={styles.mutedText}>Əvvəl profil yaratmaq lazımdır.</p>
          ) : (
            <form onSubmit={handleSubmitRide} style={styles.form}>
              {(profile?.home_address || profile?.work_address) && (
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {profile.home_address && <button type="button" onClick={() => { if(!origin) setOrigin(profile.home_address!); else if(!destination) setDestination(profile.home_address!); }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: 13, cursor: 'pointer', color: '#334155', fontWeight: 600 }}>🏠 Ev: {profile.home_address}</button>}
                  {profile.work_address && <button type="button" onClick={() => { if(!origin) setOrigin(profile.work_address!); else if(!destination) setDestination(profile.work_address!); }} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: 13, cursor: 'pointer', color: '#334155', fontWeight: 600 }}>💼 İş: {profile.work_address}</button>}
                </div>
              )}
              <div style={styles.fieldWrap}><label style={styles.label}>Aktiv rol</label><input value={getRoleLabel(profile.role)} readOnly style={styles.input} /></div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Haradan</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={origin} onChange={(e) => setOrigin(e.target.value)} required style={{ ...styles.input, flex: 1 }} placeholder="Məkan adı yazın və ya xəritədən seçin" />
                  <button type="button" onClick={() => { setLocationPickerTarget('origin'); setLocationPickerOpen(true) }} style={{ ...styles.secondaryButton, padding: '12px 14px', whiteSpace: 'nowrap' }}>🗺️ Xəritə</button>
                </div>
                {originLat && <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>📍 {originLat.toFixed(5)}, {originLng?.toFixed(5)}</p>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', margin: '-4px 0', position: 'relative', zIndex: 10 }}>
                <button type="button" title="Haradan və Hara yerlərini dəyiş" onClick={() => { const tOrg = origin; const tLat = originLat; const tLng = originLng; setOrigin(destination); setOriginLat(destLat); setOriginLng(destLng); setDestination(tOrg); setDestLat(tLat); setDestLng(tLng); }} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, color: '#2563eb', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>⇅</button>
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Hara</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={destination} onChange={(e) => setDestination(e.target.value)} required style={{ ...styles.input, flex: 1 }} placeholder="Məkan adı yazın və ya xəritədən seçin" />
                  <button type="button" onClick={() => { setLocationPickerTarget('destination'); setLocationPickerOpen(true) }} style={{ ...styles.secondaryButton, padding: '12px 14px', whiteSpace: 'nowrap' }}>🗺️ Xəritə</button>
                </div>
                {destLat && <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 0' }}>📍 {destLat.toFixed(5)}, {destLng?.toFixed(5)}</p>}
              </div>

              {locationPickerOpen && <LocationPicker title={locationPickerTarget === 'origin' ? 'Haradan — başlanğıc nöqtəsi' : 'Hara — son nöqtə'} onClose={() => setLocationPickerOpen(false)} onSelect={(lat, lng, address) => { if (locationPickerTarget === 'origin') { setOrigin(address); setOriginLat(lat); setOriginLng(lng); } else { setDestination(address); setDestLat(lat); setDestLng(lng); } setLocationPickerOpen(false); }} />}

              <div style={styles.twoColumnGrid}>
                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Tarix</label>
                  <input type="date" value={rideDate} onChange={(e) => setRideDate(e.target.value)} required style={styles.input} />
                  <div style={styles.chipRow}>
                    <button type="button" onClick={setToday} style={styles.chip}>Bugün</button>
                    <button type="button" onClick={setTomorrow} style={styles.chip}>Sabah</button>
                    <button type="button" onClick={setPlusTwoDays} style={styles.chip}>+2 gün</button>
                  </div>
                </div>

                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Saat</label>
                  <input type="time" value={departureTime} onChange={(e) => setDepartureTime(e.target.value)} required style={styles.input} />
                  <div style={styles.chipRow}>
                    <button type="button" onClick={setNowTime} style={styles.chip}>İndi</button>
                    <button type="button" onClick={setPlus30Min} style={styles.chip}>+30 dəq</button>
                    <button type="button" onClick={setPlus60Min} style={styles.chip}>+1 saat</button>
                    <button type="button" onClick={() => setPresetTime('09:00')} style={styles.chip}>09:00</button>
                    <button type="button" onClick={() => setPresetTime('18:00')} style={styles.chip}>18:00</button>
                  </div>
                </div>
              </div>

              <div style={styles.twoColumnGrid}>
                <div style={styles.fieldWrap}><label style={styles.label}>Yer sayı / nəfər sayı</label><input type="number" min="1" value={seats} onChange={(e) => setSeats(e.target.value)} required style={styles.input} /></div>
                <div style={styles.fieldWrap}><label style={styles.label}>Qiymət</label><input type="number" step="0.1" min="0" value={pricePerSeat} onChange={(e) => setPricePerSeat(e.target.value)} required style={styles.input} /></div>
              </div>

              <div style={styles.fieldWrap}><label style={styles.label}>Qeyd</label><textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={styles.textarea} /></div>

              {profile?.gender === 'female' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#fdf4ff', border: '1px solid #f0abfc', borderRadius: 12, marginTop: 4, marginBottom: 14 }}>
                  <input type="checkbox" id="womenOnly" checked={womenOnly} onChange={(e) => setWomenOnly(e.target.checked)} style={{ width: 18, height: 18, accentColor: '#d946ef', cursor: 'pointer' }} />
                  <label htmlFor="womenOnly" style={{ fontSize: 14, fontWeight: 700, color: '#a21caf', cursor: 'pointer', margin: 0 }}>🌸 Yalnız qadınlar üçün (Kişilər bu elanı axtarışda görə bilməyəcək)</label>
                </div>
              )}

              <div style={styles.buttonRow}>
                <button type="submit" disabled={submitting} style={styles.primaryButton}>{submitting ? 'Göndərilir...' : editingRideId ? 'Yenilə' : 'Elanı əlavə et'}</button>
                <button type="button" onClick={resetRideForm} style={styles.cancelButton}>Formu təmizlə</button>
              </div>
            </form>
          )}
        </section>
      )}

      {activeTab === 'search' && (
        <section style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Ətraflı Axtarış</h2>
          <div style={styles.form}>
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Axtarış</label>
              <input placeholder="Haradan, hara və ya qeyd üzrə axtar" value={searchText} onChange={(e) => setSearchText(e.target.value)} style={styles.input} />
            </div>

            {(profile?.home_address || profile?.work_address) && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {profile.home_address && <button type="button" onClick={() => setSearchText(profile.home_address!)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: 13, cursor: 'pointer', color: '#334155', fontWeight: 600 }}>🏠 Ev: {profile.home_address}</button>}
                {profile.work_address && <button type="button" onClick={() => setSearchText(profile.work_address!)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', fontSize: 13, cursor: 'pointer', color: '#334155', fontWeight: 600 }}>💼 İş: {profile.work_address}</button>}
              </div>
            )}

            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Rol filteri</label>
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={styles.select}>
                  <option value="all">Hamısı</option><option value="driver">Sürücü elanları</option><option value="passenger">Sərnişin elanları</option>
                </select>
              </div>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Cins filteri</label>
                <select value={filterGender} onChange={(e) => setFilterGender(e.target.value)} style={styles.select}>
                  <option value="">Bütün cinslər</option><option value="male">Kişi</option><option value="female">Qadın</option>
                </select>
              </div>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Tarix filteri</label>
                <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={styles.input} />
              </div>
            </div>

            <div style={styles.buttonRow}>
              <button type="button" onClick={() => { setSearchText(''); setFilterRole('all'); setFilterGender(''); setFilterDate(''); }} style={styles.secondaryButton}>Filteri sıfırla</button>
              <button type="button" onClick={() => { void initializeData(); setActiveTab('dashboard') }} style={styles.ghostButton}>Axtar (Kəşf Et)</button>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'requests' && (
        <section style={styles.sectionCard}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, background: '#f1f5f9', padding: 6, borderRadius: 12 }}>
            <button onClick={() => setActiveTab('chat')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', background: 'transparent', color: '#64748b' }}>
              💬 Mesajlar ({unreadTotal > 0 ? `${unreadTotal} yeni` : conversations.filter(c => c.status !== 'closed').length})
            </button>
            <button onClick={() => setActiveTab('requests')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', background: '#ffffff', color: '#0f172a', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              🔔 Müraciətlər ({incomingRideRequests.filter(req => req.status === 'pending' && req.ride?.status === 'active' && !isRideExpired(req.ride)).length})
            </button>
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <button type="button" onClick={() => { setReqView('incoming'); setReqStatus('active'); }} style={reqView === 'incoming' ? styles.primaryButton : styles.ghostButton}>📥 Gələnlər ({incomingRideRequests.filter(req => (req.status === 'pending' || req.status === 'accepted') && req.ride?.status === 'active' && !isRideExpired(req.ride)).length})</button>
            <button type="button" onClick={() => { setReqView('outgoing'); setReqStatus('active'); }} style={reqView === 'outgoing' ? styles.primaryButton : styles.ghostButton}>📤 Göndərdiklərim ({outgoingRideRequests.filter(req => (req.status === 'pending' || req.status === 'accepted') && req.ride?.status === 'active' && !isRideExpired(req.ride)).length})</button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
            <button type="button" onClick={() => setReqStatus('active')} style={reqStatus === 'active' ? styles.chipActive : styles.chip}>🟢 Aktiv</button>
            <button type="button" onClick={() => setReqStatus('archived')} style={reqStatus === 'archived' ? styles.chipActive : styles.chip}>🗄️ Arxiv (Tarixçə)</button>
          </div>
          <div style={styles.ridesGrid}>
            {(() => {
              const currentList = reqView === 'incoming' ? incomingRideRequests : outgoingRideRequests;
              const isReqActive = (req: any) => (req.status === 'pending' || req.status === 'accepted') && req.ride?.status === 'active' && !isRideExpired(req.ride);
              const filteredList = currentList.filter(req => reqStatus === 'active' ? isReqActive(req) : !isReqActive(req));
              if (filteredList.length === 0) {
                return (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px 10px', background: '#f8fafc', borderRadius: 16, border: '1px dashed #cbd5e1' }}>
                    <span style={{ fontSize: 40 }}>{reqStatus === 'active' ? '📬' : '🗄️'}</span>
                    <p style={{ ...styles.mutedText, marginTop: 12, fontWeight: 600 }}>{reqStatus === 'active' ? 'Göstəriləcək aktiv müraciət yoxdur.' : 'Arxiv boşdur.'}</p>
                  </div>
                );
              }
              return filteredList.map((item) => (
                <div key={item.id} style={{ ...styles.resultCard, opacity: reqStatus === 'archived' ? 0.75 : 1 }}>
                  <div style={getRequestBadgeStyle(item.status)}>{getRequestStatusLabel(item.status)}</div>
                  {reqStatus === 'archived' && <span style={{ marginLeft: 8, fontSize: 11, background: '#e2e8f0', padding: '4px 8px', borderRadius: 6, fontWeight: 700 }}>Vaxtı bitib</span>}
                  <p style={styles.infoRow}><strong>Rol:</strong> {getRoleLabel(reqView === 'incoming' ? item.requester_role : item.owner_role)}</p>
                  <p style={styles.infoRow}><strong>İstənən yer:</strong> {item.seats_requested}</p>
                  {item.message_text && <p style={styles.infoRow}><strong>Mesaj:</strong> {item.message_text}</p>}
                  {item.ride && <p style={styles.infoRow}><strong>Marşrut:</strong> {item.ride.origin} → {item.ride.destination}</p>}
                  <p style={styles.infoRow}><strong>Tarix:</strong> {formatDateTime(item.created_at)}</p>
                  
                  {reqView === 'incoming' && reqStatus === 'active' && (
                    <>
                      {item.status === 'pending' && item.ride?.status === 'active' && !isRideExpired(item.ride) && (
                        <div style={styles.actionRow}>
                          <button type="button" style={styles.successButton} disabled={rideRequestLoading === item.id} onClick={() => void handleRideRequestDecision(item, 'accepted')}>Qəbul et</button>
                          <button type="button" style={styles.dangerButton} disabled={rideRequestLoading === item.id} onClick={() => void handleRideRequestDecision(item, 'rejected')}>Rədd et</button>
                        </div>
                      )}
                    </>
                  )}
                  {reqView === 'incoming' && item.status === 'accepted' && (
                    <div style={styles.actionRow}>
                      <button type="button" style={styles.closeButton} disabled={rideRequestLoading === item.id} onClick={() => void handleConfirmDeal(item)}>Deal təsdiqlə (Səfəri rəsmiləşdir)</button>
                    </div>
                  )}
                </div>
              ));
            })()}
          </div>
        </section>
      )}

      {activeTab === 'chat' && (
        <section style={styles.sectionCard}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 20, background: '#f1f5f9', padding: 6, borderRadius: 12 }}>
            <button onClick={() => setActiveTab('chat')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', background: '#ffffff', color: '#0f172a', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              💬 Mesajlar ({unreadTotal > 0 ? `${unreadTotal} yeni` : conversations.filter(c => c.status !== 'closed').length})
            </button>
            <button onClick={() => setActiveTab('requests')} style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', background: 'transparent', color: '#64748b' }}>
              🔔 Müraciətlər ({incomingRideRequests.filter(req => req.status === 'pending' && req.ride?.status === 'active' && !isRideExpired(req.ride)).length})
            </button>
          </div>
          <div style={styles.chatLayout}>
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                <button onClick={() => { setChatFilter('active'); const firstActive = conversations.find(c => c.status !== 'closed'); setSelectedConversationId(firstActive ? firstActive.id : null); }} style={chatFilter === 'active' ? styles.chipActive : styles.chip}>🟢 Aktiv ({conversations.filter(c => c.status !== 'closed').length})</button>
                <button onClick={() => { setChatFilter('closed'); const firstClosed = conversations.find(c => c.status === 'closed'); setSelectedConversationId(firstClosed ? firstClosed.id : null); }} style={chatFilter === 'closed' ? styles.chipActive : styles.chip}>🗄️ Arxiv ({conversations.filter(c => c.status === 'closed').length})</button>
              </div>
              <div style={styles.conversationList}>
                {conversations.filter(c => chatFilter === 'active' ? c.status !== 'closed' : c.status === 'closed').length === 0 ? (
                  <p style={styles.mutedText}>{chatFilter === 'active' ? 'Aktiv chat yoxdur.' : 'Arxiv boşdur.'}</p>
                ) : (
                  conversations.filter(c => chatFilter === 'active' ? c.status !== 'closed' : c.status === 'closed').map((conv) => {
                    const ride = conv.ride
                    return (
                      <div key={conv.id} style={{ ...(selectedConversationId === conv.id ? styles.conversationCardActive : styles.conversationCard), opacity: chatFilter === 'closed' ? 0.6 : 1 }} onClick={() => void handleOpenConversation(conv.id)}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={chatFilter === 'closed' ? {...styles.badge, background: '#e2e8f0', color: '#64748b'} : styles.badge}>{chatFilter === 'closed' ? 'Bağlı' : 'Chat'} #{conv.id}</div>
                          {conv.unread_count && chatFilter === 'active' ? <div style={styles.unreadBadge}>{conv.unread_count}</div> : null}
                        </div>
                        <p style={styles.infoRow}><strong>Marşrut:</strong> {ride ? `${ride.origin} → ${ride.destination}` : '-'}</p>
                        <p style={styles.infoRow}><strong>Tarix:</strong> {ride ? `${ride.ride_date || '-'} / ${ride.departure_time}` : '-'}</p>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
            <div style={styles.chatPanel}>
              {(!selectedConversation || (chatFilter === 'active' ? selectedConversation.status === 'closed' : selectedConversation.status !== 'closed')) ? (
                <div style={{ textAlign: 'center', marginTop: 40 }}><span style={{ fontSize: 40 }}>💬</span><p style={{ ...styles.mutedText, marginTop: 12 }}>{chatFilter === 'active' ? 'Göstəriləcək aktiv çat yoxdur.' : 'Göstəriləcək arxiv çat yoxdur.'}</p></div>
              ) : (
                <>
                  <div style={styles.resultCard}>
                    <p style={styles.infoRow}><strong>Conversation ID:</strong> {selectedConversation.id}</p>
                    <p style={styles.infoRow}><strong>Marşrut:</strong> {selectedConversationRide ? `${selectedConversationRide.origin} → ${selectedConversationRide.destination}` : '-'}</p>
                    
                    {/* YENİ: Başlanğıc və Son nöqtəyə Yol Göstər xüsusiyyəti */}
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                      {selectedConversationRide?.origin_lat && (
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedConversationRide.origin_lat},${selectedConversationRide.origin_lng}`} target="_blank" rel="noopener noreferrer" style={{ background: '#e2e8f0', color: '#0f172a', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                          📍 Başlanğıca get
                        </a>
                      )}
                      {selectedConversationRide?.destination_lat && (
                        <a href={`https://www.google.com/maps/dir/?api=1&destination=${selectedConversationRide.destination_lat},${selectedConversationRide.destination_lng}`} target="_blank" rel="noopener noreferrer" style={{ background: '#e2e8f0', color: '#0f172a', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
                          🏁 Son nöqtəyə get
                        </a>
                      )}
                    </div>

                    <p style={styles.infoRow}><strong>Tarix/Saat:</strong> {selectedConversationRide ? `${selectedConversationRide.ride_date || '-'} / ${selectedConversationRide.departure_time}` : '-'}</p>

                    {selectedConversationRide && driverProfilesMap[selectedConversationRide.driver_id]?.carBrand && (
                      <p style={styles.infoRow}>
                        <strong>Avtomobil:</strong> {driverProfilesMap[selectedConversationRide.driver_id].carBrand} ({driverProfilesMap[selectedConversationRide.driver_id].carColor}) 
                        {' '}
                        <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: 6, border: '1px solid #cbd5e1', fontWeight: 800, fontSize: 13, letterSpacing: 1 }}>
                          {driverProfilesMap[selectedConversationRide.driver_id].licensePlate}
                        </span>
                      </p>
                    )}

                    <p style={styles.infoRow}><strong>Qiymət:</strong> {selectedConversationRide ? `${selectedConversationRide.price_per_seat} AZN` : '-'}</p>
                    <p style={styles.infoRow}><strong>Status:</strong> {selectedConversation.status === 'closed' ? 'Arxivlənib (Bağlı)' : selectedConversation.status}</p>
                    {selectedConversation.status !== 'closed' && (
                      <div style={{ marginTop: 10 }}>
                        <button type="button" onClick={() => void handleCloseConversation(selectedConversation.id)} style={styles.dangerButton}>🔒 Çatı Bağla</button>
                      </div>
                    )}
                  </div>

                  {/* YENİ: Deal Təsdiqlə (Xatırladıcı Banner Çatın İçində) */}
                  {(() => {
                    const chatReq = rideRequests.find(r => r.id === selectedConversation.request_id);
                    if (chatReq && chatReq.status === 'accepted' && selectedConversationRide?.status === 'active' && !isRideExpired(selectedConversationRide)) {
                      return (
                        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', padding: 14, borderRadius: 12, marginTop: 16, marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ margin: 0, fontWeight: 800, color: '#92400e', fontSize: 14 }}>🤝 Razılaşma əldə olundu?</p>
                            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#b45309' }}>Səfərin baş tutması üçün zəhmət olmasa təsdiqləyin.</p>
                          </div>
                          <button type="button" onClick={() => void handleConfirmDeal(chatReq)} style={{ ...styles.successButton, padding: '10px 18px' }} disabled={rideRequestLoading === chatReq.id}>
                            {rideRequestLoading === chatReq.id ? 'Təsdiqlənir...' : '✅ Deal Təsdiqlə'}
                          </button>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  <div style={{ height: 12 }} />
                  {selectedConversationRide?.status === 'active' && selectedConversation.status !== 'closed' && (
                    <LiveMap conversationId={selectedConversation.id} currentUserId={currentUser.driverId} isDriver={profile?.role === 'driver'} otherUserId={ currentUser.driverId === selectedConversation.driver_user_id ? selectedConversation.passenger_user_id : selectedConversation.driver_user_id } />
                  )}
                  <div style={styles.messageList}>
                    {currentMessages.length === 0 ? (
                      <p style={styles.mutedText}>Hələ mesaj yoxdur.</p>
                    ) : (
                      currentMessages.map((msg) => {
                        const isMine = msg.sender_id === currentUser.driverId
                        return (
                          <div key={msg.id} style={isMine ? styles.myMessage : styles.otherMessage}>
                            <div>{msg.message_text}</div>
                            <div style={{ fontSize: 11, marginTop: 6, opacity: 0.8 }}>{formatDateTime(msg.created_at)}</div>
                          </div>
                        )
                      })
                    )}
                  </div>
                  {selectedConversation.status !== 'closed' ? (
                    <>
                      <div style={styles.fieldWrap}>
                        <label style={styles.label}>Mesaj</label>
                        <textarea rows={3} value={chatInput} onChange={(e) => setChatInput(e.target.value)} style={styles.textarea} placeholder="Mesaj yaz..." />
                      </div>
                      <div style={styles.actionRow}>
                        <button type="button" onClick={() => void handleSendMessage()} style={styles.primaryButton} disabled={messageSending}>{messageSending ? 'Göndərilir...' : 'Göndər'}</button>
                      </div>
                    </>
                  ) : (
                    <div style={{ marginTop: 16, padding: 14, background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0', textAlign: 'center' }}><p style={{ margin: 0, fontWeight: 700, color: '#64748b' }}>🔒 Bu çat bağlanıb. Artıq mesaj yazmaq və məkan paylaşmaq mümkün deyil.</p></div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'history' && (
        <>
          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Səfəri qiymətləndir (Review yaz)</h2>
            <div style={styles.form}>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Təsdiqlənmiş müraciət seç</label>
                <select value={reviewTargetRequestId ?? ''} onChange={(e) => setReviewTargetRequestId(e.target.value ? Number(e.target.value) : null)} style={styles.select}>
                  <option value="">Seç</option>
                  {rideRequests.filter((item) => item.status === 'accepted').map((item) => (
                    <option key={item.id} value={item.id}>#{item.id} - {item.ride?.origin || '-'} → {item.ride?.destination || '-'}</option>
                  ))}
                </select>
              </div>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Reytinq (1-5)</label>
                <select value={reviewRating} onChange={(e) => setReviewRating(e.target.value)} style={styles.select}>
                  <option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option>
                </select>
              </div>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Rəy (Gizli qalacaq)</label>
                <textarea rows={3} value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} style={styles.textarea} placeholder="Səfər barədə fikirlərini yaz..." />
              </div>
              <div style={styles.actionRow}>
                <button type="button" onClick={() => void handleCreateReview()} style={styles.primaryButton}>Review göndər</button>
              </div>
            </div>
          </section>

          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Elan tarixçəsi</h2>
            {historyRides.length === 0 ? (
              <p style={styles.mutedText}>Tarixçədə elan yoxdur.</p>
            ) : (
              <div style={styles.ridesGrid}>
                {historyRides.map((ride) => (
                  <div key={ride.id} style={styles.resultCard}>
                    <div style={getRideBadgeStyle(ride)}>{getRideStatusLabel(ride)}</div>
                    <p style={styles.infoRow}><strong>Rol:</strong> {getRoleLabel(ride.role)}</p>
                    <p style={styles.infoRow}><strong>Haradan:</strong> {ride.origin}</p>
                    <p style={styles.infoRow}><strong>Hara:</strong> {ride.destination}</p>
                    <p style={styles.infoRow}><strong>Tarix:</strong> {ride.ride_date || '-'}</p>
                    <p style={styles.infoRow}><strong>Saat:</strong> {ride.departure_time}</p>
                    <p style={styles.infoRow}><strong>Yer:</strong> {ride.seats}</p>
                    <p style={styles.infoRow}><strong>Səbəb:</strong> {ride.closed_reason || '-'}</p>
                    <p style={styles.infoRow}><strong>Bitmə tarixi:</strong> {formatDateTime(ride.completed_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'support' && (
        <section style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Dəstək və Əlaqə</h2>
          <p style={styles.mutedText}>Təklif, istək və ya şikayətlərinizi bizə göndərin. Müraciətləriniz birbaşa adminə çatdırılacaq.</p>
          <form onSubmit={handleCreateSupport} style={styles.form}>
            <div style={styles.fieldWrap}>
              <label style={styles.label}>E-poçt (Email) ünvanınız</label>
              <input type="email" required value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} style={styles.input} placeholder="Məs: adiniz@mail.com" />
            </div>
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Müraciətiniz (Təklif, Şikayət və s.)</label>
              <textarea rows={4} required value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} style={styles.textarea} placeholder="Mesajınızı buraya yazın..." />
            </div>
            <div style={styles.actionRow}>
              <button type="submit" disabled={supportLoading} style={styles.primaryButton}>{supportLoading ? 'Göndərilir...' : 'Göndər'}</button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'profile' && (
        <section style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>{profile ? 'Profil idarəetməsi' : 'Profil yarat'}</h2>

          {profile && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', marginBottom: 24, background: profile.role === 'driver' ? '#eff6ff' : '#f0fdf4', border: `1px solid ${profile.role === 'driver' ? '#bfdbfe' : '#bbf7d0'}`, borderRadius: 14, }}>
              <div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 16 }}>{profile.role === 'driver' ? '🚗 Sürücü rejimi' : '🧑‍✈️ Sərnişin rejimi'}</p>
                <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{profile.role === 'driver' ? 'Elan verib sərnişin götürürsən' : 'Sürücü axtarışındasan'}</p>
              </div>
              <button type="button" onClick={() => void handleSwitchRole()} style={{ padding: '10px 16px', background: profile.role === 'driver' ? '#16a34a' : '#2563eb', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', }}>{profile.role === 'driver' ? '→ Sərnişinə keç' : '→ Sürücüyə keç'}</button>
            </div>
          )}

          <form onSubmit={handleCreateOrUpdateProfile} style={styles.form}>
            
            {/* 1. Şəxsi Məlumatlar Bloku */}
            <div style={styles.profileBlock}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>👤 Şəxsi Məlumatlar</h3>
              <div style={styles.form}>
                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Ad soyad</label>
                  <input value={profileFullName} onChange={(e) => setProfileFullName(e.target.value)} style={styles.input} />
                </div>
                <div style={styles.twoColumnGrid}>
                  <div style={styles.fieldWrap}>
                    <label style={styles.label}>Username</label>
                    <input value={profileUsername} onChange={(e) => setProfileUsername(e.target.value)} style={styles.input} />
                  </div>
                  <div style={styles.fieldWrap}>
                    <label style={styles.label}>Telefon</label>
                    <input type="tel" value={profilePhone} onChange={handlePhoneChange} style={{ ...styles.input, letterSpacing: '1px', fontWeight: 600, color: '#1e293b' }} placeholder="+994 50 123 45 67" required />
                  </div>
                </div>
                <div style={styles.twoColumnGrid}>
                  <div style={styles.fieldWrap}>
                    <label style={styles.label}>Cins</label>
                    <select value={profileGender} onChange={(e) => setProfileGender(e.target.value as 'male' | 'female')} style={styles.select}>
                      <option value="male">Kişi</option><option value="female">Qadın</option>
                    </select>
                  </div>
                  <div style={styles.fieldWrap}>
                    <label style={styles.label}>Bio</label>
                    <textarea value={profileBio} onChange={(e) => setProfileBio(e.target.value)} rows={1} style={styles.textarea} placeholder="Özünüz haqqında qısa..." />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Ünvanlar Bloku */}
            <div style={styles.profileBlock}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>📍 Tez-tez gedilən ünvanlar</h3>
              <div style={styles.twoColumnGrid}>
                <div style={styles.fieldWrap}>
                  <label style={styles.label}>🏠 Ev ünvanı</label>
                  <input value={profileHomeAddress} onChange={(e) => setProfileHomeAddress(e.target.value)} style={styles.input} placeholder="Məs: 20 Yanvar metrosu" />
                </div>
                <div style={styles.fieldWrap}>
                  <label style={styles.label}>💼 İş/Universitet ünvanı</label>
                  <input value={profileWorkAddress} onChange={(e) => setProfileWorkAddress(e.target.value)} style={styles.input} placeholder="Məs: Gənclik Mall" />
                </div>
              </div>
            </div>

            {/* 3. Avtomobil Bloku */}
            <div style={styles.profileBlock}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>🚗 Sürücü Məlumatları</h3>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#64748b' }}>Sürücü roluna keçmək istəyirsinizsə bu məlumatlar məcburidir.</p>
              <div style={styles.twoColumnGrid}>
                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Avtomobil markası</label>
                  <input value={carBrand} onChange={(e) => setCarBrand(e.target.value)} style={styles.input} placeholder="Məs: Toyota Prius" />
                </div>
                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Dövlət qeydiyyat nömrəsi</label>
                  <input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} style={styles.input} placeholder="Məs: 99-XX-999" />
                </div>
                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Avtomobil rəngi</label>
                  <input value={carColor} onChange={(e) => setCarColor(e.target.value)} style={styles.input} placeholder="Məs: Ağ" />
                </div>
              </div>
            </div>

            <div style={styles.buttonRow}>
              <button type="submit" disabled={profileSaving} style={{...styles.primaryButton, width: '100%', padding: '14px'}}>{profileSaving ? 'Yadda saxlanılır...' : profile ? 'Dəyişiklikləri Yadda Saxla' : 'Profili yarat'}</button>
            </div>
            
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button type="button" onClick={() => { setActiveTab('history'); window.scrollTo({ top: 0 }); }} style={{ width: '100%', background: '#f8fafc', color: '#334155', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                🕒 Keçmiş Səfərlərim (Tarixçə)
              </button>
              <button type="button" onClick={() => { setActiveTab('support'); window.scrollTo({ top: 0 }); }} style={{ width: '100%', background: '#f8fafc', color: '#334155', padding: 14, borderRadius: 12, border: '1px solid #cbd5e1', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                🎧 Dəstək və Əlaqə
              </button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'admin' && isAdmin && (
        <>
          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Admin panel</h2>
            <div style={styles.chipRow}>
              {[ { key: 'overview', label: 'Overview' }, { key: 'users', label: 'Users' }, { key: 'rides', label: 'Rides' }, { key: 'requests', label: 'Requests' }, { key: 'conversations', label: 'Conversations' }, { key: 'messages', label: 'Messages' }, { key: 'reviews', label: 'Reviews' }, { key: 'reports', label: 'Reports' }, { key: 'audit', label: 'Audit' }, ].map((item) => (
                <button key={item.key} type="button" onClick={() => setAdminSection(item.key as AdminSection)} style={adminSection === item.key ? styles.chipAdmin : styles.chip}>{item.label}</button>
              ))}
            </div>
            <div style={styles.fieldWrap}><label style={styles.label}>Admin search</label><input value={adminGlobalSearch} onChange={(e) => setAdminGlobalSearch(e.target.value)} style={styles.input} placeholder="User, report, id, səbəb..." /></div>
          </section>

          {adminSection === 'overview' && (
            <section style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>Overview</h2>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(160px,1fr))', marginBottom: 20 }}>
                <div style={{ ...styles.adminStatsCard, borderLeft: '4px solid #dc2626', background: adminReports.filter(r => r.status === 'open').length > 0 ? '#fff5f5' : '#faf5ff' }}><p style={styles.statLabel}>🔴 Açıq reportlar</p><p style={{ ...styles.statValue, color: adminReports.filter(r => r.status === 'open').length > 0 ? '#dc2626' : '#0f172a' }}>{adminReports.filter(r => r.status === 'open').length}</p></div>
                <div style={{ ...styles.adminStatsCard, borderLeft: '4px solid #f59e0b' }}><p style={styles.statLabel}>🔒 Bloklanmış</p><p style={{ ...styles.statValue, color: '#f59e0b' }}>{adminUsers.filter(u => u.is_blocked).length}</p></div>
                <div style={{ ...styles.adminStatsCard, borderLeft: '4px solid #2563eb' }}><p style={styles.statLabel}>🚗 Aktiv elanlar</p><p style={{ ...styles.statValue, color: '#2563eb' }}>{allRidesAdmin.filter(r => r.status === 'active').length}</p></div>
                <div style={{ ...styles.adminStatsCard, borderLeft: '4px solid #7c3aed' }}><p style={styles.statLabel}>⏳ Gözləyən müraciətlər</p><p style={{ ...styles.statValue, color: '#7c3aed' }}>{allRideRequestsAdmin.filter(r => r.status === 'pending').length}</p></div>
              </div>
              <div style={styles.statsGrid}>
                {[ { label: 'Cəmi İstifadəçi', value: adminUsers.length, color: '#2563eb' }, { label: 'Cəmi Elan', value: allRidesAdmin.length, color: '#0891b2' }, { label: 'Cəmi Müraciət', value: allRideRequestsAdmin.length, color: '#7c3aed' }, { label: 'Cəmi Mesaj', value: allMessagesAdmin.length, color: '#059669' }, { label: 'Cəmi Review', value: allReviewsAdmin.length, color: '#d97706' }, { label: 'Cəmi Report', value: adminReports.length, color: '#dc2626' }, ].map(item => (
                  <div key={item.label} style={styles.adminStatsCard}><p style={styles.statLabel}>{item.label}</p><p style={{ ...styles.statValue, color: item.color }}>{item.value}</p><div style={{ marginTop: 8, height: 5, borderRadius: 4, background: '#e2e8f0' }}><div style={{ height: '100%', borderRadius: 4, background: item.color, width: `${Math.min(100, item.value > 0 ? Math.max(8, (item.value / Math.max(1, adminUsers.length + allRidesAdmin.length)) * 200) : 0)}%`, transition: 'width 0.6s ease', }} /></div></div>
                ))}
              </div>
              <div style={{ marginTop: 20, padding: 16, background: '#faf5ff', borderRadius: 14, border: '1px solid #e9d5ff' }}>
                <p style={{ margin: '0 0 12px', fontWeight: 800, color: '#6d28d9', fontSize: 15 }}>⚡ Sürətli hərəkətlər</p>
                <div style={styles.buttonRow}>
                  <button type="button" onClick={() => setAdminSection('reports')} style={{ ...styles.dangerButton, opacity: adminReports.filter(r => r.status === 'open').length === 0 ? 0.5 : 1 }}>🔴 Reportlar ({adminReports.filter(r => r.status === 'open').length})</button>
                  <button type="button" onClick={() => setAdminSection('users')} style={styles.warningButton}>👥 İstifadəçilər</button>
                  <button type="button" onClick={() => setAdminSection('rides')} style={styles.closeButton}>🚗 Elanlar</button>
                  <button type="button" onClick={() => setAdminSection('requests')} style={styles.primaryButton}>⏳ Müraciətlər</button>
                  <button type="button" onClick={() => setAdminSection('conversations')} style={styles.successButton}>💬 Çatlar</button>
                  <button type="button" onClick={() => setAdminSection('messages')} style={{...styles.ghostButton, borderColor: '#3b82f6', color: '#3b82f6'}}>✉️ Mesajlar</button>
                  <button type="button" onClick={() => setAdminSection('reviews')} style={{...styles.ghostButton, borderColor: '#d97706', color: '#d97706'}}>⭐ Rəylər</button>
                  <button type="button" onClick={() => setAdminSection('audit')} style={styles.ghostButton}>📋 Audit log</button>
                  <button type="button" onClick={() => void getAdminData()} style={styles.secondaryButton}>🔄 Təzələ</button>
                </div>
              </div>
              {adminAuditLogs.length > 0 && (
                <div style={{ marginTop: 20 }}>
                  <p style={{ fontWeight: 800, fontSize: 15, marginBottom: 10, color: '#334155' }}>🕐 Son fəaliyyət</p>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {adminAuditLogs.slice(0, 5).map(log => (
                      <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }}>
                        <span><strong style={{ color: '#7c3aed' }}>{log.action_type}</strong>{' · '}{log.entity_type}{log.note ? ` · ${log.note}` : ''}</span>
                        <span style={{ color: '#64748b', whiteSpace: 'nowrap', marginLeft: 12 }}>{formatDateTime(log.created_at)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {adminSection === 'users' && (
            <section style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>Users</h2>
              <div style={styles.ridesGrid}>
                {adminUsersFiltered.map((user) => (
                  <div key={user.id} style={styles.adminCard}>
                    <div style={styles.adminBadge}>User #{user.id}</div>
                    <p style={styles.infoRow}><strong>Ad:</strong> {user.full_name || '-'}</p>
                    <p style={styles.infoRow}><strong>Username:</strong> {user.username || '-'}</p>
                    <p style={styles.infoRow}><strong>Telefon:</strong> {user.phone || '-'}</p>
                    <p style={styles.infoRow}><strong>Bio:</strong> {user.bio || '-'}</p>
                    <p style={styles.infoRow}><strong>Avtomobil:</strong> {user.car_brand ? `${user.car_brand} (${user.license_plate})` : '-'}</p>
                    <p style={styles.infoRow}><strong>Rol:</strong> {getRoleLabel(user.role)}</p>
                    <p style={styles.infoRow}><strong>Blocked:</strong> {adminUserBlockedMap[user.id] ? 'Bəli' : 'Xeyr'}</p>
                    <p style={styles.infoRow}><strong>Avg rating:</strong> {user.avg_rating || 0}</p>
                    <p style={styles.infoRow}><strong>Active rides:</strong> {user.active_rides}</p>
                    <div style={styles.fieldWrap}><label style={styles.label}>Admin note</label><textarea rows={3} value={adminUserNoteMap[user.id] || ''} onChange={(e) => setAdminUserNoteMap((prev) => ({ ...prev, [user.id]: e.target.value }))} style={styles.textarea} /></div>
                    <div style={styles.actionRow}>
                      <button type="button" style={adminUserBlockedMap[user.id] ? styles.successButton : styles.warningButton} disabled={adminLoadingId === user.id} onClick={() => void handleAdminToggleUser(user)}>{adminUserBlockedMap[user.id] ? 'Blokdan çıxar' : 'Blokla'}</button>
                      <button type="button" style={styles.dangerButton} disabled={adminLoadingId === user.id} onClick={() => void handleAdminDeleteUser(user)}>Tamamilə Sil</button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {adminSection === 'rides' && (
            <>
              <section style={styles.sectionCard}>
                <h2 style={styles.sectionTitle}>Rides</h2>
                {['active', 'full', 'completed', 'cancelled'].map((status) => {
                  const group = allRidesAdmin.filter((r) => r.status === status)
                  if (group.length === 0) return null
                  const title = status === 'active' ? '🟢 Aktiv' : status === 'full' ? '🔒 Bağlı (Full)' : status === 'completed' ? '✅ Tamamlanmış' : '❌ Ləğv edilmiş'
                  return (
                    <div key={status} style={{ marginBottom: 28 }}>
                      <h3 style={{ fontSize: 16, color: '#334155', paddingBottom: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 16 }}>{title} ({group.length})</h3>
                      <div style={styles.ridesGrid}>
                        {group.map((ride) => (
                          <div key={ride.id} style={styles.adminCard}>
                            <div style={getRideBadgeStyle(ride)}>{getRideStatusLabel(ride)}</div>
                            <p style={styles.infoRow}><strong>ID:</strong> {ride.id}</p>
                            <p style={styles.infoRow}><strong>Driver ID:</strong> {ride.driver_id}</p>
                            <p style={styles.infoRow}><strong>Marşrut:</strong> {ride.origin} → {ride.destination}</p>
                            <p style={styles.infoRow}><strong>Tarix/Saat:</strong> {ride.ride_date || '-'} / {ride.departure_time}</p>
                            <p style={styles.infoRow}><strong>Seats:</strong> {ride.seats}</p>
                            <p style={styles.infoRow}><strong>Qiymət:</strong> {ride.price_per_seat}</p>
                            <div style={styles.actionRow}>
                              <button type="button" style={styles.warningButton} onClick={() => handleAdminStartEditRide(ride)}>Edit</button>
                              <button type="button" style={styles.dangerButton} disabled={adminLoadingId === ride.id} onClick={() => void handleAdminDeleteRide(ride)}>Delete</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </section>

              {adminEditingRideId && (
                <section style={styles.sectionCard}>
                  <h2 style={styles.sectionTitle}>Ride edit</h2>
                  <div style={styles.form}>
                    <input value={adminRideOrigin} onChange={(e) => setAdminRideOrigin(e.target.value)} style={styles.input} />
                    <input value={adminRideDestination} onChange={(e) => setAdminRideDestination(e.target.value)} style={styles.input} />
                    <input type="date" value={adminRideDate} onChange={(e) => setAdminRideDate(e.target.value)} style={styles.input} />
                    <input type="time" value={adminRideTime} onChange={(e) => setAdminRideTime(e.target.value)} style={styles.input} />
                    <input type="number" value={adminRideSeats} onChange={(e) => setAdminRideSeats(e.target.value)} style={styles.input} />
                    <input type="number" value={adminRidePrice} onChange={(e) => setAdminRidePrice(e.target.value)} style={styles.input} />
                    <select value={adminRideStatus} onChange={(e) => setAdminRideStatus(e.target.value as RideStatus)} style={styles.select}><option value="active">active</option><option value="full">full</option><option value="cancelled">cancelled</option><option value="completed">completed</option></select>
                    <textarea value={adminRideNotes} onChange={(e) => setAdminRideNotes(e.target.value)} rows={3} style={styles.textarea} />
                    <div style={styles.actionRow}><button type="button" style={styles.primaryButton} onClick={() => void handleAdminSaveRide()}>Save ride</button><button type="button" style={styles.secondaryButton} onClick={() => setAdminEditingRideId(null)}>Cancel</button></div>
                  </div>
                </section>
              )}
            </>
          )}

          {adminSection === 'requests' && (
            <>
              <section style={styles.sectionCard}>
                <h2 style={styles.sectionTitle}>Requests</h2>
                {['pending', 'accepted', 'rejected', 'cancelled'].map((status) => {
                  const group = allRideRequestsAdmin.filter((r) => r.status === status)
                  if (group.length === 0) return null
                  const title = status === 'pending' ? '⏳ Gözləyən' : status === 'accepted' ? '✅ Qəbul edilmiş' : status === 'rejected' ? '🚫 Rədd edilmiş' : '❌ Ləğv edilmiş'
                  return (
                    <div key={status} style={{ marginBottom: 28 }}>
                      <h3 style={{ fontSize: 16, color: '#334155', paddingBottom: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 16 }}>{title} ({group.length})</h3>
                      <div style={styles.ridesGrid}>
                        {group.map((item) => (
                          <div key={item.id} style={styles.adminCard}>
                            <div style={getRequestBadgeStyle(item.status)}>{getRequestStatusLabel(item.status)}</div>
                            <p style={styles.infoRow}><strong>ID:</strong> {item.id}</p>
                            <p style={styles.infoRow}><strong>Ride ID:</strong> {item.ride_id}</p>
                            <p style={styles.infoRow}><strong>Requester:</strong> {item.requester_id}</p>
                            <p style={styles.infoRow}><strong>Owner:</strong> {item.owner_id}</p>
                            <p style={styles.infoRow}><strong>Seats:</strong> {item.seats_requested}</p>
                            <p style={styles.infoRow}><strong>Mesaj:</strong> {item.message_text || '-'}</p>
                            <div style={styles.actionRow}><button type="button" style={styles.warningButton} onClick={() => handleAdminStartEditRequest(item)}>Edit</button><button type="button" style={styles.dangerButton} disabled={adminLoadingId === item.id} onClick={() => void handleAdminDeleteRequest(item)}>Delete</button></div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </section>

              {adminEditingRequestId && (
                <section style={styles.sectionCard}>
                  <h2 style={styles.sectionTitle}>Request edit</h2>
                  <div style={styles.form}>
                    <select value={adminRequestStatus} onChange={(e) => setAdminRequestStatus(e.target.value as RideRequestStatus)} style={styles.select}><option value="pending">pending</option><option value="accepted">accepted</option><option value="rejected">rejected</option><option value="cancelled">cancelled</option></select>
                    <input type="number" value={adminRequestSeats} onChange={(e) => setAdminRequestSeats(e.target.value)} style={styles.input} />
                    <textarea value={adminRequestMessage} onChange={(e) => setAdminRequestMessage(e.target.value)} rows={3} style={styles.textarea} />
                    <div style={styles.actionRow}><button type="button" style={styles.primaryButton} onClick={() => void handleAdminSaveRequest()}>Save request</button><button type="button" style={styles.secondaryButton} onClick={() => setAdminEditingRequestId(null)}>Cancel</button></div>
                  </div>
                </section>
              )}
            </>
          )}

          {adminSection === 'conversations' && (
            <section style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>Conversations</h2>
              {['active', 'closed'].map((status) => {
                const group = allConversationsAdmin.filter((c) => c.status === status)
                if (group.length === 0) return null
                const title = status === 'active' ? '🟢 Aktiv Çatlar' : '🔒 Arxiv (Bağlı)'
                return (
                  <div key={status} style={{ marginBottom: 28 }}>
                    <h3 style={{ fontSize: 16, color: '#334155', paddingBottom: 8, borderBottom: '2px solid #e2e8f0', marginBottom: 16 }}>{title} ({group.length})</h3>
                    <div style={styles.ridesGrid}>
                      {group.map((conv) => (
                        <div key={conv.id} style={styles.adminCard}>
                          <div style={styles.adminBadge}>Conversation #{conv.id}</div>
                          <p style={styles.infoRow}><strong>Ride ID:</strong> {conv.ride_id}</p>
                          <p style={styles.infoRow}><strong>Request ID:</strong> {conv.request_id || '-'}</p>
                          <p style={styles.infoRow}><strong>Driver:</strong> {conv.driver_user_id}</p>
                          <p style={styles.infoRow}><strong>Passenger:</strong> {conv.passenger_user_id}</p>
                          <p style={styles.infoRow}><strong>Status:</strong> {conv.status}</p>
                          <p style={styles.infoRow}><strong>Updated:</strong> {formatDateTime(conv.updated_at)}</p>
                          <div style={styles.actionRow}><button type="button" style={styles.primaryButton} onClick={() => void handleOpenConversation(conv.id)}>Çata daxil ol</button></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </section>
          )}
          {adminSection === 'messages' && (
            <>
              <section style={styles.sectionCard}>
                <h2 style={styles.sectionTitle}>Messages</h2>
                <div style={styles.ridesGrid}>
                  {allMessagesAdmin.map((item) => (
                    <div key={item.id} style={styles.adminCard}>
                      <div style={styles.adminBadge}>Message #{item.id}</div>
                      <p style={styles.infoRow}><strong>Conversation:</strong> {item.conversation_id}</p>
                      <p style={styles.infoRow}><strong>Sender:</strong> {item.sender_id}</p>
                      <p style={styles.infoRow}><strong>Text:</strong> {item.message_text}</p>
                      <p style={styles.infoRow}><strong>Tarix:</strong> {formatDateTime(item.created_at)}</p>
                      <div style={styles.actionRow}><button type="button" style={styles.warningButton} onClick={() => handleAdminStartEditMessage(item)}>Edit</button><button type="button" style={styles.dangerButton} disabled={adminLoadingId === item.id} onClick={() => void handleAdminDeleteMessage(item)}>Delete</button></div>
                    </div>
                  ))}
                </div>
              </section>

              {adminEditingMessageId && (
                <section style={styles.sectionCard}>
                  <h2 style={styles.sectionTitle}>Message edit</h2>
                  <div style={styles.form}>
                    <textarea value={adminMessageText} onChange={(e) => setAdminMessageText(e.target.value)} rows={4} style={styles.textarea} />
                    <div style={styles.actionRow}><button type="button" style={styles.primaryButton} onClick={() => void handleAdminSaveMessage()}>Save message</button><button type="button" style={styles.secondaryButton} onClick={() => setAdminEditingMessageId(null)}>Cancel</button></div>
                  </div>
                </section>
              )}
            </>
          )}

          {adminSection === 'reviews' && (
            <>
              <section style={styles.sectionCard}>
                <h2 style={styles.sectionTitle}>Reviews</h2>
                <div style={styles.ridesGrid}>
                  {allReviewsAdmin.map((item) => (
                  <div key={item.id} style={styles.adminCard}>
                    <div style={styles.adminBadge}>Review #{item.id}</div>
                    <p style={styles.infoRow}><strong>Reviewer:</strong> {item.reviewer_id}</p>
                    <p style={styles.infoRow}><strong>Reviewee:</strong> {item.reviewee_id}</p>
                    <p style={styles.infoRow}><strong>Rating:</strong> {item.rating}</p>
                    <p style={styles.infoRow}><strong>Comment:</strong> {item.comment_text || '-'}</p>
                    <div style={styles.actionRow}><button type="button" style={styles.warningButton} onClick={() => handleAdminStartEditReview(item)}>Edit</button><button type="button" style={styles.dangerButton} disabled={adminLoadingId === item.id} onClick={() => void handleAdminDeleteReview(item)}>Delete</button></div>
                  </div>
                ))}
                </div>
              </section>

              {adminEditingReviewId && (
                <section style={styles.sectionCard}>
                  <h2 style={styles.sectionTitle}>Review edit</h2>
                  <div style={styles.form}>
                    <select value={adminReviewRating} onChange={(e) => setAdminReviewRating(e.target.value)} style={styles.select}><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select>
                    <textarea value={adminReviewComment} onChange={(e) => setAdminReviewComment(e.target.value)} rows={4} style={styles.textarea} />
                    <div style={styles.actionRow}><button type="button" style={styles.primaryButton} onClick={() => void handleAdminSaveReview()}>Save review</button><button type="button" style={styles.secondaryButton} onClick={() => setAdminEditingReviewId(null)}>Cancel</button></div>
                  </div>
                </section>
              )}
            </>
          )}

          {adminSection === 'reports' && (
            <section style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>Reports</h2>
              <div style={styles.ridesGrid}>
                {adminReportsFiltered.map((report) => (
                  <div key={report.id} style={styles.adminCard}>
                    <div style={getReportBadgeStyle(report.status)}>{getReportStatusLabel(report.status)}</div>
                    <p style={styles.infoRow}><strong>ID:</strong> {report.id}</p>
                    <p style={styles.infoRow}><strong>Reporter:</strong> {report.reporter_id}</p>
                    <p style={styles.infoRow}><strong>Target:</strong> {report.target_user_id || '-'}</p>
                    <p style={styles.infoRow}><strong>Reason:</strong> {report.reason}</p>
                    <p style={styles.infoRow}><strong>Details:</strong> {report.details || '-'}</p>
                    <div style={styles.fieldWrap}><label style={styles.label}>Status</label><select value={adminReportStatusMap[report.id] || report.status} onChange={(e) => setAdminReportStatusMap((prev) => ({ ...prev, [report.id]: e.target.value as ReportStatus, })) } style={styles.select}><option value="open">open</option><option value="in_review">in_review</option><option value="resolved">resolved</option><option value="dismissed">dismissed</option></select></div>
                    <div style={styles.fieldWrap}><label style={styles.label}>Admin note</label><textarea rows={3} value={adminReportNoteMap[report.id] || ''} onChange={(e) => setAdminReportNoteMap((prev) => ({ ...prev, [report.id]: e.target.value, })) } style={styles.textarea} /></div>
                    <div style={styles.actionRow}><button type="button" style={styles.primaryButton} disabled={adminLoadingId === report.id} onClick={() => void handleAdminUpdateReport(report)}>Update report</button></div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {adminSection === 'audit' && (
            <section style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>Audit log</h2>
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead><tr><th style={styles.th}>ID</th><th style={styles.th}>Admin</th><th style={styles.th}>Action</th><th style={styles.th}>Entity</th><th style={styles.th}>Entity ID</th><th style={styles.th}>Note</th><th style={styles.th}>Tarix</th></tr></thead>
                  <tbody>
                    {adminAuditLogs.map((log) => (
                      <tr key={log.id}><td style={styles.td}>{log.id}</td><td style={styles.td}>{log.admin_user_id}</td><td style={styles.td}>{log.action_type}</td><td style={styles.td}>{log.entity_type}</td><td style={styles.td}>{log.entity_id}</td><td style={styles.td}>{log.note || '-'}</td><td style={styles.td}>{formatDateTime(log.created_at)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {/* ── SABİT ALT MENYU (BOTTOM NAV) ── */}
      {!isAdminMode && (
        <div style={styles.bottomNav}>
          <button style={{ ...styles.navItem, ...(activeTab === 'search' || activeTab === 'dashboard' ? styles.navItemActive : {}) }} onClick={() => { setActiveTab('search'); window.scrollTo({ top: 0 }); }}>
            <span style={{ fontSize: 24, marginBottom: 4 }}>🔍</span>
            Kəşf Et
          </button>
          <button style={{ ...styles.navItem, ...(activeTab === 'create' ? styles.navItemActive : {}) }} onClick={() => { setActiveTab('create'); window.scrollTo({ top: 0 }); }}>
            <span style={{ fontSize: 24, marginBottom: 4 }}>➕</span>
            Yarat
          </button>
          <button style={{ ...styles.navItem, ...((activeTab === 'chat' || activeTab === 'requests') ? styles.navItemActive : {}) }} onClick={() => { setActiveTab('chat'); window.scrollTo({ top: 0 }); }}>
            <div style={{ position: 'relative' }}>
              <span style={{ fontSize: 24, marginBottom: 4 }}>💬</span>
              {(unreadTotal + incomingRideRequests.filter(req => req.status === 'pending' && req.ride?.status === 'active' && !isRideExpired(req.ride)).length) > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -8, background: '#ef4444', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 10 }}>
                  {unreadTotal + incomingRideRequests.filter(req => req.status === 'pending' && req.ride?.status === 'active' && !isRideExpired(req.ride)).length}
                </span>
              )}
            </div>
            Gələnlər
          </button>
          <button style={{ ...styles.navItem, ...((activeTab === 'profile' || activeTab === 'support' || activeTab === 'history') ? styles.navItemActive : {}) }} onClick={() => { setActiveTab('profile'); window.scrollTo({ top: 0 }); }}>
            <span style={{ fontSize: 24, marginBottom: 4 }}>👤</span>
            Profil
          </button>
        </div>
      )}

      {/* ── Qlobal Toast Bildirişi ── */}
      {message && (
        <>
          <style>{`
            @keyframes slideUpFade {
              0% { transform: translate(-50%, 20px); opacity: 0; }
              100% { transform: translate(-50%, 0); opacity: 1; }
            }
          `}</style>
          <div style={{
            position: 'fixed', bottom: '80px', left: '50%', transform: 'translateX(-50%)',
            background: message.includes('xəta') || message.includes('tapılmadı') || message.includes('doldurun') || message.includes('⚠️') ? '#ef4444' : '#10b981',
            color: '#ffffff', padding: '12px 24px', borderRadius: '50px', fontSize: '14px', fontWeight: 600,
            boxShadow: '0 8px 20px rgba(0,0,0,0.2)', zIndex: 9999, display: 'flex', alignItems: 'center', gap: '8px',
            animation: 'slideUpFade 0.4s ease-out forwards', whiteSpace: 'normal', width: '90%', maxWidth: '400px',
            textAlign: 'center', lineHeight: '1.4'
          }}>
            {message}
          </div>
        </>
      )}
    </main>
  )
}