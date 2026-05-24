'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type RideStatus = 'active' | 'full' | 'cancelled' | 'completed'
type UserRole = 'driver' | 'passenger'
type TabType = 'dashboard' | 'create' | 'search' | 'requests' | 'chat' | 'history' | 'profile'
type TestProfileKey = '1' | '2'

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
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  created_at: string
  updated_at: string
}

type Conversation = {
  id: number
  ride_id: string
  request_id: number | null
  driver_user_id: number
  passenger_user_id: number
  status: 'active' | 'closed'
  created_at: string
  updated_at: string
}

type Message = {
  id: number
  conversation_id: number
  sender_id: number
  message_text: string
  is_read: boolean
  created_at: string
}

const TEST_USERS = {
  '1': {
    driverId: 111111001,
    username: 'test_driver_1',
    fullName: 'Test Driver 1',
  },
  '2': {
    driverId: 111111002,
    username: 'test_passenger_2',
    fullName: 'Test Passenger 2',
  },
} as const

const styles = {
  page: {
    maxWidth: 1080,
    margin: '0 auto',
    padding: '20px 16px 48px',
    fontFamily: 'Arial, sans-serif',
    background: '#f8fafc',
    minHeight: '100vh',
    color: '#0f172a',
  } as React.CSSProperties,

  headerCard: {
    background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)',
    border: '1px solid #e2e8f0',
    borderRadius: 20,
    padding: 22,
    marginBottom: 18,
    boxShadow: '0 6px 20px rgba(15, 23, 42, 0.06)',
  } as React.CSSProperties,

  title: {
    margin: 0,
    fontSize: 30,
    fontWeight: 800,
    color: '#0f172a',
  } as React.CSSProperties,

  subtitle: {
    marginTop: 8,
    marginBottom: 0,
    color: '#475569',
    fontSize: 15,
    lineHeight: 1.5,
  } as React.CSSProperties,

  topTabs: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap' as const,
    marginBottom: 18,
  } as React.CSSProperties,

  tabButton: {
    padding: '10px 14px',
    borderRadius: 999,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
  } as React.CSSProperties,

  activeTabButton: {
    padding: '10px 14px',
    borderRadius: 999,
    border: '1px solid #2563eb',
    background: '#2563eb',
    color: '#ffffff',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
  } as React.CSSProperties,

  sectionCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    boxShadow: '0 3px 14px rgba(15, 23, 42, 0.05)',
  } as React.CSSProperties,

  sectionTitle: {
    marginTop: 0,
    marginBottom: 16,
    fontSize: 22,
    fontWeight: 800,
    color: '#0f172a',
  } as React.CSSProperties,

  form: {
    display: 'grid',
    gap: 14,
  } as React.CSSProperties,

  fieldWrap: {
    display: 'grid',
    gap: 6,
  } as React.CSSProperties,

  label: {
    fontSize: 14,
    fontWeight: 700,
    color: '#334155',
  } as React.CSSProperties,

  input: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  select: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  textarea: {
    width: '100%',
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#0f172a',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box' as const,
    resize: 'vertical' as const,
  } as React.CSSProperties,

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
  } as React.CSSProperties,

  secondaryButton: {
    padding: '10px 14px',
    background: '#e2e8f0',
    color: '#0f172a',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
  } as React.CSSProperties,

  ghostButton: {
    padding: '10px 14px',
    background: '#ffffff',
    color: '#0f172a',
    border: '1px solid #cbd5e1',
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
  } as React.CSSProperties,

  successButton: {
    padding: '10px 14px',
    background: '#16a34a',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 800,
  } as React.CSSProperties,

  dangerButton: {
    padding: '10px 14px',
    background: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 800,
  } as React.CSSProperties,

  warningButton: {
    padding: '10px 14px',
    background: '#f59e0b',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 800,
  } as React.CSSProperties,

  closeButton: {
    padding: '10px 14px',
    background: '#7c3aed',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 800,
  } as React.CSSProperties,

  cancelButton: {
    padding: '12px 16px',
    background: '#94a3b8',
    color: '#ffffff',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 800,
  } as React.CSSProperties,

  message: {
    marginTop: 8,
    marginBottom: 18,
    padding: '12px 14px',
    borderRadius: 12,
    background: '#dbeafe',
    color: '#1e3a8a',
    border: '1px solid #bfdbfe',
    fontSize: 14,
  } as React.CSSProperties,

  ridesGrid: {
    display: 'grid',
    gap: 16,
  } as React.CSSProperties,

  statsGrid: {
    display: 'grid',
    gap: 14,
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  } as React.CSSProperties,

  twoColumnGrid: {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  } as React.CSSProperties,

  statsCard: {
    border: '1px solid #dbe3ee',
    borderRadius: 16,
    padding: 16,
    background: '#f8fafc',
  } as React.CSSProperties,

  statLabel: {
    margin: 0,
    fontSize: 13,
    color: '#64748b',
    fontWeight: 700,
  } as React.CSSProperties,

  statValue: {
    margin: '8px 0 0',
    fontSize: 28,
    color: '#0f172a',
    fontWeight: 800,
  } as React.CSSProperties,

  rideCard: {
    border: '1px solid #dbe3ee',
    borderRadius: 16,
    padding: 16,
    background: '#ffffff',
    color: '#0f172a',
    boxShadow: '0 1px 6px rgba(15, 23, 42, 0.04)',
  } as React.CSSProperties,

  myRideCard: {
    border: '1px solid #bfdbfe',
    borderRadius: 16,
    padding: 16,
    background: '#eff6ff',
    color: '#0f172a',
    boxShadow: '0 1px 6px rgba(37, 99, 235, 0.08)',
  } as React.CSSProperties,

  resultCard: {
    border: '1px solid #cbd5e1',
    borderRadius: 16,
    padding: 16,
    background: '#f8fafc',
    color: '#0f172a',
    boxShadow: '0 1px 6px rgba(15, 23, 42, 0.04)',
  } as React.CSSProperties,

  infoRow: {
    margin: '6px 0',
    color: '#1e293b',
    lineHeight: 1.5,
  } as React.CSSProperties,

  mutedText: {
    color: '#64748b',
    fontSize: 14,
    lineHeight: 1.5,
  } as React.CSSProperties,

  chipRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    marginTop: 10,
  } as React.CSSProperties,

  chip: {
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid #cbd5e1',
    background: '#ffffff',
    color: '#334155',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 700,
  } as React.CSSProperties,

  chipActive: {
    padding: '8px 12px',
    borderRadius: 999,
    border: '1px solid #2563eb',
    background: '#dbeafe',
    color: '#1d4ed8',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 800,
  } as React.CSSProperties,

  buttonRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap' as const,
    marginBottom: 4,
  } as React.CSSProperties,

  actionRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap' as const,
    marginTop: 10,
  } as React.CSSProperties,

  badge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 8,
    background: '#e2e8f0',
    color: '#0f172a',
  } as React.CSSProperties,

  pendingBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 8,
    background: '#fef3c7',
    color: '#92400e',
  } as React.CSSProperties,

  approvedBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 8,
    background: '#dcfce7',
    color: '#166534',
  } as React.CSSProperties,

  rejectedBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 8,
    background: '#fee2e2',
    color: '#991b1b',
  } as React.CSSProperties,

  fullBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 8,
    background: '#ede9fe',
    color: '#5b21b6',
  } as React.CSSProperties,

  completedBadge: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    marginBottom: 8,
    background: '#d1fae5',
    color: '#065f46',
  } as React.CSSProperties,

  chatLayout: {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
  } as React.CSSProperties,

  conversationList: {
    display: 'grid',
    gap: 12,
  } as React.CSSProperties,

  conversationCard: {
    border: '1px solid #dbe3ee',
    borderRadius: 14,
    padding: 14,
    background: '#ffffff',
    cursor: 'pointer',
  } as React.CSSProperties,

  conversationCardActive: {
    border: '1px solid #2563eb',
    borderRadius: 14,
    padding: 14,
    background: '#eff6ff',
    cursor: 'pointer',
  } as React.CSSProperties,

  chatPanel: {
    border: '1px solid #dbe3ee',
    borderRadius: 16,
    background: '#ffffff',
    padding: 16,
  } as React.CSSProperties,

  messageList: {
    display: 'grid',
    gap: 10,
    maxHeight: 420,
    overflowY: 'auto' as const,
    paddingBottom: 8,
    marginBottom: 14,
  } as React.CSSProperties,

  myMessage: {
    justifySelf: 'end',
    maxWidth: '80%',
    background: '#2563eb',
    color: '#ffffff',
    padding: '10px 12px',
    borderRadius: 14,
  } as React.CSSProperties,

  otherMessage: {
    justifySelf: 'start',
    maxWidth: '80%',
    background: '#e2e8f0',
    color: '#0f172a',
    padding: '10px 12px',
    borderRadius: 14,
  } as React.CSSProperties,
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

