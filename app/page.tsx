'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import dynamic from 'next/dynamic'

const LiveMap = dynamic(() => import('./components/LiveMap'), { ssr: false })
const LocationPicker = dynamic(() => import('./components/LocationPicker'), { ssr: false })

type RideStatus = 'active' | 'full' | 'cancelled' | 'completed'
type UserRole = 'driver' | 'passenger'
type ConversationStatus = 'active' | 'closed'
type RideRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled'
type TabType =
  | 'dashboard'
  | 'create'
  | 'search'
  | 'requests'
  | 'chat'
  | 'history'
  | 'reviews'
  | 'profile'

type Ride = {
  id: string
  driver_id: number
  origin: string
  destination: string
  ride_date: string | null
  departure_time: string
  seats: number
  price_per_seat: number
  notes: string | null
  status: RideStatus
  role: UserRole | null
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
  car_brand: string | null
  license_plate: string | null
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

const LIMITS = {
  messageMax: 1000,
  rideRequestMessageMax: 1000,
  reviewCommentMax: 1000,
  notesMax: 2000,
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 1280,
    margin: '0 auto',
    padding: '20px 16px 48px',
    fontFamily: 'Arial, sans-serif',
    background: '#f8fafc',
    minHeight: '100vh',
    color: '#0f172a',
  },
  headerCard: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
    border: '1px solid #e2e8f0',
    borderRadius: 20,
    padding: 22,
    marginBottom: 18,
    boxShadow: '0 6px 20px rgba(15, 23, 42, 0.06)',
  },
  title: {
    margin: 0,
    fontSize: 30,
    fontWeight: 800,
    color: '#0f172a',
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 0,
    color: '#475569',
    fontSize: 15,
    lineHeight: 1.5,
  },
  topTabs: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  tabButton: {
    padding: '10px 14px',
    borderRadius: 999,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
  },
  activeTabButton: {
    padding: '10px 14px',
    borderRadius: 999,
    border: '1px solid #2563eb',
    background: '#2563eb',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
  },
  sectionCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    boxShadow: '0 3px 14px rgba(15, 23, 42, 0.05)',
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: 16,
    fontSize: 22,
    fontWeight: 800,
    color: '#0f172a',
  },
  form: {
    display: 'grid',
    gap: 14,
  },
  fieldWrap: {
    display: 'grid',
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: 700,
    color: '#334155',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
  },
  primaryButton: {
    padding: '12px 16px',
    background: '#2563eb',
    color: '#ffffff',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 800,
    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
  },
  secondaryButton: {
    padding: '10px 14px',
    background: '#e2e8f0',
    color: '#0f172a',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
  },
  successButton: {
    padding: '10px 14px',
    background: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 800,
  },
  dangerButton: {
    padding: '10px 14px',
    background: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 800,
  },
  closeButton: {
    padding: '10px 14px',
    background: '#7c3aed',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 800,
  },
  message: {
    marginTop: 8,
    marginBottom: 18,
    padding: '12px 14px',
    borderRadius: 12,
    background: '#dbeafe',
    color: '#1e3a8a',
    border: '1px solid #bfdbfe',
    fontSize: 14,
  },
  errorMessage: {
    marginTop: 8,
    marginBottom: 18,
    padding: '12px 14px',
    borderRadius: 12,
    background: '#fee2e2',
    color: '#991b1b',
    border: '1px solid #fecaca',
    fontSize: 14,
  },
  ridesGrid: {
    display: 'grid',
    gap: 16,
  },
  statsGrid: {
    display: 'grid',
    gap: 14,
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  },
  twoColumnGrid: {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  },
  statsCard: {
    border: '1px solid #dbe3ee',
    borderRadius: 16,
    padding: 16,
    background: '#f8fafc',
  },
  statLabel: {
    margin: 0,
    fontSize: 13,
    color: '#64748b',
    fontWeight: 700,
  },
  statValue: {
    margin: '8px 0 0',
    fontSize: 28,
    color: '#0f172a',
    fontWeight: 800,
  },
  myRideCard: {
    border: '1px solid #bfdbfe',
    borderRadius: 16,
    padding: 16,
    background: '#eff6ff',
    color: '#0f172a',
    boxShadow: '0 1px 6px rgba(37, 99, 235, 0.08)',
  },
  resultCard: {
    border: '1px solid #cbd5e1',
    borderRadius: 16,
    padding: 16,
    background: '#f8fafc',
    color: '#0f172a',
    boxShadow: '0 1px 6px rgba(15, 23, 42, 0.04)',
  },
  infoRow: {
    margin: '6px 0',
    color: '#1e293b',
    lineHeight: 1.5,
  },
  mutedText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 1.5,
  },
  chipRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 10,
  },
  chip: {
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#334155',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
  },
  actionRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
    marginTop: 10,
  },
  pendingBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 8,
    background: '#fef3c7',
    color: '#92400e',
  },
  approvedBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 8,
    background: '#dcfce7',
    color: '#166534',
  },
  rejectedBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 8,
    background: '#fee2e2',
    color: '#991b1b',
  },
  fullBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 8,
    background: '#ede9fe',
    color: '#5b21b6',
  },
  completedBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 8,
    background: '#d1fae5',
    color: '#065f46',
  },
  unreadBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 22,
    height: 22,
    padding: '0 8px',
    borderRadius: 999,
    background: '#2563eb',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 800,
    marginLeft: 8,
  },
  chatLayout: {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
  },
  conversationList: {
    display: 'grid',
    gap: 12,
  },
  conversationCard: {
    border: '1px solid #dbe3ee',
    borderRadius: 14,
    padding: 14,
    background: '#ffffff',
    cursor: 'pointer',
  },
  conversationCardActive: {
    border: '1px solid #2563eb',
    borderRadius: 14,
    padding: 14,
    background: '#eff6ff',
    cursor: 'pointer',
  },
  chatPanel: {
    border: '1px solid #dbe3ee',
    borderRadius: 16,
    background: '#ffffff',
    padding: 16,
  },
  messageList: {
    display: 'grid',
    gap: 10,
    maxHeight: 420,
    overflowY: 'auto',
    paddingBottom: 8,
    marginBottom: 14,
  },
  myMessage: {
    justifySelf: 'end',
    maxWidth: '80%',
    background: '#2563eb',
    color: '#ffffff',
    padding: '10px 12px',
    borderRadius: 14,
  },
  otherMessage: {
    justifySelf: 'start',
    maxWidth: '80%',
    background: '#e2e8f0',
    color: '#0f172a',
    padding: '10px 12px',
    borderRadius: 14,
  },
}

function pad(value: number) {
  return String(value).padStart(2, '0')
}

