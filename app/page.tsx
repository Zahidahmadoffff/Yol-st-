'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Ride = {
  id: number
  driver_id: number
  origin: string
  destination: string
  ride_date: string | null
  departure_time: string
  seats: number
  price_per_seat: number
  notes: string | null
  status: string
  role: string | null
}

type Profile = {
  id: number
  full_name: string | null
  username: string | null
  phone: string | null
  bio: string | null
  preferred_role: string | null
  car_brand: string | null
  license_plate: string | null
}

type TabType =
  | 'dashboard'
  | 'create'
  | 'search'
  | 'history'
  | 'profile'

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready: () => void
        expand: () => void
        initDataUnsafe?: {
          user?: {
            id?: number
            first_name?: string
            username?: string
          }
        }
      }
    }
  }
}

const styles = {
  page: {
    maxWidth: 980,
    margin: '0 auto',
    padding: '20px 16px 40px',
    fontFamily: 'Arial, sans-serif',
    background: '#f8fafc',
    minHeight: '100vh',
    color: '#0f172a',
  } as React.CSSProperties,

  headerCard: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)',
  } as React.CSSProperties,

  title: {
    margin: 0,
    fontSize: 30,
    fontWeight: 700,
    color: '#0f172a',
  } as React.CSSProperties,

  subtitle: {
    marginTop: 8,
    marginBottom: 0,
    color: '#475569',
    fontSize: 15,
  } as React.CSSProperties,

  topTabs: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap' as const,
    marginBottom: 20,
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
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0 2px 10px rgba(15, 23, 42, 0.05)',
  } as React.CSSProperties,

  sectionTitle: {
    marginTop: 0,
    marginBottom: 16,
    fontSize: 22,
    fontWeight: 700,
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
    fontWeight: 600,
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
    fontWeight: 700,
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
    fontWeight: 600,
  } as React.CSSProperties,

  warningButton: {
    marginTop: 12,
    marginRight: 10,
    padding: '10px 14px',
    background: '#f59e0b',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
  } as React.CSSProperties,

  dangerButton: {
    marginTop: 12,
    padding: '10px 14px',
    background: '#dc2626',
    color: '#ffffff',
    border: 'none',
    borderRadius: 10,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 700,
  } as React.CSSProperties,

  cancelButton: {
    padding: '12px 16px',
    background: '#94a3b8',
    color: '#ffffff',
    border: 'none',
    borderRadius: 12,
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 700,
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

  threeColumnGrid: {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  } as React.CSSProperties,

  twoColumnGrid: {
    display: 'grid',
    gap: 16,
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  } as React.CSSProperties,

  statsCard: {
    border: '1px solid #dbe3ee',
    borderRadius: 14,
    padding: 16,
    background: '#f8fafc',
  } as React.CSSProperties,

  rideCard: {
    border: '1px solid #dbe3ee',
    borderRadius: 14,
    padding: 16,
    background: '#ffffff',
    color: '#0f172a',
    boxShadow: '0 1px 6px rgba(15, 23, 42, 0.04)',
  } as React.CSSProperties,

  myRideCard: {
    border: '1px solid #bfdbfe',
    borderRadius: 14,
    padding: 16,
    background: '#eff6ff',
    color: '#0f172a',
    boxShadow: '0 1px 6px rgba(37, 99, 235, 0.08)',
  } as React.CSSProperties,

  matchedCard: {
    border: '1px solid #bbf7d0',
    borderRadius: 14,
    padding: 16,
    background: '#f0fdf4',
    color: '#0f172a',
    boxShadow: '0 1px 6px rgba(34, 197, 94, 0.08)',
  } as React.CSSProperties,

  resultCard: {
    border: '1px solid #cbd5e1',
    borderRadius: 14,
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
  } as React.CSSProperties,

  warningText: {
    color: '#b45309',
    fontSize: 14,
  } as React.CSSProperties,

  quickRow: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 8,
    marginTop: 8,
  } as React.CSSProperties,

  buttonRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap' as const,
    marginBottom: 20,
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
    fontWeight: 700,
    marginBottom: 8,
    background: '#e2e8f0',
    color: '#0f172a',
  } as React.CSSProperties,
}

function formatDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTime(date: Date) {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

function addDays(base: Date, days: number) {
  const date = new Date(base)
  date.setDate(date.getDate() + days)
  return date
}

function addMinutes(base: Date, minutes: number) {
  const date = new Date(base)
  date.setMinutes(date.getMinutes() + minutes)
  return date
}

function normalizeText(value: string | null | undefined) {
  return (value || '').toLowerCase().trim()
}

function timeToMinutes(value: string | null | undefined) {
  if (!value || !value.includes(':')) return null
  const [h, m] = value.split(':').map(Number)
  if (Number.isNaN(h) || Number.isNaN(m)) return null
  return h * 60 + m
}

function isRouteCompatible(a: Ride, b: Ride) {
  const aOrigin = normalizeText(a.origin)
  const aDestination = normalizeText(a.destination)
  const bOrigin = normalizeText(b.origin)
  const bDestination = normalizeText(b.destination)

  const originMatch =
    aOrigin.includes(bOrigin) ||
    bOrigin.includes(aOrigin) ||
    aOrigin === bOrigin

  const destinationMatch =
    aDestination.includes(bDestination) ||
    bDestination.includes(aDestination) ||
    aDestination === bDestination

  return originMatch && destinationMatch
}

function isTimeClose(a: Ride, b: Ride, maxMinutes = 120) {
  const timeA = timeToMinutes(a.departure_time)
  const timeB = timeToMinutes(b.departure_time)
  if (timeA === null || timeB === null) return false
  return Math.abs(timeA - timeB) <= maxMinutes
}

function getRoleLabel(role: string | null) {
  return role === 'passenger' ? 'Sərnişin' : 'Sürücü'
}

function isPastDate(dateStr: string) {
  if (!dateStr) return false
  const selected = new Date(`${dateStr}T00:00:00`)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return selected < today
}

function isPastTimeToday(dateStr: string, timeStr: string) {
  if (!dateStr || !timeStr) return false
  const now = new Date()
  const todayStr = formatDate(now)
  if (dateStr !== todayStr) return false

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const selectedMinutes = timeToMinutes(timeStr)
  if (selectedMinutes === null) return false

  return selectedMinutes < currentMinutes
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard')

  const [rides, setRides] = useState<Ride[]>([])
  const [myRides, setMyRides] = useState<Ride[]>([])
  const [historyRides, setHistoryRides] = useState<Ride[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [editingRideId, setEditingRideId] = useState<number | null>(null)

  const [role, setRole] = useState('driver')
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
  const [preferredRole, setPreferredRole] = useState('driver')
  const [carBrand, setCarBrand] = useState('')
  const [licensePlate, setLicensePlate] = useState('')

  const [searchText, setSearchText] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterDate, setFilterDate] = useState('')

  const showPastDateWarning = isPastDate(rideDate)
  const showPastTimeWarning = isPastTimeToday(rideDate, departureTime)

  function getTelegramUser() {
    const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
    const driverId = tgUser?.id ?? 123456789
    const username = tgUser?.username ?? `user_${driverId}`
    const fullName = tgUser?.first_name ?? 'Telegram User'
    return { driverId, username, fullName }
  }

  function resetForm() {
    setEditingRideId(null)
    setRole(preferredRole || 'driver')
    setOrigin('')
    setDestination('')
    setRideDate('')
    setDepartureTime('')
    setSeats('1')
    setPricePerSeat('')
    setNotes('')
  }

  function applyQuickDate(type: 'today' | 'tomorrow' | 'dayAfter') {
    const now = new Date()
    if (type === 'today') setRideDate(formatDate(now))
    if (type === 'tomorrow') setRideDate(formatDate(addDays(now, 1)))
    if (type === 'dayAfter') setRideDate(formatDate(addDays(now, 2)))
  }

  function applyQuickTime(type: 'now' | 'plus30' | 'plus60' | 'evening') {
    const now = new Date()

    if (type === 'now') {
      setRideDate(formatDate(now))
      setDepartureTime(formatTime(now))
    }

    if (type === 'plus30') {
      const d = addMinutes(now, 30)
      setRideDate(formatDate(d))
      setDepartureTime(formatTime(d))
    }

    if (type === 'plus60') {
      const d = addMinutes(now, 60)
      setRideDate(formatDate(d))
      setDepartureTime(formatTime(d))
    }

    if (type === 'evening') {
      setRideDate(formatDate(now))
      setDepartureTime('18:00')
    }
  }

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready()
      window.Telegram.WebApp.expand()
    }

    initializeData()
  }, [])

  async function initializeData() {
    await Promise.all([
      getRides(),
      getMyRides(),
      getHistoryRides(),
      getProfile(),
    ])
  }

  async function getRides() {
    setLoading(true)

    const { data, error } = await supabase
      .from('ride_listings')
      .select('*')
      .eq('status', 'active')
      .order('id', { ascending: false })

    if (error) {
      console.error('Ride list error:', JSON.stringify(error, null, 2))
      setMessage('Elanlar yüklənmədi.')
    } else {
      setRides((data as Ride[]) || [])
    }

    setLoading(false)
  }

  async function getMyRides() {
    const { driverId } = getTelegramUser()

    const { data, error } = await supabase
      .from('ride_listings')
      .select('*')
      .eq('driver_id', driverId)
      .eq('status', 'active')
      .order('id', { ascending: false })

    if (error) {
      console.error('My rides error:', JSON.stringify(error, null, 2))
    } else {
      setMyRides((data as Ride[]) || [])
    }
  }

  async function getHistoryRides() {
    const { driverId } = getTelegramUser()

    const { data, error } = await supabase
      .from('ride_listings')
      .select('*')
      .eq('driver_id', driverId)
      .neq('status', 'active')
      .order('id', { ascending: false })

    if (error) {
      console.error('History error:', JSON.stringify(error, null, 2))
    } else {
      setHistoryRides((data as Ride[]) || [])
    }
  }

  async function getProfile() {
    const { driverId, username, fullName } = getTelegramUser()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', driverId)
      .maybeSingle()

    if (error) {
      console.error('Profile read error:', JSON.stringify(error, null, 2))
      return
    }

    if (data) {
      const p = data as Profile
      setProfile(p)
      setProfileFullName(p.full_name || fullName)
      setProfileUsername(p.username || username)
      setProfilePhone(p.phone || '')
      setProfileBio(p.bio || '')
      setPreferredRole(p.preferred_role || 'driver')
      setCarBrand(p.car_brand || '')
      setLicensePlate(p.license_plate || '')
      setRole(p.preferred_role || 'driver')
    } else {
      setProfile(null)
      setProfileFullName(fullName)
      setProfileUsername(username)
      setProfilePhone('')
      setProfileBio('')
      setPreferredRole('driver')
      setCarBrand('')
      setLicensePlate('')
      setRole('driver')
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault()
    setProfileSaving(true)
    setMessage('')

    if (preferredRole === 'driver' && (!carBrand.trim() || !licensePlate.trim())) {
      setMessage('Sürücü profili üçün avtomobil markası və dövlət qeydiyyat nömrəsi məcburidir.')
      setProfileSaving(false)
      return
    }

    const { driverId } = getTelegramUser()

    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: driverId,
        full_name: profileFullName,
        username: profileUsername,
        phone: profilePhone,
        bio: profileBio,
        preferred_role: preferredRole,
        car_brand: preferredRole === 'driver' ? carBrand : null,
        license_plate: preferredRole === 'driver' ? licensePlate : null,
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error('Profile save error:', JSON.stringify(error, null, 2))
      setMessage('Profil yadda saxlanmadı.')
    } else {
      setMessage('Profil uğurla yadda saxlanıldı.')
      await getProfile()
    }

    setProfileSaving(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')

    const { driverId, username, fullName } = getTelegramUser()

    const { error: userError } = await supabase
      .from('users')
      .upsert({
        id: driverId,
        username,
        full_name: fullName,
      })

    if (userError) {
      console.error('User upsert error:', JSON.stringify(userError, null, 2))
      setMessage('İstifadəçi məlumatı əlavə olunmadı.')
      setSubmitting(false)
      return
    }

    if (editingRideId) {
      const { error } = await supabase
        .from('ride_listings')
        .update({
          role,
          origin,
          destination,
          ride_date: rideDate,
          departure_time: departureTime,
          seats: Number(seats),
          price_per_seat: Number(pricePerSeat),
          notes,
        })
        .eq('id', editingRideId)

      if (error) {
        console.error('Edit ride error:', JSON.stringify(error, null, 2))
        setMessage('Elan yenilənmədi.')
      } else {
        setMessage('Elan uğurla yeniləndi.')
        resetForm()
        await initializeData()
        setActiveTab('dashboard')
      }
    } else {
      const { error } = await supabase
        .from('ride_listings')
        .insert({
          driver_id: driverId,
          role,
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
        setMessage('Elan uğurla əlavə olundu.')
        resetForm()
        await initializeData()
        setActiveTab('dashboard')
      }
    }

    setSubmitting(false)
  }

  function handleEdit(ride: Ride) {
    setEditingRideId(ride.id)
    setRole(ride.role || 'driver')
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

  async function handleDelete(rideId: number) {
    const confirmed = window.confirm('Bu elanı silmək istəyirsən?')
    if (!confirmed) return

    const { error } = await supabase
      .from('ride_listings')
      .update({ status: 'cancelled' })
      .eq('id', rideId)

    if (error) {
      console.error('Delete ride error:', JSON.stringify(error, null, 2))
      setMessage('Elan silinmədi.')
    } else {
      setMessage('Elan silindi.')
      if (editingRideId === rideId) resetForm()
      await initializeData()
    }
  }

  const filteredRides = useMemo(() => {
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

      return matchesText && matchesRole && matchesDate
    })
  }, [rides, searchText, filterRole, filterDate])

  const driverRides = useMemo(
    () => filteredRides.filter((ride) => (ride.role || 'driver') === 'driver'),
    [filteredRides]
  )

  const passengerRides = useMemo(
    () => filteredRides.filter((ride) => (ride.role || 'driver') === 'passenger'),
    [filteredRides]
  )

  const matchedRides = useMemo(() => {
    const myLatestRide = myRides[0]
    if (!myLatestRide) return []

    const targetRole =
      (myLatestRide.role || 'driver') === 'driver' ? 'passenger' : 'driver'

    return rides.filter((ride) => {
      if (ride.id === myLatestRide.id) return false
      if ((ride.role || 'driver') !== targetRole) return false
      if (ride.ride_date !== myLatestRide.ride_date) return false
      if (!isRouteCompatible(myLatestRide, ride)) return false
      if (!isTimeClose(myLatestRide, ride, 120)) return false
      return true
    })
  }, [rides, myRides])

  const activeDriverCount = myRides.filter((x) => (x.role || 'driver') === 'driver').length
  const activePassengerCount = myRides.filter((x) => (x.role || 'driver') === 'passenger').length
  const currentDashboardRole = preferredRole || role || 'driver'

  return (
    <main style={styles.page}>
      <div style={styles.headerCard}>
        <h1 style={styles.title}>Yolüstü</h1>
        <p style={styles.subtitle}>Sürətli ride-sharing dashboard</p>
      </div>

      <div style={styles.topTabs}>
        {[
          { key: 'dashboard', label: 'Dashboard' },
          { key: 'create', label: 'Elan ver' },
          { key: 'search', label: 'Axtarış' },
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
            <h2 style={styles.sectionTitle}>
              {currentDashboardRole === 'passenger'
                ? 'Sərnişin dashboard'
                : 'Sürücü dashboard'}
            </h2>

            <div style={styles.threeColumnGrid}>
              <div style={styles.statsCard}>
                <p style={styles.mutedText}>Aktiv elanlarım</p>
                <h3>{myRides.length}</h3>
              </div>
              <div style={styles.statsCard}>
                <p style={styles.mutedText}>Uyğun elanlar</p>
                <h3>{matchedRides.length}</h3>
              </div>
              <div style={styles.statsCard}>
                <p style={styles.mutedText}>Tarixçə sayı</p>
                <h3>{historyRides.length}</h3>
              </div>
            </div>
          </section>

          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Profil xülasəsi</h2>
            <div style={styles.twoColumnGrid}>
              <div style={styles.statsCard}>
                <p style={styles.infoRow}><strong>Ad:</strong> {profileFullName || '-'}</p>
                <p style={styles.infoRow}><strong>Rol:</strong> {getRoleLabel(preferredRole)}</p>
                <p style={styles.infoRow}><strong>Telefon:</strong> {profilePhone || '-'}</p>
              </div>

              <div style={styles.statsCard}>
                {preferredRole === 'driver' ? (
                  <>
                    <p style={styles.infoRow}><strong>Avtomobil markası:</strong> {carBrand || '-'}</p>
                    <p style={styles.infoRow}><strong>Dövlət qeydiyyat nömrəsi:</strong> {licensePlate || '-'}</p>
                  </>
                ) : (
                  <p style={styles.infoRow}><strong>Qeyd:</strong> Sərnişin profilində avtomobil məlumatı tələb olunmur.</p>
                )}
              </div>
            </div>
          </section>

          {currentDashboardRole === 'driver' ? (
            <section style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>Sürücü paneli</h2>
              <div style={styles.threeColumnGrid}>
                <div style={styles.statsCard}>
                  <p style={styles.mutedText}>Sürücü elanlarım</p>
                  <h3>{activeDriverCount}</h3>
                </div>
                <div style={styles.statsCard}>
                  <p style={styles.mutedText}>Mənə uyğun sərnişinlər</p>
                  <h3>{matchedRides.filter((x) => (x.role || 'driver') === 'passenger').length}</h3>
                </div>
                <div style={styles.statsCard}>
                  <p style={styles.mutedText}>Sürətli keçid</p>
                  <button type="button" onClick={() => setActiveTab('create')} style={styles.secondaryButton}>
                    Yeni sürücü elanı yarat
                  </button>
                </div>
              </div>
            </section>
          ) : (
            <section style={styles.sectionCard}>
              <h2 style={styles.sectionTitle}>Sərnişin paneli</h2>
              <div style={styles.threeColumnGrid}>
                <div style={styles.statsCard}>
                  <p style={styles.mutedText}>Sərnişin elanlarım</p>
                  <h3>{activePassengerCount}</h3>
                </div>
                <div style={styles.statsCard}>
                  <p style={styles.mutedText}>Mənə uyğun sürücülər</p>
                  <h3>{matchedRides.filter((x) => (x.role || 'driver') === 'driver').length}</h3>
                </div>
                <div style={styles.statsCard}>
                  <p style={styles.mutedText}>Sürətli keçid</p>
                  <button type="button" onClick={() => setActiveTab('create')} style={styles.secondaryButton}>
                    Yeni sərnişin elanı yarat
                  </button>
                </div>
              </div>
            </section>
          )}

          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Mənə uyğun elanlar</h2>

            {matchedRides.length === 0 ? (
              <p style={styles.mutedText}>Hələ uyğun elan tapılmadı.</p>
            ) : (
              <div style={styles.ridesGrid}>
                {matchedRides.map((ride) => (
                  <div key={ride.id} style={styles.matchedCard}>
                    <div style={styles.badge}>Uyğun elan</div>
                    <p style={styles.infoRow}><strong>Rol:</strong> {getRoleLabel(ride.role)}</p>
                    <p style={styles.infoRow}><strong>Haradan:</strong> {ride.origin}</p>
                    <p style={styles.infoRow}><strong>Hara:</strong> {ride.destination}</p>
                    <p style={styles.infoRow}><strong>Tarix:</strong> {ride.ride_date || '-'}</p>
                    <p style={styles.infoRow}><strong>Saat:</strong> {ride.departure_time}</p>
                    <p style={styles.infoRow}><strong>Qiymət:</strong> {ride.price_per_seat} AZN</p>
                    {ride.notes && <p style={styles.infoRow}><strong>Qeyd:</strong> {ride.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Mənim aktiv elanlarım</h2>

            {myRides.length === 0 ? (
              <p style={styles.mutedText}>Aktiv elanın yoxdur.</p>
            ) : (
              <div style={styles.ridesGrid}>
                {myRides.map((ride) => (
                  <div key={ride.id} style={styles.myRideCard}>
                    <p style={styles.infoRow}><strong>Rol:</strong> {getRoleLabel(ride.role)}</p>
                    <p style={styles.infoRow}><strong>Haradan:</strong> {ride.origin}</p>
                    <p style={styles.infoRow}><strong>Hara:</strong> {ride.destination}</p>
                    <p style={styles.infoRow}><strong>Tarix:</strong> {ride.ride_date || '-'}</p>
                    <p style={styles.infoRow}><strong>Saat:</strong> {ride.departure_time}</p>
                    <p style={styles.infoRow}><strong>Yer sayı:</strong> {ride.seats}</p>
                    <p style={styles.infoRow}><strong>Qiymət:</strong> {ride.price_per_seat} AZN</p>
                    {ride.notes && <p style={styles.infoRow}><strong>Qeyd:</strong> {ride.notes}</p>}
                    <div style={styles.actionRow}>
                      <button type="button" onClick={() => handleEdit(ride)} style={styles.warningButton}>
                        Redaktə et
                      </button>
                      <button type="button" onClick={() => handleDelete(ride.id)} style={styles.dangerButton}>
                        Sil
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

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Rol</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={styles.select}
              >
                <option value="driver">Sürücü</option>
                <option value="passenger">Sərnişin</option>
              </select>
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Haradan</label>
              <input
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                required
                style={styles.input}
                placeholder="Məsələn: 20 Yanvar"
              />
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Hara</label>
              <input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                required
                style={styles.input}
                placeholder="Məsələn: Koroğlu"
              />
            </div>

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
                <div style={styles.quickRow}>
                  <button type="button" style={styles.secondaryButton} onClick={() => applyQuickDate('today')}>
                    Bu gün
                  </button>
                  <button type="button" style={styles.secondaryButton} onClick={() => applyQuickDate('tomorrow')}>
                    Sabah
                  </button>
                  <button type="button" style={styles.secondaryButton} onClick={() => applyQuickDate('dayAfter')}>
                    Birigün
                  </button>
                </div>
                {showPastDateWarning && (
                  <p style={styles.warningText}>Seçilən tarix keçmiş tarixdir.</p>
                )}
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Saat</label>
                <input
                  type="time"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  step={60}
                  required
                  style={styles.input}
                />
                <div style={styles.quickRow}>
                  <button type="button" style={styles.secondaryButton} onClick={() => applyQuickTime('now')}>
                    İndi
                  </button>
                  <button type="button" style={styles.secondaryButton} onClick={() => applyQuickTime('plus30')}>
                    +30 dəq
                  </button>
                  <button type="button" style={styles.secondaryButton} onClick={() => applyQuickTime('plus60')}>
                    +1 saat
                  </button>
                  <button type="button" style={styles.secondaryButton} onClick={() => applyQuickTime('evening')}>
                    Axşam 18:00
                  </button>
                </div>
                {showPastTimeWarning ? (
                  <p style={styles.warningText}>Seçilən saat bu gün üçün artıq keçmiş saatdır.</p>
                ) : (
                  <p style={styles.mutedText}>Saat seçimi sərbəstdir.</p>
                )}
              </div>
            </div>

            <div style={styles.twoColumnGrid}>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Yer sayı / nəfər sayı</label>
                <input
                  type="number"
                  min="1"
                  value={seats}
                  onChange={(e) => setSeats(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Qiymət</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={pricePerSeat}
                  onChange={(e) => setPricePerSeat(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Qeyd</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                style={styles.textarea}
                placeholder="Əlavə qeyd"
              />
            </div>

            <div style={styles.buttonRow}>
              <button type="submit" disabled={submitting} style={styles.primaryButton}>
                {submitting ? 'Göndərilir...' : editingRideId ? 'Yenilə' : 'Elanı əlavə et'}
              </button>

              <button type="button" onClick={resetForm} style={styles.cancelButton}>
                Formu təmizlə
              </button>
            </div>
          </form>
        </section>
      )}

      {activeTab === 'search' && (
        <>
          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Axtarış və filter</h2>

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
                  <select
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                    style={styles.select}
                  >
                    <option value="all">Hamısı</option>
                    <option value="driver">Sürücü elanları</option>
                    <option value="passenger">Sərnişin elanları</option>
                  </select>
                </div>

                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Tarix filteri</label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    style={styles.input}
                  />
                </div>
              </div>

              <p style={styles.mutedText}>Tapılan nəticə sayı: {filteredRides.length}</p>

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

                <button
                  type="button"
                  onClick={initializeData}
                  style={styles.secondaryButton}
                >
                  Yenilə
                </button>
              </div>
            </div>
          </section>

          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Filter nəticələri</h2>

            {filteredRides.length === 0 ? (
              <p style={styles.mutedText}>Filterə uyğun elan tapılmadı.</p>
            ) : (
              <div style={styles.ridesGrid}>
                {filteredRides.map((ride) => (
                  <div key={ride.id} style={styles.resultCard}>
                    <div style={styles.badge}>{getRoleLabel(ride.role)}</div>
                    <p style={styles.infoRow}><strong>Haradan:</strong> {ride.origin}</p>
                    <p style={styles.infoRow}><strong>Hara:</strong> {ride.destination}</p>
                    <p style={styles.infoRow}><strong>Tarix:</strong> {ride.ride_date || '-'}</p>
                    <p style={styles.infoRow}><strong>Saat:</strong> {ride.departure_time}</p>
                    <p style={styles.infoRow}><strong>Yer sayı:</strong> {ride.seats}</p>
                    <p style={styles.infoRow}><strong>Qiymət:</strong> {ride.price_per_seat} AZN</p>
                    {ride.notes && <p style={styles.infoRow}><strong>Qeyd:</strong> {ride.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Sürücü elanları</h2>
            {loading ? (
              <p style={styles.mutedText}>Yüklənir...</p>
            ) : driverRides.length === 0 ? (
              <p style={styles.mutedText}>Sürücü elanı tapılmadı.</p>
            ) : (
              <div style={styles.ridesGrid}>
                {driverRides.map((ride) => (
                  <div key={ride.id} style={styles.rideCard}>
                    <div style={styles.badge}>Sürücü</div>
                    <p style={styles.infoRow}><strong>Haradan:</strong> {ride.origin}</p>
                    <p style={styles.infoRow}><strong>Hara:</strong> {ride.destination}</p>
                    <p style={styles.infoRow}><strong>Tarix:</strong> {ride.ride_date || '-'}</p>
                    <p style={styles.infoRow}><strong>Saat:</strong> {ride.departure_time}</p>
                    <p style={styles.infoRow}><strong>Qiymət:</strong> {ride.price_per_seat} AZN</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section style={styles.sectionCard}>
            <h2 style={styles.sectionTitle}>Sərnişin elanları</h2>
            {loading ? (
              <p style={styles.mutedText}>Yüklənir...</p>
            ) : passengerRides.length === 0 ? (
              <p style={styles.mutedText}>Sərnişin elanı tapılmadı.</p>
            ) : (
              <div style={styles.ridesGrid}>
                {passengerRides.map((ride) => (
                  <div key={ride.id} style={styles.rideCard}>
                    <div style={styles.badge}>Sərnişin</div>
                    <p style={styles.infoRow}><strong>Haradan:</strong> {ride.origin}</p>
                    <p style={styles.infoRow}><strong>Hara:</strong> {ride.destination}</p>
                    <p style={styles.infoRow}><strong>Tarix:</strong> {ride.ride_date || '-'}</p>
                    <p style={styles.infoRow}><strong>Saat:</strong> {ride.departure_time}</p>
                    <p style={styles.infoRow}><strong>Qiymət:</strong> {ride.price_per_seat} AZN</p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
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
                  <div style={styles.badge}>{ride.status}</div>
                  <p style={styles.infoRow}><strong>Rol:</strong> {getRoleLabel(ride.role)}</p>
                  <p style={styles.infoRow}><strong>Haradan:</strong> {ride.origin}</p>
                  <p style={styles.infoRow}><strong>Hara:</strong> {ride.destination}</p>
                  <p style={styles.infoRow}><strong>Tarix:</strong> {ride.ride_date || '-'}</p>
                  <p style={styles.infoRow}><strong>Saat:</strong> {ride.departure_time}</p>
                  <p style={styles.infoRow}><strong>Qiymət:</strong> {ride.price_per_seat} AZN</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'profile' && (
        <section style={styles.sectionCard}>
          <h2 style={styles.sectionTitle}>Profil idarəetməsi</h2>

          <form onSubmit={handleSaveProfile} style={styles.form}>
            <div style={styles.fieldWrap}>
              <label style={styles.label}>Ad soyad</label>
              <input
                value={profileFullName}
                onChange={(e) => setProfileFullName(e.target.value)}
                style={styles.input}
                placeholder="Ad soyad"
              />
            </div>

            <div style={styles.twoColumnGrid}>
              <div style={styles.fieldWrap}>
                <label style={styles.label}>Username</label>
                <input
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                  style={styles.input}
                  placeholder="username"
                />
              </div>

              <div style={styles.fieldWrap}>
                <label style={styles.label}>Telefon</label>
                <input
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  style={styles.input}
                  placeholder="+994..."
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
                placeholder="Qısa məlumat"
              />
            </div>

            <div style={styles.fieldWrap}>
              <label style={styles.label}>Default rol</label>
              <select
                value={preferredRole}
                onChange={(e) => {
                  setPreferredRole(e.target.value)
                  setRole(e.target.value)
                  if (e.target.value !== 'driver') {
                    setCarBrand('')
                    setLicensePlate('')
                  }
                }}
                style={styles.select}
              >
                <option value="driver">Sürücü</option>
                <option value="passenger">Sərnişin</option>
              </select>
            </div>

            {preferredRole === 'driver' && (
              <div style={styles.twoColumnGrid}>
                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Avtomobil markası</label>
                  <input
                    value={carBrand}
                    onChange={(e) => setCarBrand(e.target.value)}
                    style={styles.input}
                    placeholder="Məsələn: Toyota Prius"
                    required={preferredRole === 'driver'}
                  />
                </div>

                <div style={styles.fieldWrap}>
                  <label style={styles.label}>Dövlət qeydiyyat nömrəsi</label>
                  <input
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    style={styles.input}
                    placeholder="Məsələn: 10-AB-123"
                    required={preferredRole === 'driver'}
                  />
                </div>
              </div>
            )}

            <div style={styles.buttonRow}>
              <button type="submit" disabled={profileSaving} style={styles.primaryButton}>
                {profileSaving ? 'Yadda saxlanılır...' : 'Profili yadda saxla'}
              </button>
            </div>
          </form>

          {profile && (
            <div style={{ marginTop: 20 }}>
              <p style={styles.infoRow}><strong>Aktiv profil ID:</strong> {profile.id}</p>
              <p style={styles.infoRow}><strong>Seçilmiş default rol:</strong> {getRoleLabel(preferredRole)}</p>
            </div>
          )}
        </section>
      )}
    </main>
  )
}