function getRequestStatusLabel(status: RideRequest['status']) {
  if (status === 'accepted') return 'Qəbul edildi'
  if (status === 'rejected') return 'Rədd edildi'
  if (status === 'cancelled') return 'Ləğv edildi'
  return 'Gözləmədə'
}

function getRideStatusLabel(status: RideStatus) {
  if (status === 'full') return 'Doldu / Bağlandı'
  if (status === 'cancelled') return 'Ləğv edildi'
  if (status === 'completed') return 'Tamamlandı'
  return 'Aktiv'
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')

  const [useLocalTestMode, setUseLocalTestMode] = useState(true)
  const [activeTestProfile, setActiveTestProfile] = useState<TestProfileKey>('1')

  const [rides, setRides] = useState<Ride[]>([])
  const [allMyRides, setAllMyRides] = useState<Ride[]>([])
  const [myRides, setMyRides] = useState<Ride[]>([])
  const [historyRides, setHistoryRides] = useState<Ride[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null)

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

  function getActiveUser() {
    if (useLocalTestMode) {
      return TEST_USERS[activeTestProfile]
    }

    const tgUser = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user
    const driverId = tgUser?.id ?? 123456789
    const username = tgUser?.username ?? `user_${driverId}`
    const fullName = tgUser?.first_name ?? 'Telegram User'
    return { driverId, username, fullName }
  }

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

  function getRequestBadgeStyle(status: RideRequest['status']) {
    if (status === 'accepted') return styles.approvedBadge
    if (status === 'rejected') return styles.rejectedBadge
    return styles.pendingBadge
  }

  function getRideBadgeStyle(status: RideStatus) {
    if (status === 'full') return styles.fullBadge
    if (status === 'completed') return styles.completedBadge
    if (status === 'cancelled') return styles.rejectedBadge
    return styles.approvedBadge
  }

  useEffect(() => {
    initializeData()
  }, [useLocalTestMode, activeTestProfile])

  useEffect(() => {
    const activeUserId = getActiveUser().driverId

    const messageChannel = supabase
      .channel(`messages-live-${activeUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, async () => {
        if (selectedConversationId) {
          await getMessages(selectedConversationId)
        }
        await getConversations()
      })
      .subscribe()

    const requestChannel = supabase
      .channel(`ride-requests-live-${activeUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_requests' }, async () => {
        await getRideRequests()
        await getAllMyRides()
      })
      .subscribe()

    const conversationChannel = supabase
      .channel(`conversations-live-${activeUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, async () => {
        await getConversations()
      })
      .subscribe()

    const rideChannel = supabase
      .channel(`ride-listings-live-${activeUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ride_listings' }, async () => {
        await getRides()
        await getAllMyRides()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(messageChannel)
      void supabase.removeChannel(requestChannel)
      void supabase.removeChannel(conversationChannel)
      void supabase.removeChannel(rideChannel)
    }
  }, [selectedConversationId, useLocalTestMode, activeTestProfile])

  async function initializeData() {
    setMessage('')
    setSelectedConversationId(null)
    await Promise.all([
      ensureLocalTestUserRecords(),
      getProfile(),
      getRides(),
      getAllMyRides(),
      getRideRequests(),
      getConversations(),
    ])
  }

  async function ensureLocalTestUserRecords() {
    const current = getActiveUser()

    await supabase.from('users').upsert({
      id: current.driverId,
      username: current.username,
      full_name: current.fullName,
    })

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', current.driverId)
      .maybeSingle()

    if (!data && useLocalTestMode) {
      const defaultRole: UserRole = activeTestProfile === '1' ? 'driver' : 'passenger'
      await supabase.from('profiles').insert({
        id: current.driverId,
        full_name: current.fullName,
        username: current.username,
        phone: activeTestProfile === '1' ? '+994501111111' : '+994502222222',
        bio: activeTestProfile === '1' ? 'Driver test profile' : 'Passenger test profile',
        role: defaultRole,
        car_brand: defaultRole === 'driver' ? 'Kia Rio' : null,
        license_plate: defaultRole === 'driver' ? '10-TR-101' : null,
      })
    }
  }

  async function getProfile() {
    const current = getActiveUser()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', current.driverId)
      .maybeSingle()

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

    const { data, error } = await supabase
      .from('ride_requests')
      .select('*')
      .or(`requester_id.eq.${current.driverId},owner_id.eq.${current.driverId}`)
      .order('id', { ascending: false })

    if (error) {
      console.error('Ride requests error:', JSON.stringify(error, null, 2))
    } else {
      setRideRequests((data as RideRequest[]) || [])
    }
  }

  async function getConversations() {
    const current = getActiveUser()

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
    setConversations(rows)

    if (rows.length > 0) {
      const targetId =
        selectedConversationId && rows.some((x) => x.id === selectedConversationId)
          ? selectedConversationId
          : rows[0].id

      setSelectedConversationId(targetId)
      await getMessages(targetId)
    } else {
      setSelectedConversationId(null)
      setMessages([])
    }
  }

  async function getMessages(conversationId: number) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Messages error:', JSON.stringify(error, null, 2))
    } else {
      setMessages((data as Message[]) || [])
    }
  }

  async function handleCreateOrUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileSaving(true)
    setMessage('')

    const current = getActiveUser()

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
      full_name: profileFullName,
      username: profileUsername,
      phone: profilePhone,
      bio: profileBio,
      role: effectiveRole,
      car_brand: effectiveRole === 'driver' ? carBrand : null,
      license_plate: effectiveRole === 'driver' ? licensePlate : null,
      updated_at: new Date().toISOString(),
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
    setSubmitting(true)
    setMessage('')

    const current = getActiveUser()

    await supabase.from('users').upsert({
      id: current.driverId,
      username: current.username,
      full_name: current.fullName,
    })

    if (!profile) {
      setMessage('Əvvəl profil yaratmaq lazımdır.')
      setSubmitting(false)
      return
    }

    const duplicateActiveRide = myRides.find((ride) => {
      if (editingRideId && ride.id === editingRideId) return false

      return (
        normalizeText(ride.origin) === normalizeText(origin) &&
        normalizeText(ride.destination) === normalizeText(destination) &&
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
          origin,
          destination,
          ride_date: rideDate,
          departure_time: departureTime,
          seats: Number(seats),
          price_per_seat: Number(pricePerSeat),
          notes,
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
      const { error } = await supabase
        .from('ride_listings')
        .insert({
          driver_id: current.driverId,
          role: profile.role,
          origin,
          destination,
          ride_date: rideDate,
          departure_time: departureTime,
          seats: Number(seats),
          price_per_seat: Number(pricePerSeat),
          is_recurring: false,
          women_only: false,
          notes,
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
      console.error('Delete ride error:', JSON.stringify(error, null, 2))
      setMessage('Elan ləğv edilmədi.')
    } else {
      setMessage('Elan ləğv edildi.')
      if (editingRideId === rideId) resetRideForm()
      await initializeData()
    }

    setRideActionLoading(null)
  }

  async function handleCloseRide(rideId: string) {
    const confirmed = window.confirm('Bu elanı bağlamaq istəyirsən? Sonra axtarışda görünməyəcək.')
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
      console.error('Close ride error:', JSON.stringify(error, null, 2))
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
      console.error('Complete ride error:', JSON.stringify(error, null, 2))
      setMessage('Elan tamamlanmış kimi işarələnmədi.')
    } else {
      setMessage('Elan tamamlandı.')
      await initializeData()
    }

    setRideActionLoading(null)
  }

  async function handleCreateRideRequest(ride: Ride) {
    const current = getActiveUser()

    if (!profile) {
      setMessage('Əvvəl profil yaratmaq lazımdır.')
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

    const requestedSeats = Number(requestSeatsMap[ride.id] || '1')

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
      setMessage('Bu elana artıq müraciət göndərmisən.')
      return
    }

    setRideRequestLoading(ride.id)

    const requestMessage = requestMessageMap[ride.id] || ''
    const requesterRole = profile.role
    const ownerRole = ride.role === 'driver' ? 'driver' : 'passenger'

    const { error } = await supabase
      .from('ride_requests')
      .insert({
        ride_id: ride.id,
        requester_id: current.driverId,
        owner_id: ride.driver_id,
        requester_role: requesterRole,
        owner_role: ownerRole,
        message_text: requestMessage,
        seats_requested: requestedSeats > 0 ? requestedSeats : 1,
        status: 'pending',
      })

    if (error) {
      console.error('Ride request insert error:', JSON.stringify(error, null, 2))
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

  async function handleRideRequestDecision(request: RideRequest, decision: 'accepted' | 'rejected') {
    setRideRequestLoading(request.id)

    const currentRide = allMyRides.find((ride) => ride.id === request.ride_id)

    if (decision === 'accepted') {
      if (!currentRide) {
        setMessage('Elan tapılmadı.')
        setRideRequestLoading(null)
        return
      }

      if (currentRide.status !== 'active') {
        setMessage('Bu elan artıq aktiv deyil.')
        setRideRequestLoading(null)
        return
      }

      if (request.seats_requested > currentRide.seats) {
        setMessage(`Bu müraciət üçün kifayət qədər yer yoxdur. Qalan yer: ${currentRide.seats}`)
        setRideRequestLoading(null)
        return
      }
    }

    const { error } = await supabase
      .from('ride_requests')
      .update({
        status: decision,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.id)

    if (error) {
      console.error('Ride request decision error:', JSON.stringify(error, null, 2))
      setMessage('Müraciət statusu yenilənmədi.')
      setRideRequestLoading(null)
      return
    }

    if (decision === 'accepted') {
      const currentRide = allMyRides.find((ride) => ride.id === request.ride_id)

      if (!currentRide) {
        setMessage('Elan tapılmadı.')
        setRideRequestLoading(null)
        return
      }

      const remainingSeats = Math.max(0, currentRide.seats - request.seats_requested)
      const nextStatus: RideStatus = remainingSeats <= 0 ? 'full' : 'active'

      const { error: rideError } = await supabase
        .from('ride_listings')
        .update({
          seats: remainingSeats,
          status: nextStatus,
          closed_reason: nextStatus === 'full' ? 'matched' : currentRide.closed_reason || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', request.ride_id)

      if (rideError) {
        console.error('Ride seat update error:', JSON.stringify(rideError, null, 2))
        setMessage('Yer sayı yenilənmədi.')
        setRideRequestLoading(null)
        return
      }

      const driverUserId = request.owner_role === 'driver' ? request.owner_id : request.requester_id
      const passengerUserId = request.owner_role === 'passenger' ? request.owner_id : request.requester_id

      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('*')
        .eq('request_id', request.id)
        .maybeSingle()

      if (!existingConversation) {
        const { error: conversationError } = await supabase
          .from('conversations')
          .insert({
            ride_id: request.ride_id,
            request_id: request.id,
            driver_user_id: driverUserId,
            passenger_user_id: passengerUserId,
            status: 'active',
            updated_at: new Date().toISOString(),
          })

        if (conversationError) {
          console.error('Conversation create error:', JSON.stringify(conversationError, null, 2))
          setMessage('Chat açıla bilmədi.')
          setRideRequestLoading(null)
          return
        }
      }

      setMessage(
        remainingSeats <= 0
          ? 'Müraciət qəbul edildi, yer qalmadı və elan bağlandı.'
          : `Müraciət qəbul edildi. Qalan yer: ${remainingSeats}`
      )

      await Promise.all([getRideRequests(), getConversations(), getRides(), getAllMyRides()])
      setActiveTab('chat')
    } else {
      setMessage('Müraciət rədd edildi.')
      await getRideRequests()
    }

    setRideRequestLoading(null)
  }

  async function handleOpenConversation(conversationId: number) {
    setSelectedConversationId(conversationId)
    await getMessages(conversationId)
    setActiveTab('chat')
  }

  async function handleSendMessage() {
    const current = getActiveUser()

    if (!selectedConversationId) {
      setMessage('Əvvəl chat seç.')
      return
    }

    if (!chatInput.trim()) {
      return
    }

    setMessageSending(true)

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: selectedConversationId,
        sender_id: current.driverId,
        message_text: chatInput.trim(),
        is_read: false,
      })

    if (error) {
      console.error('Message send error:', JSON.stringify(error, null, 2))
      setMessage('Mesaj göndərilmədi.')
    } else {
      setChatInput('')
      await getMessages(selectedConversationId)
      await supabase
        .from('conversations')
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedConversationId)
    }

    setMessageSending(false)
  }

  const filteredRides = useMemo(() => {
    const current = getActiveUser()
    const text = searchText.toLowerCase().trim()

    return rides.filter((ride) => {
      const rideOrigin = (ride.origin || '').toLowerCase()
      const rideDestination = (ride.destination || '').toLowerCase()
      const rideNotes = (ride.notes || '').toLowerCase()

      const matchesText =
        !text ||
        rideOrigin.includes(text) ||
        rideDestination.includes(text) ||
        rideNotes.includes(text)

      const matchesRole =
        filterRole === 'all' || (ride.role || 'driver') === filterRole

      const matchesDate =
        !filterDate || (ride.ride_date || '') === filterDate

      const notMine = ride.driver_id !== current.driverId

      return matchesText && matchesRole && matchesDate && notMine && ride.status === 'active'
    })
  }, [rides, searchText, filterRole, filterDate, useLocalTestMode, activeTestProfile])

  const incomingRideRequests = useMemo(() => {
    const current = getActiveUser()
    return rideRequests.filter((item) => item.owner_id === current.driverId)
  }, [rideRequests, useLocalTestMode, activeTestProfile])

  const outgoingRideRequests = useMemo(() => {
    const current = getActiveUser()
    return rideRequests.filter((item) => item.requester_id === current.driverId)
  }, [rideRequests, useLocalTestMode, activeTestProfile])

  const selectedConversation = conversations.find((item) => item.id === selectedConversationId) || null

  const currentMessages = useMemo(() => {
    if (!selectedConversationId) return []
    return messages.filter((item) => item.conversation_id === selectedConversationId)
  }, [messages, selectedConversationId])

  const currentUser = getActiveUser()

  return (
    <main style={styles.page}>
      <div style={styles.headerCard}>
        <h1 style={styles.title}>Yolüstü</h1>
        <p style={styles.subtitle}>
          Local test mode, request qəbulunda yer azalması, elan bağlama və tamamlanma məntiqi ilə yenilənmiş versiya.
        </p>
      </div>

      <section style={styles.sectionCard}>
        <h2 style={styles.sectionTitle}>Local test rejimi</h2>

        <div style={styles.chipRow}>
          <button
            type="button"
            onClick={() => setUseLocalTestMode(true)}
            style={useLocalTestMode ? styles.chipActive : styles.chip}
          >
            Local test ON
          </button>

          <button
            type="button"
            onClick={() => setUseLocalTestMode(false)}
            style={!useLocalTestMode ? styles.chipActive : styles.chip}
          >
            Telegram user
          </button>
        </div>

        {useLocalTestMode && (
          <div style={styles.chipRow}>
            <button
              type="button"
              onClick={() => setActiveTestProfile('1')}
              style={activeTestProfile === '1' ? styles.chipActive : styles.chip}
            >
              Profil 1
            </button>

            <button
              type="button"
              onClick={() => setActiveTestProfile('2')}
              style={activeTestProfile === '2' ? styles.chipActive : styles.chip}
            >
              Profil 2
            </button>
          </div>
        )}

        <p style={styles.infoRow}>
          <strong>Aktiv user:</strong> {currentUser.fullName} ({currentUser.driverId})
        </p>
      </section>

      <div style={styles.topTabs}>
        {[
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'create', label: 'Elan ver' },
          { key: 'search', label: 'Axtarış' },
          { key: 'requests', label: `Müraciətlər (${incomingRideRequests.filter((x) => x.status === 'pending').length})` },
          { key: 'chat', label: `Chat (${conversations.length})` },
          { key: 'history', label: 'Tarixçə' },
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
                <p style={styles.statLabel}>Chat-lər</p>
                <p style={styles.statValue}>{conversations.length}</p>
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
                      <button type="button" onClick={() => handleEditRide(ride)} style={styles.warningButton}>
                        Redaktə et
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCloseRide(ride.id)}
                        style={styles.closeButton}
                        disabled={rideActionLoading === ride.id}
                      >
                        Elanı bağla
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCompleteRide(ride.id)}
                        style={styles.successButton}
                        disabled={rideActionLoading === ride.id}
                      >
                        Tamamlandı
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRide(ride.id)}
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
          <h2 style={styles.sectionTitle}>
            {editingRideId ? 'Elanı redaktə et' : 'Yeni elan yarat'}
          </h2>

          {!profile ? (
            <p style={styles.mutedText}>Əvvəl profil yaratmaq lazımdır.</p>
          ) : (
            <form onSubmit={handleSubmitRide} style={styles.form}>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Aktiv rol</label>
                <input value={getRoleLabel(profile.role)} readOnly style={styles.input} />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Haradan</label>
                <input value={origin} onChange={(e) => setOrigin(e.target.value)} required style={styles.input} />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Hara</label>
                <input value={destination} onChange={(e) => setDestination(e.target.value)} required style={styles.input} />
              </div>

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
                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Yer sayı / nəfər sayı</label>
                  <input type="number" min="1" value={seats} onChange={(e) => setSeats(e.target.value)} required style={styles.input} />
                </div>

                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Qiymət</label>
                  <input type="number" step="0.1" min="0" value={pricePerSeat} onChange={(e) => setPricePerSeat(e.target.value)} required style={styles.input} />
                </div>
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Qeyd</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={styles.textarea} />
              </div>

              <div style={styles.buttonRow}>
                <button type="submit" disabled={submitting} style={styles.primaryButton}>
                  {submitting ? 'Göndərilir...' : editingRideId ? 'Yenilə' : 'Elanı əlavə et'}
                </button>

                <button type="button" onClick={resetRideForm} style={styles.cancelButton}>
                  Formu təmizlə
                </button>
              </div>
            </form>
          )}
        </section>
      )}

      {activeTab === 'search' && (
        <>
          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Axtarış</h2>

            <div style={styles.form}>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Axtarış</label>
                <input
                  placeholder="Haradan, hara və ya qeyd üzrə axtar"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  style={styles.input}
                />
              </div>

              <div style={styles.twoColumnGrid}>
                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Rol filteri</label>
                  <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} style={styles.select}>
                    <option value="all">Hamısı</option>
                    <option value="driver">Sürücü elanları</option>
                    <option value="passenger">Sərnişin elanları</option>
                  </select>
                </div>

                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Tarix filteri</label>
                  <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={styles.input} />
                </div>
              </div>

              <div style={styles.buttonRow}>
                <button
                  type="button"
                  onClick={() => {
                    setSearchText('')
                    setFilterRole('all')
                    setFilterDate('')
                  }}
                  style={styles.secondaryButton}
                >
                  Filteri sıfırla
                </button>

                <button type="button" onClick={initializeData} style={styles.ghostButton}>
                  Yenilə
                </button>
              </div>
            </div>
          </section>

          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Aktiv elanlar</h2>

            {loading ? (
              <p style={styles.mutedText}>Yüklənir...</p>
            ) : filteredRides.length === 0 ? (
              <p style={styles.mutedText}>Uyğun aktiv elan tapılmadı.</p>
            ) : (
              <div style={styles.ridesGrid}>
                {filteredRides.map((ride) => (
                  <div key={ride.id} style={styles.resultCard}>
                    <div style={styles.approvedBadge}>Aktiv</div>
                    <p style={styles.infoRow}><strong>Rol:</strong> {getRoleLabel(ride.role)}</p>
                    <p style={styles.infoRow}><strong>Haradan:</strong> {ride.origin}</p>
                    <p style={styles.infoRow}><strong>Hara:</strong> {ride.destination}</p>
                    <p style={styles.infoRow}><strong>Tarix:</strong> {ride.ride_date || '-'}</p>
                    <p style={styles.infoRow}><strong>Saat:</strong> {ride.departure_time}</p>
                    <p style={styles.infoRow}><strong>Qalan yer:</strong> {ride.seats}</p>
                    <p style={styles.infoRow}><strong>Qiymət:</strong> {ride.price_per_seat} AZN</p>
                    {ride.notes && <p style={styles.infoRow}><strong>Qeyd:</strong> {ride.notes}</p>}

                    <div style={styles.fieldWrap}>
                      <label style={styles.label}>Müraciət mesajı</label>
                      <textarea
                        rows={2}
                        value={requestMessageMap[ride.id] || ''}
                        onChange={(e) =>
                          setRequestMessageMap((prev) => ({
                            ...prev,
                            [ride.id]: e.target.value,
                          }))
                        }
                        style={styles.textarea}
                        placeholder="Qısa mesaj yaz"
                      />
                    </div>

                    <div style={styles.fieldWrap}>
                      <label style={styles.label}>Neçə yer / nəfər</label>
                      <input
                        type="number"
                        min="1"
                        max={ride.seats}
                        value={requestSeatsMap[ride.id] || '1'}
                        onChange={(e) =>
                          setRequestSeatsMap((prev) => ({
                            ...prev,
                            [ride.id]: e.target.value,
                          }))
                        }
                        style={styles.input}
                      />
                    </div>

                    <div style={styles.actionRow}>
                      <button
                        type="button"
                        onClick={() => handleCreateRideRequest(ride)}
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
        </>
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
                  const ride = allMyRides.find((r) => r.id === item.ride_id)

                  return (
                    <div key={item.id} style={styles.resultCard}>
                      <div style={getRequestBadgeStyle(item.status)}>{getRequestStatusLabel(item.status)}</div>
                      <p style={styles.infoRow}><strong>Göndərən ID:</strong> {item.requester_id}</p>
                      <p style={styles.infoRow}><strong>Rol:</strong> {getRoleLabel(item.requester_role)}</p>
                      <p style={styles.infoRow}><strong>İstənən yer sayı:</strong> {item.seats_requested}</p>
                      <p style={styles.infoRow}><strong>Mesaj:</strong> {item.message_text || '-'}</p>

                      {ride && (
                        <>
                          <p style={styles.infoRow}><strong>Elan:</strong> {ride.origin} → {ride.destination}</p>
                          <p style={styles.infoRow}><strong>Tarix/Saat:</strong> {ride.ride_date || '-'} / {ride.departure_time}</p>
                          <p style={styles.infoRow}><strong>Qalan yer:</strong> {ride.seats}</p>
                          <p style={styles.infoRow}><strong>Elan statusu:</strong> {getRideStatusLabel(ride.status)}</p>
                        </>
                      )}

                      <p style={styles.infoRow}><strong>Tarix:</strong> {formatDateTime(item.created_at)}</p>

                      {item.status === 'pending' && ride?.status === 'active' && (
                        <div style={styles.actionRow}>
                          <button
                            type="button"
                            style={styles.successButton}
                            disabled={rideRequestLoading === item.id}
                            onClick={() => handleRideRequestDecision(item, 'accepted')}
                          >
                            Qəbul et
                          </button>

                          <button
                            type="button"
                            style={styles.dangerButton}
                            disabled={rideRequestLoading === item.id}
                            onClick={() => handleRideRequestDecision(item, 'rejected')}
                          >
                            Rədd et
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
                    <p style={styles.infoRow}><strong>Sahib ID:</strong> {item.owner_id}</p>
                    <p style={styles.infoRow}><strong>Rol:</strong> {getRoleLabel(item.owner_role)}</p>
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
                    const ride = allMyRides.find((r) => r.id === conv.ride_id) || rides.find((r) => r.id === conv.ride_id)

                    return (
                      <div
                        key={conv.id}
                        style={selectedConversationId === conv.id ? styles.conversationCardActive : styles.conversationCard}
                        onClick={() => handleOpenConversation(conv.id)}
                      >
                        <div style={styles.badge}>Chat #{conv.id}</div>
                        <p style={styles.infoRow}><strong>Marşrut:</strong> {ride ? `${ride.origin} → ${ride.destination}` : conv.ride_id}</p>
                        <p style={styles.infoRow}><strong>Status:</strong> {conv.status}</p>
                        <p style={styles.infoRow}><strong>Yeniləndi:</strong> {formatDateTime(conv.updated_at)}</p>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            <div style={styles.chatPanel}>
              {!selectedConversation ? (
                <p style={styles.mutedText}>Conversation seç.</p>
              ) : (
                <>
                  <div style={styles.resultCard}>
                    <p style={styles.infoRow}><strong>Conversation ID:</strong> {selectedConversation.id}</p>
                    <p style={styles.infoRow}><strong>Ride ID:</strong> {selectedConversation.ride_id}</p>
                    <p style={styles.infoRow}><strong>Status:</strong> {selectedConversation.status}</p>
                  </div>

                  <div style={{ height: 12 }} />

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
                      onClick={handleSendMessage}
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

      {activeTab === 'profile' && (
        <section style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>{profile ? 'Profil idarəetməsi' : 'Profil yarat'}</h2>

          <form onSubmit={handleCreateOrUpdateProfile} style={styles.form}>
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
                <input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} style={styles.input} required />
              </div>
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Bio</label>
              <textarea value={profileBio} onChange={(e) => setProfileBio(e.target.value)} rows={3} style={styles.textarea} />
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
                  <input value={carBrand} onChange={(e) => setCarBrand(e.target.value)} style={styles.input} />
                </div>

                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Dövlət qeydiyyat nömrəsi</label>
                  <input value={licensePlate} onChange={(e) => setLicensePlate(e.target.value)} style={styles.input} />
                </div>
              </div>
            )}

            <div style={styles.buttonRow}>
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