function addDays(base: Date, days: number) {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function toTimeInputValue(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function roundToNextMinutes(date: Date, step = 5) {
  const d = new Date(date)
  d.setSeconds(0, 0)
  const minutes = d.getMinutes()
  const rounded = Math.ceil(minutes / step) * step
  if (rounded === 60) {
    d.setHours(d.getHours() + 1)
    d.setMinutes(0)
  } else {
    d.setMinutes(rounded)
  }
  return d
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '-'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

function normalizeText(value: string | null | undefined) {
  return (value || '').toLowerCase().trim()
}

function getRoleLabel(role: UserRole | null) {
  return role === 'passenger' ? 'Sərnişin' : 'Sürücü'
}

function getRideStatusLabel(status: RideStatus) {
  if (status === 'full') return 'Bağlı'
  if (status === 'cancelled') return 'Ləğv edildi'
  if (status === 'completed') return 'Tamamlandı'
  return 'Aktiv'
}

function getRequestStatusLabel(status: RideRequestStatus) {
  if (status === 'accepted') return 'Qəbul edildi'
  if (status === 'rejected') return 'Rədd edildi'
  if (status === 'cancelled') return 'Ləğv edildi'
  return 'Gözləmədə'
}

export default function Home() {
  const [telegramReady, setTelegramReady] = useState(false)
  const [telegramError, setTelegramError] = useState('')
  const [telegramUser, setTelegramUser] = useState<{
    id: number
    username: string
    fullName: string
  } | null>(null)

  const [activeTab, setActiveTab] = useState<TabType>('dashboard')

  const [rides, setRides] = useState<Ride[]>([])
  const [allMyRides, setAllMyRides] = useState<Ride[]>([])
  const [myRides, setMyRides] = useState<Ride[]>([])
  const [historyRides, setHistoryRides] = useState<Ride[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [rideRequests, setRideRequests] = useState<RideRequestWithRide[]>([])
  const [conversations, setConversations] = useState<ConversationWithMeta[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [reviews, setReviews] = useState<ReviewWithMeta[]>([])

  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null)
  const [unreadTotal, setUnreadTotal] = useState(0)
  const selectedConversationIdRef = useRef<number | null>(null)

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [rideRequestLoading, setRideRequestLoading] = useState<string | number | null>(null)
  const [rideActionLoading, setRideActionLoading] = useState<string | null>(null)
  const [messageSending, setMessageSending] = useState(false)
  const [message, setMessage] = useState('')
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
  const [carBrand, setCarBrand] = useState('')
  const [licensePlate, setLicensePlate] = useState('')

  const [searchText, setSearchText] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterDate, setFilterDate] = useState('')

  const [requestMessageMap, setRequestMessageMap] = useState<Record<string, string>>({})
  const [requestSeatsMap, setRequestSeatsMap] = useState<Record<string, string>>({})
  const [chatInput, setChatInput] = useState('')

  const [reviewTargetRequestId, setReviewTargetRequestId] = useState<number | null>(null)
  const [reviewRating, setReviewRating] = useState('5')
  const [reviewComment, setReviewComment] = useState('')

  useEffect(() => {
    const tg = (window as any)?.Telegram?.WebApp
    if (!tg) {
      setTelegramError('Telegram WebApp tapılmadı. Bu səhifəni Telegram daxilində aç.')
      return
    }

    try {
      tg.ready?.()
      tg.expand?.()

      const user = tg.initDataUnsafe?.user
      if (!user?.id) {
        setTelegramError('Telegram user tapılmadı. Mini app Telegram içində açılmalıdır.')
        return
      }

      setTelegramUser({
        id: user.id,
        username: user.username || `user_${user.id}`,
        fullName: [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Telegram User',
      })
      setTelegramReady(true)
    } catch {
      setTelegramError('Telegram məlumatları oxunmadı.')
    }
  }, [])

  function getActiveUser() {
    if (!telegramUser) return null
    return {
      driverId: telegramUser.id,
      username: telegramUser.username,
      fullName: telegramUser.fullName,
    }
  }

  const currentUser = getActiveUser()

  function resetRideForm() {
    setEditingRideId(null)
    setOrigin('')
    setDestination('')
    setRideDate('')
    setDepartureTime('')
    setSeats('1')
    setPricePerSeat('')
    setNotes('')
  }

  function setToday() {
    setRideDate(toDateInputValue(new Date()))
  }

  function setTomorrow() {
    setRideDate(toDateInputValue(addDays(new Date(), 1)))
  }

  function setPlusTwoDays() {
    setRideDate(toDateInputValue(addDays(new Date(), 2)))
  }

  function setNowTime() {
    const now = roundToNextMinutes(new Date(), 5)
    setDepartureTime(toTimeInputValue(now))
  }

  function setPlus30Min() {
    const d = new Date()
    d.setMinutes(d.getMinutes() + 30)
    setDepartureTime(toTimeInputValue(roundToNextMinutes(d, 5)))
  }

  function setPlus60Min() {
    const d = new Date()
    d.setMinutes(d.getMinutes() + 60)
    setDepartureTime(toTimeInputValue(roundToNextMinutes(d, 5)))
  }

  function setPresetTime(value: string) {
    setDepartureTime(value)
  }

  function getRequestBadgeStyle(status: RideRequestStatus) {
    if (status === 'accepted') return styles.approvedBadge
    if (status === 'rejected' || status === 'cancelled') return styles.rejectedBadge
    return styles.pendingBadge
  }

  function getRideBadgeStyle(status: RideStatus) {
    if (status === 'full') return styles.fullBadge
    if (status === 'completed') return styles.completedBadge
    if (status === 'cancelled') return styles.rejectedBadge
    return styles.approvedBadge
  }

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId
  }, [selectedConversationId])

  useEffect(() => {
    if (!telegramReady || !currentUser) return
    void initializeData()
  }, [telegramReady, telegramUser?.id])

  useEffect(() => {
    if (!telegramReady || !currentUser) return

    const activeUserId = currentUser.driverId

    const channels = [
      supabase
        .channel(`messages-live-${activeUserId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async () => {
          const currentSelectedId = selectedConversationIdRef.current
          if (currentSelectedId) {
            await getMessages(currentSelectedId, false)
          }
          await getConversations(false)
        })
        .subscribe(),

      supabase
        .channel(`ride-requests-live-${activeUserId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, async () => {
          await getRideRequests()
          await getAllMyRides()
        })
        .subscribe(),

      supabase
        .channel(`conversations-live-${activeUserId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, async () => {
          await getConversations(false)
        })
        .subscribe(),

      supabase
        .channel(`ride-listings-live-${activeUserId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_listings' }, async () => {
          await getRides()
          await getAllMyRides()
        })
        .subscribe(),

      supabase
        .channel(`reviews-live-${activeUserId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, async () => {
          await getReviews()
        })
        .subscribe(),

      supabase
        .channel(`profiles-live-${activeUserId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, async () => {
          await getProfile()
        })
        .subscribe(),
    ]

    return () => {
      channels.forEach((channel) => {
        void supabase.removeChannel(channel)
      })
    }
  }, [telegramReady, telegramUser?.id])

  useEffect(() => {
    if (conversations.length === 0) {
      if (selectedConversationId !== null) {
        setSelectedConversationId(null)
        setMessages([])
      }
      return
    }

    const selectedStillExists = conversations.some((item) => item.id === selectedConversationId)
    if (selectedConversationId === null || !selectedStillExists) {
      setSelectedConversationId(conversations[0].id)
    }
  }, [conversations, selectedConversationId])

  useEffect(() => {
    if (!selectedConversationId) return
    void getMessages(selectedConversationId)
  }, [selectedConversationId])

  async function initializeData() {
    setMessage('')
    setSelectedConversationId(null)
    setMessages([])

    await Promise.all([
      ensureTelegramUserRecords(),
      getProfile(),
      getRides(),
      getAllMyRides(),
      getRideRequests(),
      getConversations(false),
      getReviews(),
    ])
  }

  async function ensureTelegramUserRecords() {
    const current = getActiveUser()
    if (!current) return

    await supabase.from('users').upsert({
      id: current.driverId,
      username: current.username,
      full_name: current.fullName,
    })

    const { data } = await supabase.from('profiles').select('*').eq('id', current.driverId).maybeSingle()

    if (!data) {
      await supabase.from('profiles').insert({
        id: current.driverId,
        full_name: current.fullName,
        username: current.username,
        phone: null,
        bio: '',
        role: 'passenger',
        car_brand: null,
        license_plate: null,
        is_blocked: false,
        admin_note: null,
        last_seen_at: new Date().toISOString(),
      })
    }

    await supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', current.driverId)
  }

  async function getProfile() {
    const current = getActiveUser()
    if (!current) return

    const { data, error } = await supabase.from('profiles').select('*').eq('id', current.driverId).maybeSingle()

    if (error) {
      console.error('Profile read error:', JSON.stringify(error, null, 2))
      return
    }

    if (data) {
      const p = data as Profile
      setProfile(p)
      setProfileFullName(p.full_name || current.fullName)
      setProfileUsername(p.username || current.username)
      setProfilePhone(p.phone || '')
      setProfileBio(p.bio || '')
      setCarBrand(p.car_brand || '')
      setLicensePlate(p.license_plate || '')
      setInitialRole(p.role || 'passenger')
    } else {
      setProfile(null)
      setProfileFullName(current.fullName)
      setProfileUsername(current.username)
      setProfilePhone('')
      setProfileBio('')
      setCarBrand('')
      setLicensePlate('')
      setInitialRole('passenger')
    }
  }

  async function getRides() {
    setLoading(true)

    const { data, error } = await supabase
      .from('ride_listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Ride list error:', JSON.stringify(error, null, 2))
      setMessage('Aktiv elanlar yüklənmədi.')
    } else {
      setRides((data as Ride[]) || [])
    }

    setLoading(false)
  }

  async function getAllMyRides() {
    const current = getActiveUser()
    if (!current) return

    const { data, error } = await supabase
      .from('ride_listings')
      .select('*')
      .eq('driver_id', current.driverId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('My rides error:', JSON.stringify(error, null, 2))
      return
    }

    const rows = (data as Ride[]) || []
    setAllMyRides(rows)
    setMyRides(rows.filter((ride) => ride.status === 'active'))
    setHistoryRides(rows.filter((ride) => ride.status !== 'active'))
  }

  async function getRideRequests() {
    const current = getActiveUser()
    if (!current) return

    const { data, error } = await supabase
      .from('ride_requests')
      .select('*')
      .or(`requester_id.eq.${current.driverId},owner_id.eq.${current.driverId}`)
      .order('id', { ascending: false })

    if (error) {
      console.error('Ride requests error:', JSON.stringify(error, null, 2))
      return
    }

    const rows = (data as RideRequest[]) || []
    const rideIds = [...new Set(rows.map((x) => x.ride_id).filter(Boolean))]
    let rideMap = new Map<string, Ride>()

    if (rideIds.length > 0) {
      const { data: ridesData } = await supabase.from('ride_listings').select('*').in('id', rideIds)
      rideMap = new Map(((ridesData as Ride[]) || []).map((ride) => [ride.id, ride]))
    }

    setRideRequests(
      rows.map((item) => ({
        ...item,
        ride: rideMap.get(item.ride_id) || null,
      }))
    )
  }

  async function getReviews() {
    const current = getActiveUser()
    if (!current) return

    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .or(`reviewer_id.eq.${current.driverId},reviewee_id.eq.${current.driverId}`)
      .order('id', { ascending: false })

    if (error) {
      console.error('Reviews error:', JSON.stringify(error, null, 2))
      return
    }

    const rows = (data as Review[]) || []
    const rideIds = [...new Set(rows.map((x) => x.ride_id).filter(Boolean))] as string[]
    let rideMap = new Map<string, Ride>()

    if (rideIds.length > 0) {
      const { data: ridesData } = await supabase.from('ride_listings').select('*').in('id', rideIds)
      rideMap = new Map(((ridesData as Ride[]) || []).map((ride) => [ride.id, ride]))
    }

    setReviews(
      rows.map((item) => ({
        ...item,
        ride: item.ride_id ? rideMap.get(item.ride_id) || null : null,
      }))
    )
  }

  async function markConversationMessagesAsRead(conversationId: number) {
    const current = getActiveUser()
    if (!current) return

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('is_read', false)
      .neq('sender_id', current.driverId)
  }

  async function getConversations(preserveSelection = true) {
    const current = getActiveUser()
    if (!current) return

    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .or(`driver_user_id.eq.${current.driverId},passenger_user_id.eq.${current.driverId}`)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Conversations error:', JSON.stringify(error, null, 2))
      return
    }

    const rows = (data as Conversation[]) || []
    const rideIds = [...new Set(rows.map((x) => x.ride_id).filter(Boolean))]
    let rideMap = new Map<string, Ride>()

    if (rideIds.length > 0) {
      const { data: ridesData } = await supabase.from('ride_listings').select('*').in('id', rideIds)
      rideMap = new Map(((ridesData as Ride[]) || []).map((ride) => [ride.id, ride]))
    }

    const unreadMap = new Map<number, number>()

    if (rows.length > 0) {
      const conversationIds = rows.map((x) => x.id)
      const { data: unreadRows } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', current.driverId)

      for (const row of unreadRows || []) {
        const conversationId = (row as { conversation_id: number }).conversation_id
        unreadMap.set(conversationId, (unreadMap.get(conversationId) || 0) + 1)
      }
    }

    const enriched = rows.map((item) => ({
      ...item,
      ride: rideMap.get(item.ride_id) || null,
      unread_count: unreadMap.get(item.id) || 0,
    }))

    setConversations(enriched)
    setUnreadTotal(enriched.reduce((sum, item) => sum + (item.unread_count || 0), 0))

    if (enriched.length === 0) {
      setSelectedConversationId(null)
      setMessages([])
      return
    }

    if (!preserveSelection) return

    const currentSelectedId = selectedConversationIdRef.current
    const selectedStillExists = enriched.some((item) => item.id === currentSelectedId)

    if (currentSelectedId === null || !selectedStillExists) {
      setSelectedConversationId(enriched[0].id)
    }
  }

  async function getMessages(conversationId: number, markRead = true) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Messages error:', JSON.stringify(error, null, 2))
      return
    }

    setMessages((data as Message[]) || [])

    if (markRead) {
      await markConversationMessagesAsRead(conversationId)
      await getConversations(false)
    }
  }

  async function handleCreateOrUpdateProfile(e: React.FormEvent) {
    e.preventDefault()

    const current = getActiveUser()
    if (!current) return

    setProfileSaving(true)
    setMessage('')

    if (!profilePhone.trim()) {
      setMessage('Telefon nömrəsi məcburidir.')
      setProfileSaving(false)
      return
    }

    const effectiveRole = profile ? profile.role : initialRole

    if (effectiveRole === 'driver' && (!carBrand.trim() || !licensePlate.trim())) {
      setMessage('Sürücü üçün avtomobil markası və nömrə məcburidir.')
      setProfileSaving(false)
      return
    }

    const payload = {
      id: current.driverId,
      full_name: profileFullName.trim(),
      username: profileUsername.trim(),
      phone: profilePhone.trim(),
      bio: profileBio.trim(),
      role: effectiveRole,
      car_brand: effectiveRole === 'driver' ? carBrand.trim() : null,
      license_plate: effectiveRole === 'driver' ? licensePlate.trim() : null,
      updated_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('profiles').upsert(payload)

    if (error) {
      console.error('Profile save error:', JSON.stringify(error, null, 2))
      setMessage('Profil yadda saxlanmadı.')
    } else {
      setMessage('Profil yadda saxlanıldı.')
      await getProfile()
    }

    setProfileSaving(false)
  }

  async function handleSubmitRide(e: React.FormEvent) {
    e.preventDefault()

    const current = getActiveUser()
    if (!current) return

    setSubmitting(true)
    setMessage('')

    if (!profile) {
      setMessage('Əvvəl profil yaratmaq lazımdır.')
      setSubmitting(false)
      return
    }

    if (profile.is_blocked) {
      setMessage('Profil bloklandığı üçün elan yarada bilməzsən.')
      setSubmitting(false)
      return
    }

    const cleanOrigin = origin.trim()
    const cleanDestination = destination.trim()
    const cleanNotes = notes.trim()

    if (!cleanOrigin || !cleanDestination) {
      setMessage('Haradan və hara məcburidir.')
      setSubmitting(false)
      return
    }

    if (cleanNotes.length > LIMITS.notesMax) {
      setMessage(`Qeyd maksimum ${LIMITS.notesMax} simvol ola bilər.`)
      setSubmitting(false)
      return
    }

    const seatsNumber = Number(seats)
    const priceNumber = Number(pricePerSeat)

    if (!Number.isFinite(seatsNumber) || seatsNumber < 1 || seatsNumber > 20) {
      setMessage('Yer sayı 1-20 arası olmalıdır.')
      setSubmitting(false)
      return
    }

    if (!Number.isFinite(priceNumber) || priceNumber < 0) {
      setMessage('Qiymət düzgün daxil edilməlidir.')
      setSubmitting(false)
      return
    }

    const duplicateActiveRide = myRides.find((ride) => {
      if (editingRideId && ride.id === editingRideId) return false

      return (
        normalizeText(ride.origin) === normalizeText(cleanOrigin) &&
        normalizeText(ride.destination) === normalizeText(cleanDestination) &&
        (ride.ride_date || '') === rideDate &&
        ride.departure_time === departureTime &&
        ride.status === 'active'
      )
    })

    if (duplicateActiveRide) {
      setMessage('Bu marşrut, tarix və saat üçün artıq aktiv elan var.')
      setSubmitting(false)
      return
    }

    if (editingRideId) {
      const { error } = await supabase
        .from('ride_listings')
        .update({
          role: profile.role,
          origin: cleanOrigin,
          destination: cleanDestination,
          ride_date: rideDate,
          departure_time: departureTime,
          seats: seatsNumber,
          price_per_seat: priceNumber,
          notes: cleanNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingRideId)

      if (error) {
        console.error('Edit ride error:', JSON.stringify(error, null, 2))
        setMessage('Elan yenilənmədi.')
      } else {
        setMessage('Elan yeniləndi.')
        resetRideForm()
        await initializeData()
        setActiveTab('dashboard')
      }
    } else {
      const { error } = await supabase.from('ride_listings').insert({
        driver_id: current.driverId,
        role: profile.role,
        origin: cleanOrigin,
        destination: cleanDestination,
        ride_date: rideDate,
        departure_time: departureTime,
        seats: seatsNumber,
        price_per_seat: priceNumber,
        is_recurring: false,
        women_only: false,
        notes: cleanNotes || null,
        status: 'active',
      })

      if (error) {
        console.error('Insert ride error:', JSON.stringify(error, null, 2))
        setMessage('Elan əlavə olunmadı.')
      } else {
        setMessage('Elan əlavə olundu.')
        resetRideForm()
        await initializeData()
        setActiveTab('dashboard')
      }
    }

    setSubmitting(false)
  }

  function handleEditRide(ride: Ride) {
    setEditingRideId(ride.id)
    setOrigin(ride.origin || '')
    setDestination(ride.destination || '')
    setRideDate(ride.ride_date || '')
    setDepartureTime(ride.departure_time || '')
    setSeats(String(ride.seats ?? 1))
    setPricePerSeat(String(ride.price_per_seat ?? ''))
    setNotes(ride.notes || '')
    setActiveTab('create')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleDeleteRide(rideId: string) {
    const confirmed = window.confirm('Bu elanı ləğv etmək istəyirsən?')
    if (!confirmed) return

    setRideActionLoading(rideId)

    const { error } = await supabase
      .from('ride_listings')
      .update({
        status: 'cancelled',
        closed_reason: 'driver_cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', rideId)

    if (error) {
      setMessage('Elan ləğv edilmədi.')
    } else {
      setMessage('Elan ləğv edildi.')
      if (editingRideId === rideId) resetRideForm()
      await initializeData()
    }

    setRideActionLoading(null)
  }

  async function handleCloseRide(rideId: string) {
    const confirmed = window.confirm('Bu elanı bağlamaq istəyirsən?')
    if (!confirmed) return

    setRideActionLoading(rideId)

    const { error } = await supabase
      .from('ride_listings')
      .update({
        status: 'full',
        closed_reason: 'manually_closed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', rideId)

    if (error) {
      setMessage('Elan bağlanmadı.')
    } else {
      setMessage('Elan bağlandı.')
      await initializeData()
    }

    setRideActionLoading(null)
  }

  async function handleCompleteRide(rideId: string) {
    const confirmed = window.confirm('Bu elanı tamamlandı kimi işarələmək istəyirsən?')
    if (!confirmed) return

    setRideActionLoading(rideId)

    const { error } = await supabase
      .from('ride_listings')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        closed_reason: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', rideId)

    if (error) {
      setMessage('Elan tamamlanmadı.')
    } else {
      setMessage('Elan tamamlandı.')
      await initializeData()
    }

    setRideActionLoading(null)
  }

  async function handleCreateRideRequest(ride: Ride) {
    const current = getActiveUser()
    if (!current) return

    if (!profile) {
      setMessage('Əvvəl profil yaratmaq lazımdır.')
      return
    }

    if (profile.is_blocked) {
      setMessage('Profil bloklandığı üçün müraciət göndərə bilməzsən.')
      return
    }

    if (ride.driver_id === current.driverId) {
      setMessage('Öz elanına müraciət edə bilməzsən.')
      return
    }

    if (ride.status !== 'active') {
      setMessage('Bu elan artıq aktiv deyil.')
      return
    }

    const requestMessage = (requestMessageMap[ride.id] || '').trim()
    const requestedSeats = Number(requestSeatsMap[ride.id] || '1')

    if (requestMessage.length > LIMITS.rideRequestMessageMax) {
      setMessage(`Müraciət mesajı maksimum ${LIMITS.rideRequestMessageMax} simvol ola bilər.`)
      return
    }

    if (!Number.isFinite(requestedSeats) || requestedSeats < 1 || requestedSeats > 20) {
      setMessage('Yer sayı 1-20 arası olmalıdır.')
      return
    }

    if (requestedSeats > ride.seats) {
      setMessage(`Maksimum ${ride.seats} yer qalıb.`)
      return
    }

    const existingPending = rideRequests.find(
      (item) =>
        item.ride_id === ride.id &&
        item.requester_id === current.driverId &&
        (item.status === 'pending' || item.status === 'accepted')
    )

    if (existingPending) {
      setMessage('Bu elana artıq aktiv müraciətin var.')
      return
    }

    setRideRequestLoading(ride.id)

    const requesterRole = profile.role
    const ownerRole = ride.role === 'driver' ? 'driver' : 'passenger'

    const { error } = await supabase.from('ride_requests').insert({
      ride_id: ride.id,
      requester_id: current.driverId,
      owner_id: ride.driver_id,
      requester_role: requesterRole,
      owner_role: ownerRole,
      message_text: requestMessage || null,
      seats_requested: requestedSeats,
      status: 'pending',
    })

    if (error) {
      setMessage('Müraciət göndərilmədi.')
    } else {
      setMessage('Müraciət göndərildi.')
      setRequestMessageMap((prev) => ({ ...prev, [ride.id]: '' }))
      setRequestSeatsMap((prev) => ({ ...prev, [ride.id]: '1' }))
      await getRideRequests()
      setActiveTab('requests')
    }

    setRideRequestLoading(null)
  }

  async function ensureConversationForRequest(request: RideRequestWithRide) {
    const { data: existingConversation } = await supabase
      .from('conversations')
      .select('*')
      .eq('request_id', request.id)
      .maybeSingle()

    if (existingConversation) return (existingConversation as Conversation).id

    const driverUserId = request.owner_role === 'driver' ? request.owner_id : request.requester_id
    const passengerUserId = request.owner_role === 'passenger' ? request.owner_id : request.requester_id

    const { data: newConversation, error: conversationError } = await supabase
      .from('conversations')
      .insert({
        ride_id: request.ride_id,
        request_id: request.id,
        driver_user_id: driverUserId,
        passenger_user_id: passengerUserId,
        status: 'active',
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single()

    if (conversationError) return null
    return (newConversation as Conversation).id
  }

  async function handleRideRequestDecision(request: RideRequestWithRide, decision: 'accepted' | 'rejected') {
    setRideRequestLoading(request.id)

    const { error } = await supabase
      .from('ride_requests')
      .update({
        status: decision,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.id)

    if (error) {
      setMessage('Müraciət statusu yenilənmədi.')
      setRideRequestLoading(null)
      return
    }

    if (decision === 'accepted') {
      const finalConversationId = await ensureConversationForRequest(request)

      if (!finalConversationId) {
        setMessage('Chat açıla bilmədi.')
        setRideRequestLoading(null)
        return
      }

      await supabase
        .from('conversations')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', finalConversationId)

      setSelectedConversationId(finalConversationId)
      setMessage('Müraciət qəbul edildi. Chat açıldı.')
      await Promise.all([getRideRequests(), getConversations(true), getRides(), getAllMyRides()])
      setActiveTab('chat')
    } else {
      setMessage('Müraciət rədd edildi.')
      await getRideRequests()
    }

    setRideRequestLoading(null)
  }

  async function handleConfirmDeal(request: RideRequestWithRide) {
    const ride = allMyRides.find((item) => item.id === request.ride_id)

    if (!ride) {
      setMessage('Elan tapılmadı.')
      return
    }

    if (ride.status !== 'active') {
      setMessage('Elan artıq aktiv deyil.')
      return
    }

    if (request.status !== 'accepted') {
      setMessage('Əvvəlcə müraciət qəbul edilməlidir.')
      return
    }

    if (request.seats_requested > ride.seats) {
      setMessage(`Kifayət qədər yer yoxdur. Qalan yer: ${ride.seats}`)
      return
    }

    setRideRequestLoading(request.id)

    const remainingSeats = Math.max(0, ride.seats - request.seats_requested)
    const nextStatus: RideStatus = remainingSeats === 0 ? 'full' : 'active'

    const { error: rideError } = await supabase
      .from('ride_listings')
      .update({
        seats: remainingSeats,
        status: nextStatus,
        closed_reason: remainingSeats === 0 ? 'matched' : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.ride_id)

    if (rideError) {
      setMessage('Deal təsdiqlənmədi.')
      setRideRequestLoading(null)
      return
    }

    setMessage(remainingSeats === 0 ? 'Deal təsdiqləndi, elan bağlandı.' : `Deal təsdiqləndi. Qalan yer: ${remainingSeats}`)
    await Promise.all([getRideRequests(), getRides(), getAllMyRides()])
    setRideRequestLoading(null)
  }

  async function handleOpenConversation(conversationId: number) {
    setSelectedConversationId(conversationId)
    await getMessages(conversationId)
    await getConversations(false)
    setActiveTab('chat')
  }

  async function handleSendMessage() {
    const current = getActiveUser()
    if (!current) return

    if (!selectedConversationId) {
      setMessage('Əvvəl chat seç.')
      return
    }

    if (!chatInput.trim()) return
    if (chatInput.trim().length > LIMITS.messageMax) {
      setMessage(`Mesaj maksimum ${LIMITS.messageMax} simvol ola bilər.`)
      return
    }

    setMessageSending(true)

    const { error } = await supabase.from('messages').insert({
      conversation_id: selectedConversationId,
      sender_id: current.driverId,
      message_text: chatInput.trim(),
      is_read: false,
    })

    if (error) {
      setMessage('Mesaj göndərilmədi.')
    } else {
      setChatInput('')
      await supabase
        .from('conversations')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedConversationId)

      await getMessages(selectedConversationId, false)
      await getConversations(false)
    }

    setMessageSending(false)
  }

  async function handleCreateReview() {
    const current = getActiveUser()
    if (!current) return

    if (!reviewTargetRequestId) {
      setMessage('Əvvəl request seç.')
      return
    }

    const req = rideRequests.find((item) => item.id === reviewTargetRequestId)

    if (!req) {
      setMessage('Request tapılmadı.')
      return
    }

    const rating = Number(reviewRating)
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      setMessage('Reytinq 1-5 arası olmalıdır.')
      return
    }

    const comment = reviewComment.trim()
    if (comment.length > LIMITS.reviewCommentMax) {
      setMessage(`Review mətni maksimum ${LIMITS.reviewCommentMax} simvol ola bilər.`)
      return
    }

    const revieweeId = req.owner_id === current.driverId ? req.requester_id : req.owner_id

    const existing = reviews.find(
      (item) =>
        item.request_id === req.id &&
        item.reviewer_id === current.driverId &&
        item.reviewee_id === revieweeId
    )

    if (existing) {
      setMessage('Bu request üçün artıq review yazmısan.')
      return
    }

    const { error } = await supabase.from('reviews').insert({
      ride_id: req.ride_id,
      conversation_id: null,
      request_id: req.id,
      reviewer_id: current.driverId,
      reviewee_id: revieweeId,
      rating,
      comment_text: comment || null,
    })

    if (error) {
      setMessage('Review göndərilmədi.')
    } else {
      setMessage('Review göndərildi.')
      setReviewTargetRequestId(null)
      setReviewRating('5')
      setReviewComment('')
      await getReviews()
    }
  }

  const filteredRides = useMemo(() => {
    const current = getActiveUser()
    if (!current) return []

    const text = searchText.toLowerCase().trim()

    return rides.filter((ride) => {
      const rideOrigin = (ride.origin || '').toLowerCase()
      const rideDestination = (ride.destination || '').toLowerCase()
      const rideNotes = (ride.notes || '').toLowerCase()

      const matchesText =
        !text || rideOrigin.includes(text) || rideDestination.includes(text) || rideNotes.includes(text)

      const matchesRole = filterRole === 'all' || (ride.role || 'driver') === filterRole
      const matchesDate = !filterDate || (ride.ride_date || '') === filterDate
      const notMine = ride.driver_id !== current.driverId

      return matchesText && matchesRole && matchesDate && notMine && ride.status === 'active'
    })
  }, [rides, searchText, filterRole, filterDate, telegramUser?.id])

  const incomingRideRequests = useMemo(() => {
    if (!currentUser) return []
    return rideRequests.filter((item) => item.owner_id === currentUser.driverId)
  }, [rideRequests, currentUser?.driverId])

  const outgoingRideRequests = useMemo(() => {
    if (!currentUser) return []
    return rideRequests.filter((item) => item.requester_id === currentUser.driverId)
  }, [rideRequests, currentUser?.driverId])

  const selectedConversation =
    conversations.find((item) => item.id === selectedConversationId) || null

  const selectedConversationRide = selectedConversation?.ride || null

  const currentMessages = useMemo(() => {
    if (!selectedConversationId) return []
    return messages.filter((item) => item.conversation_id === selectedConversationId)
  }, [messages, selectedConversationId])

  if (telegramError) {
    return (
      <main style={styles.page}>
        <div style={styles.headerCard}>
          <h1 style={styles.title}>Yolüstü</h1>
          <p style={styles.subtitle}>Telegram WebApp user tələb olunur.</p>
        </div>
        <div style={styles.errorMessage}>{telegramError}</div>
      </main>
    )
  }

  if (!telegramReady || !currentUser) {
    return (
      <main style={styles.page}>
        <div style={styles.headerCard}>
          <h1 style={styles.title}>Yolüstü</h1>
          <p style={styles.subtitle}>Telegram istifadəçisi yüklənir...</p>
        </div>
      </main>
    )
  }

  return (
    <main style={styles.page}>
      <div style={styles.headerCard}>
        <h1 style={styles.title}>Yolüstü</h1>
        <p style={styles.subtitle}>
          Telegram aktiv user id ilə işləyən versiya.
        </p>
      </div>

      <section style={styles.sectionCard}>
        <h2 style={styles.sectionTitle}>Aktiv istifadəçi</h2>
        <p style={styles.infoRow}>
          <strong>Ad:</strong> {currentUser.fullName}
        </p>
        <p style={styles.infoRow}>
          <strong>User ID:</strong> {currentUser.driverId}
        </p>
        <p style={styles.infoRow}>
          <strong>Username:</strong> {currentUser.username || '-'}
        </p>
      </section>

      <div style={styles.topTabs}>
        {[
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'create', label: 'Elan ver' },
          { key: 'search', label: 'Axtarış' },
          { key: 'requests', label: `Müraciətlər (${incomingRideRequests.filter((x) => x.status === 'pending').length})` },
          { key: 'chat', label: unreadTotal > 0 ? `Chat (${unreadTotal})` : `Chat (${conversations.length})` },
          { key: 'history', label: 'Tarixçə' },
          { key: 'reviews', label: 'Reviews' },
          { key: 'profile', label: 'Profil' },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setActiveTab(item.key as TabType)}
            style={activeTab === item.key ? styles.activeTabButton : styles.tabButton}
          >
            {item.label}
          </button>
        ))}
      </div>

      {message && <div style={styles.message}>{message}</div>}

      {activeTab === 'dashboard' && (
        <>
          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Dashboard</h2>

            <div style={styles.statsGrid}>
              <div style={styles.statsCard}>
                <p style={styles.statLabel}>Aktiv elanlarım</p>
                <p style={styles.statValue}>{myRides.length}</p>
              </div>

              <div style={styles.statsCard}>
                <p style={styles.statLabel}>Tarixçədəki elanlar</p>
                <p style={styles.statValue}>{historyRides.length}</p>
              </div>

              <div style={styles.statsCard}>
                <p style={styles.statLabel}>Gələn müraciətlər</p>
                <p style={styles.statValue}>{incomingRideRequests.filter((x) => x.status === 'pending').length}</p>
              </div>

              <div style={styles.statsCard}>
                <p style={styles.statLabel}>Oxunmamış mesajlar</p>
                <p style={styles.statValue}>{unreadTotal}</p>
              </div>
            </div>
          </section>

          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Mənim aktiv elanlarım</h2>

            {myRides.length === 0 ? (
              <p style={styles.mutedText}>Aktiv elanın yoxdur.</p>
            ) : (
              <div style={styles.ridesGrid}>
                {myRides.map((ride) => (
                  <div key={ride.id} style={styles.myRideCard}>
                    <div style={getRideBadgeStyle(ride.status)}>{getRideStatusLabel(ride.status)}</div>
                    <p style={styles.infoRow}><strong>Rol:</strong> {getRoleLabel(ride.role)}</p>
                    <p style={styles.infoRow}><strong>Haradan:</strong> {ride.origin}</p>
                    <p style={styles.infoRow}><strong>Hara:</strong> {ride.destination}</p>
                    <p style={styles.infoRow}><strong>Tarix:</strong> {ride.ride_date || '-'}</p>
                    <p style={styles.infoRow}><strong>Saat:</strong> {ride.departure_time}</p>
                    <p style={styles.infoRow}><strong>Qalan yer:</strong> {ride.seats}</p>
                    <p style={styles.infoRow}><strong>Qiymət:</strong> {ride.price_per_seat} AZN</p>
                    {ride.notes && <p style={styles.infoRow}><strong>Qeyd:</strong> {ride.notes}</p>}

                    <div style={styles.actionRow}>
                      <button type="button" onClick={() => handleEditRide(ride)} style={styles.secondaryButton}>
                        Redaktə et
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCloseRide(ride.id)}
                        style={styles.closeButton}
                        disabled={rideActionLoading === ride.id}
                      >
                        Elanı bağla
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleCompleteRide(ride.id)}
                        style={styles.successButton}
                        disabled={rideActionLoading === ride.id}
                      >
                        Tamamlandı
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteRide(ride.id)}
                        style={styles.dangerButton}
                        disabled={rideActionLoading === ride.id}
                      >
                        Ləğv et
                      </button>
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
              <LocationPicker
                origin={origin}
                setOrigin={setOrigin}
                destination={destination}
                setDestination={setDestination}
                googleApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}
              />

              <div style={styles.twoColumnGrid}>
                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Tarix</label>
                  <input
                    type="date"
                    value={rideDate}
                    onChange={(e) => setRideDate(e.target.value)}
                    required
                    style={styles.input}
                  />
                  <div style={styles.chipRow}>
                    <button type="button" onClick={setToday} style={styles.chip}>Bugün</button>
                    <button type="button" onClick={setTomorrow} style={styles.chip}>Sabah</button>
                    <button type="button" onClick={setPlusTwoDays} style={styles.chip}>2 gün</button>
                  </div>
                </div>

                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Saat</label>
                  <input
                    type="time"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    required
                    style={styles.input}
                  />
                  <div style={styles.chipRow}>
                    <button type="button" onClick={setNowTime} style={styles.chip}>İndi</button>
                    <button type="button" onClick={setPlus30Min} style={styles.chip}>30 dəq</button>
                    <button type="button" onClick={setPlus60Min} style={styles.chip}>1 saat</button>
                    <button type="button" onClick={() => setPresetTime('09:00')} style={styles.chip}>09:00</button>
                    <button type="button" onClick={() => setPresetTime('18:00')} style={styles.chip}>18:00</button>
                  </div>
                </div>
              </div>

              <div style={styles.twoColumnGrid}>
                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Yer sayı</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={seats}
                    onChange={(e) => setSeats(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.fieldWrap}>
                  <label style={styles.label}>1 nəfər üçün qiymət</label>
                  <input
                    type="number"
                    min="0"
                    value={pricePerSeat}
                    onChange={(e) => setPricePerSeat(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Qeyd</label>
                <textarea
                  rows={4}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={styles.textarea}
                  placeholder="Əlavə məlumat..."
                />
              </div>

              <div style={styles.actionRow}>
                <button type="submit" style={styles.primaryButton} disabled={submitting}>
                  {submitting ? 'Yadda saxlanılır...' : editingRideId ? 'Elanı yenilə' : 'Elan yarat'}
                </button>

                {editingRideId && (
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={resetRideForm}
                  >
                    Ləğv et
                  </button>
                )}
              </div>
            </form>
          )}
        </section>
      )}

      {activeTab === 'search' && (
        <section style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Elan axtar</h2>

          <div style={styles.twoColumnGrid}>
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Mətn axtarışı</label>
              <input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={styles.input}
                placeholder="Bakı, Gəncə, hava limanı..."
              />
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Rol</label>
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={styles.select}>
                <option value="all">Hamısı</option>
                <option value="driver">Sürücü</option>
                <option value="passenger">Sərnişin</option>
              </select>
            </div>
          </div>

          <div style={{ ...styles.fieldWrap, marginTop: 12 }}>
            <label style={styles.label}>Tarix</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              style={styles.input}
            />
          </div>

          <div style={{ height: 16 }} />

          {loading ? (
            <p style={styles.mutedText}>Yüklənir...</p>
          ) : filteredRides.length === 0 ? (
            <p style={styles.mutedText}>Uyğun elan tapılmadı.</p>
          ) : (
            <div style={styles.ridesGrid}>
              {filteredRides.map((ride) => (
                <div key={ride.id} style={styles.resultCard}>
                  <div style={getRideBadgeStyle(ride.status)}>{getRideStatusLabel(ride.status)}</div>
                  <p style={styles.infoRow}><strong>Rol:</strong> {getRoleLabel(ride.role)}</p>
                  <p style={styles.infoRow}><strong>Marşrut:</strong> {ride.origin} → {ride.destination}</p>
                  <p style={styles.infoRow}><strong>Tarix/Saat:</strong> {ride.ride_date || '-'} / {ride.departure_time}</p>
                  <p style={styles.infoRow}><strong>Qiymət:</strong> {ride.price_per_seat} AZN</p>
                  <p style={styles.infoRow}><strong>Qalan yer:</strong> {ride.seats}</p>

                  <div style={styles.fieldWrap}>
                    <label style={styles.label}>Mesaj</label>
                    <textarea
                      rows={2}
                      value={requestMessageMap[ride.id] || ''}
                      onChange={(e) =>
                        setRequestMessageMap((prev) => ({ ...prev, [ride.id]: e.target.value }))
                      }
                      style={styles.textarea}
                      placeholder="Müraciət mesajı..."
                    />
                  </div>

                  <div style={styles.fieldWrap}>
                    <label style={styles.label}>İstənən yer sayı</label>
                    <input
                      type="number"
                      min="1"
                      max={ride.seats}
                      value={requestSeatsMap[ride.id] || '1'}
                      onChange={(e) =>
                        setRequestSeatsMap((prev) => ({ ...prev, [ride.id]: e.target.value }))
                      }
                      style={styles.input}
                    />
                  </div>

                  <div style={styles.actionRow}>
                    <button
                      type="button"
                      onClick={() => void handleCreateRideRequest(ride)}
                      style={styles.primaryButton}
                      disabled={rideRequestLoading === ride.id}
                    >
                      {rideRequestLoading === ride.id ? 'Göndərilir...' : 'Müraciət et'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'requests' && (
        <>
          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Gələn müraciətlər</h2>

            {incomingRideRequests.length === 0 ? (
              <p style={styles.mutedText}>Gələn müraciət yoxdur.</p>
            ) : (
              <div style={styles.ridesGrid}>
                {incomingRideRequests.map((item) => {
                  const ride = item.ride
                  return (
                    <div key={item.id} style={styles.resultCard}>
                      <div style={getRequestBadgeStyle(item.status)}>{getRequestStatusLabel(item.status)}</div>
                      <p style={styles.infoRow}><strong>Göndərən ID:</strong> {item.requester_id}</p>
                      <p style={styles.infoRow}><strong>Rol:</strong> {getRoleLabel(item.requester_role)}</p>
                      <p style={styles.infoRow}><strong>İstənən yer sayı:</strong> {item.seats_requested}</p>
                      <p style={styles.infoRow}><strong>Mesaj:</strong> {item.message_text || '-'}</p>
                      {ride && <p style={styles.infoRow}><strong>Marşrut:</strong> {ride.origin} → {ride.destination}</p>}

                      {item.status === 'pending' && ride?.status === 'active' && (
                        <div style={styles.actionRow}>
                          <button
                            type="button"
                            style={styles.successButton}
                            disabled={rideRequestLoading === item.id}
                            onClick={() => void handleRideRequestDecision(item, 'accepted')}
                          >
                            Qəbul et
                          </button>
                          <button
                            type="button"
                            style={styles.dangerButton}
                            disabled={rideRequestLoading === item.id}
                            onClick={() => void handleRideRequestDecision(item, 'rejected')}
                          >
                            Rədd et
                          </button>
                        </div>
                      )}

                      {item.status === 'accepted' && ride?.status === 'active' && (
                        <div style={styles.actionRow}>
                          <button
                            type="button"
                            style={styles.closeButton}
                            disabled={rideRequestLoading === item.id}
                            onClick={() => void handleConfirmDeal(item)}
                          >
                            Deal təsdiqlə
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Göndərdiyim müraciətlər</h2>

            {outgoingRideRequests.length === 0 ? (
              <p style={styles.mutedText}>Göndərilmiş müraciət yoxdur.</p>
            ) : (
              <div style={styles.ridesGrid}>
                {outgoingRideRequests.map((item) => (
                  <div key={item.id} style={styles.resultCard}>
                    <div style={getRequestBadgeStyle(item.status)}>{getRequestStatusLabel(item.status)}</div>
                    <p style={styles.infoRow}><strong>Ride ID:</strong> {item.ride_id}</p>
                    <p style={styles.infoRow}><strong>Yer sayı:</strong> {item.seats_requested}</p>
                    <p style={styles.infoRow}><strong>Mesaj:</strong> {item.message_text || '-'}</p>
                    <p style={styles.infoRow}><strong>Tarix:</strong> {formatDateTime(item.created_at)}</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'chat' && (
        <section style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Chat</h2>

          <div style={styles.chatLayout}>
            <div>
              <p style={styles.mutedText}>Conversation siyahısı</p>

              <div style={styles.conversationList}>
                {conversations.length === 0 ? (
                  <p style={styles.mutedText}>Hələ aktiv chat yoxdur.</p>
                ) : (
                  conversations.map((conv) => {
                    const ride = conv.ride

                    return (
                      <div
                        key={conv.id}
                        style={selectedConversationId === conv.id ? styles.conversationCardActive : styles.conversationCard}
                        onClick={() => void handleOpenConversation(conv.id)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                          <div style={styles.pendingBadge}>Chat #{conv.id}</div>
                          {conv.unread_count ? <div style={styles.unreadBadge}>{conv.unread_count}</div> : null}
                        </div>

                        <p style={styles.infoRow}>
                          <strong>Marşrut:</strong> {ride ? `${ride.origin} → ${ride.destination}` : '-'}
                        </p>
                        <p style={styles.infoRow}>
                          <strong>Tarix/Saat:</strong> {ride ? `${ride.ride_date || '-'} / ${ride.departure_time}` : '-'}
                        </p>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div style={styles.chatPanel}>
              {!selectedConversation ? (
                <p style={styles.mutedText}>Chat seç.</p>
              ) : (
                <>
                  <p style={styles.infoRow}>
                    <strong>Seçilmiş chat:</strong> #{selectedConversation.id}
                  </p>

                  <div style={{ height: 12 }} />

                  {selectedConversationRide?.status === 'active' && (
                    <LiveMap
                      conversationId={selectedConversation.id}
                      currentUserId={currentUser.driverId}
                      isDriver={profile?.role === 'driver'}
                      otherUserId={
                        currentUser.driverId === selectedConversation.driver_user_id
                          ? selectedConversation.passenger_user_id
                          : selectedConversation.driver_user_id
                      }
                    />
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
                            <div style={{ fontSize: 11, marginTop: 6, opacity: 0.8 }}>
                              {formatDateTime(msg.created_at)}
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>

                  <div style={styles.fieldWrap}>
                    <label style={styles.label}>Mesaj</label>
                    <textarea
                      rows={3}
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      style={styles.textarea}
                      placeholder="Mesaj yaz..."
                    />
                  </div>

                  <div style={styles.actionRow}>
                    <button
                      type="button"
                      onClick={() => void handleSendMessage()}
                      style={styles.primaryButton}
                      disabled={messageSending}
                    >
                      {messageSending ? 'Göndərilir...' : 'Göndər'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {activeTab === 'history' && (
        <section style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Elan tarixçəsi</h2>

          {historyRides.length === 0 ? (
            <p style={styles.mutedText}>Tarixçədə elan yoxdur.</p>
          ) : (
            <div style={styles.ridesGrid}>
              {historyRides.map((ride) => (
                <div key={ride.id} style={styles.resultCard}>
                  <div style={getRideBadgeStyle(ride.status)}>{getRideStatusLabel(ride.status)}</div>
                  <p style={styles.infoRow}><strong>Rol:</strong> {getRoleLabel(ride.role)}</p>
                  <p style={styles.infoRow}><strong>Haradan:</strong> {ride.origin}</p>
                  <p style={styles.infoRow}><strong>Hara:</strong> {ride.destination}</p>
                  <p style={styles.infoRow}><strong>Tarix:</strong> {ride.ride_date || '-'}</p>
                  <p style={styles.infoRow}><strong>Saat:</strong> {ride.departure_time}</p>
                  <p style={styles.infoRow}><strong>Yer:</strong> {ride.seats}</p>
                  <p style={styles.infoRow}><strong>Səbəb:</strong> {ride.closed_reason || '-'}</p>
                  <p style={styles.infoRow}><strong>Completed at:</strong> {formatDateTime(ride.completed_at)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'reviews' && (
        <>
          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Review yaz</h2>

            <div style={styles.form}>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Request seç</label>
                <select
                  value={reviewTargetRequestId ?? ''}
                  onChange={(e) => setReviewTargetRequestId(e.target.value ? Number(e.target.value) : null)}
                  style={styles.select}
                >
                  <option value="">Seç</option>
                  {rideRequests
                    .filter((item) => item.status === 'accepted')
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        #{item.id} - {item.ride?.origin || '-'} → {item.ride?.destination || '-'}
                      </option>
                    ))}
                </select>
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Reytinq</label>
                <select value={reviewRating} onChange={(e) => setReviewRating(e.target.value)} style={styles.select}>
                  <option value="5">5</option>
                  <option value="4">4</option>
                  <option value="3">3</option>
                  <option value="2">2</option>
                  <option value="1">1</option>
                </select>
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Şərh</label>
                <textarea
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  style={styles.textarea}
                />
              </div>

              <div style={styles.actionRow}>
                <button type="button" onClick={() => void handleCreateReview()} style={styles.primaryButton}>
                  Review göndər
                </button>
              </div>
            </div>
          </section>

          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Review tarixçəsi</h2>

            {reviews.length === 0 ? (
              <p style={styles.mutedText}>Review yoxdur.</p>
            ) : (
              <div style={styles.ridesGrid}>
                {reviews.map((item) => (
                  <div key={item.id} style={styles.resultCard}>
                    <p style={styles.infoRow}><strong>Rating:</strong> {item.rating}</p>
                    <p style={styles.infoRow}><strong>Comment:</strong> {item.comment_text || '-'}</p>
                    <p style={styles.infoRow}><strong>Tarix:</strong> {formatDateTime(item.created_at)}</p>
                    {item.ride && (
                      <p style={styles.infoRow}>
                        <strong>Marşrut:</strong> {item.ride.origin} → {item.ride.destination}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {activeTab === 'profile' && (
        <section style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>{profile ? 'Profil idarəetməsi' : 'Profil yarat'}</h2>

          <form onSubmit={handleCreateOrUpdateProfile} style={styles.form}>
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Ad soyad</label>
              <input
                value={profileFullName}
                onChange={(e) => setProfileFullName(e.target.value)}
                style={styles.input}
              />
            </div>

            <div style={styles.twoColumnGrid}>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Username</label>
                <input
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Telefon</label>
                <input
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  style={styles.input}
                  required
                />
              </div>
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Bio</label>
              <textarea
                value={profileBio}
                onChange={(e) => setProfileBio(e.target.value)}
                rows={3}
                style={styles.textarea}
              />
            </div>

            {!profile ? (
              <div style={styles.fieldWrap}>
                <label style={styles.label}>İlkin rol</label>
                <select value={initialRole} onChange={(e) => setInitialRole(e.target.value as UserRole)} style={styles.select}>
                  <option value="driver">Sürücü</option>
                  <option value="passenger">Sərnişin</option>
                </select>
              </div>
            ) : (
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Aktiv rol</label>
                <input value={getRoleLabel(profile.role)} readOnly style={styles.input} />
              </div>
            )}

            {(profile ? profile.role === 'driver' : initialRole === 'driver') && (
              <div style={styles.twoColumnGrid}>
                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Avtomobil markası</label>
                  <input
                    value={carBrand}
                    onChange={(e) => setCarBrand(e.target.value)}
                    style={styles.input}
                  />
                </div>

                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Dövlət qeydiyyat nömrəsi</label>
                  <input
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>
            )}

            <div style={styles.actionRow}>
              <button type="submit" disabled={profileSaving} style={styles.primaryButton}>
                {profileSaving ? 'Yadda saxlanılır...' : profile ? 'Profili yenilə' : 'Profili yarat'}
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  )
}