'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface LiveMapProps {
  conversationId: number
  currentUserId: number
  isDriver: boolean
  otherUserId: number
}

export default function LiveMap({
  conversationId,
  currentUserId,
  isDriver,
  otherUserId,
}: LiveMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const myMarkerRef = useRef<any>(null)
  const otherMarkerRef = useRef<any>(null)
  const watchIdRef = useRef<number | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [isSharing, setIsSharing] = useState(false)
  const [otherLoc, setOtherLoc] = useState<{ lat: number; lng: number } | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [err, setErr] = useState('')
  const [debugMsg, setDebugMsg] = useState('')

  // ── SQL Xətalarının qarşısını alan təhlükəsiz yazma funksiyası ──
  const safeLocationUpsert = async (lat: number, lng: number, is_sharing: boolean) => {
    const payload = {
      user_id: currentUserId,
      conversation_id: conversationId,
      lat: lat,
      lng: lng,
      is_sharing: is_sharing,
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from('live_locations')
      .select('id')
      .eq('user_id', currentUserId)
      .eq('conversation_id', conversationId)
      .maybeSingle()

    if (existing) {
      await supabase.from('live_locations').update(payload).eq('id', existing.id)
    } else {
      await supabase.from('live_locations').insert(payload)
    }
  }

  // ── Marker yeniləmə ───────────────────────────────────────────────
  const placeOtherMarker = useCallback((lat: number, lng: number) => {
    if (!mapInstanceRef.current) return
    const L = (window as any).L
    if (!L) return
    
    // Əgər mən sürücüyəmsə digəri sərnişindir (🧑), mən sərnişinəmsə digəri sürücüdür (🚗)
    const iconHtml = isDriver ? '🧑' : '🚗'
    const popupText = isDriver ? 'Sərnişin 🧑' : 'Sürücü 🚗'
    
    const icon = L.divIcon({ html: iconHtml, iconSize: [32, 32], className: '' })
    
    if (otherMarkerRef.current) {
      otherMarkerRef.current.setLatLng([lat, lng])
    } else {
      otherMarkerRef.current = L.marker([lat, lng], { icon })
        .addTo(mapInstanceRef.current)
        .bindPopup(popupText)
        .openPopup()
    }
    mapInstanceRef.current.setView([lat, lng], 15)
  }, [isDriver])

  // ── Supabase-dən digər istifadəçinin lokasiyasını oxuma ──────────
  const pollOtherLocation = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('live_locations')
        .select('*')
        .eq('user_id', otherUserId)
        .eq('conversation_id', conversationId)
        .maybeSingle()

      if (error) {
        setDebugMsg(`DB xətası: ${error.message}`)
        return
      }

      if (!data) {
        setDebugMsg('Hələ lokasiya yoxdur')
        return
      }

      setDebugMsg(`Digər tərəf paylaşır: ${data.is_sharing}`)

      if (data.is_sharing && Number(data.lat) !== 0) {
        const lat = Number(data.lat)
        const lng = Number(data.lng)
        setOtherLoc({ lat, lng })
        placeOtherMarker(lat, lng)
      } else {
        setOtherLoc(null)
        if (otherMarkerRef.current && mapInstanceRef.current) {
          mapInstanceRef.current.removeLayer(otherMarkerRef.current)
          otherMarkerRef.current = null
        }
      }
    } catch (e: any) {
      setDebugMsg(`Xəta: ${e.message}`)
    }
  }, [otherUserId, conversationId, placeOtherMarker])

  // ── 1. Leaflet CDN ────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if ((window as any).L) { setMapReady(true); return }

    if (!document.getElementById('leaflet-css')) {
      const l = document.createElement('link')
      l.id = 'leaflet-css'
      l.rel = 'stylesheet'
      l.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(l)
    }
    if (!document.getElementById('leaflet-js')) {
      const s = document.createElement('script')
      s.id = 'leaflet-js'
      s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      s.onload = () => setMapReady(true)
      s.onerror = () => setErr('Xəritə yüklənmədi')
      document.head.appendChild(s)
    }
  }, [])

  // ── 2. Xəritə qur ────────────────────────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return
    const L = (window as any).L
    const map = L.map(mapRef.current).setView([40.4093, 49.8671], 12)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(map)
    mapInstanceRef.current = map
    return () => {
      map.remove()
      mapInstanceRef.current = null
      myMarkerRef.current = null
      otherMarkerRef.current = null
    }
  }, [mapReady])

  // ── 3. İlk yoxlama + polling + Realtime ──────────────────────────
  useEffect(() => {
    void pollOtherLocation()
    pollRef.current = setInterval(() => { void pollOtherLocation() }, 3000)

    const ch = supabase
      .channel(`livemap-${conversationId}-${currentUserId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_locations' }, (payload) => {
        const row = payload.new as any
        if (!row) return
        if (row.user_id !== otherUserId || row.conversation_id !== conversationId) return
        
        if (row.is_sharing && Number(row.lat) !== 0) {
          const lat = Number(row.lat)
          const lng = Number(row.lng)
          setOtherLoc({ lat, lng })
          placeOtherMarker(lat, lng)
        } else {
          setOtherLoc(null)
          if (otherMarkerRef.current && mapInstanceRef.current) {
            mapInstanceRef.current.removeLayer(otherMarkerRef.current)
            otherMarkerRef.current = null
          }
        }
      })
      .subscribe()

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      void supabase.removeChannel(ch)
    }
  }, [conversationId, currentUserId, otherUserId, pollOtherLocation, placeOtherMarker])

  // ── 4. Lokasiya paylaşma funksiyası (HƏR İKİ TƏRƏF ÜÇÜN) ──────────
  const startSharing = useCallback(() => {
    if (!navigator.geolocation) { setErr('GPS dəstəklənmir'); return }
    setErr('')
    setIsSharing(true)

    const push = async (lat: number, lng: number) => {
      await safeLocationUpsert(lat, lng, true)

      if (mapInstanceRef.current && mapReady) {
        const L = (window as any).L
        // Öz ikonumuz hər zaman 📍 olaraq qalır
        const icon = L.divIcon({ html: '📍', iconSize: [28, 28], className: '' })
        if (myMarkerRef.current) {
          myMarkerRef.current.setLatLng([lat, lng])
        } else {
          myMarkerRef.current = L.marker([lat, lng], { icon })
            .addTo(mapInstanceRef.current).bindPopup('Sən')
          mapInstanceRef.current.setView([lat, lng], 15)
        }
      }
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (p) => { void push(p.coords.latitude, p.coords.longitude) },
      () => setErr('GPS siqnalı alınmadı'),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    )
  }, [currentUserId, conversationId, mapReady])

  // ── 5. Paylaşımı dayandır ─────────────────────────────────────────
  const stopSharing = useCallback(async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    
    await safeLocationUpsert(0, 0, false)

    if (myMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(myMarkerRef.current)
      myMarkerRef.current = null
    }
    setIsSharing(false)
  }, [currentUserId, conversationId])

  // ── 6. Cleanup ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [])

  // ── UI DİZAYNI ────────────────────────────────────────────────────
  return (
    <div style={{ marginBottom: 16 }}>
      {/* Xəritə Qutusu */}
      <div ref={mapRef} style={{
        width: '100%', height: 250, borderRadius: 14,
        border: '1px solid #e2e8f0', marginBottom: 10,
        background: '#f1f5f9', overflow: 'hidden',
      }} />

      {!mapReady && !err && (
        <p style={{ color: '#64748b', fontSize: 13 }}>⏳ Xəritə yüklənir...</p>
      )}
      {err && <p style={{ color: '#dc2626', fontSize: 13 }}>⚠️ {err}</p>}

      {/* İdarəetmə Paneli */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        
        {/* Öz lokasiyanı idarə et */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {!isSharing ? (
            <button type="button" onClick={startSharing} style={{
              padding: '10px 16px', background: '#16a34a', color: '#fff',
              border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14,
            }}>📍 Lokasiyamı paylaş</button>
          ) : (
            <>
              <button type="button" onClick={() => void stopSharing()} style={{
                padding: '10px 16px', background: '#dc2626', color: '#fff',
                border: 'none', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 14,
              }}>⏹ Dayandır</button>
              <span style={{ color: '#16a34a', fontWeight: 700, fontSize: 13 }}>
                🟢 Canlı paylaşılır
              </span>
            </>
          )}
        </div>

        {/* Qarşı tərəfin lokasiya statusu */}
        <div style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: 13, margin: 0, fontWeight: otherLoc ? 700 : 400, color: otherLoc ? '#16a34a' : '#64748b' }}>
            {otherLoc 
              ? `🟢 ${isDriver ? 'Sərnişinin' : 'Sürücünün'} canlı lokasiyası xəritədə göstərilir` 
              : `⏳ ${isDriver ? 'Sərnişin' : 'Sürücü'} hələ lokasiya paylaşmır...`}
          </p>
        </div>

      </div>
    </div>
  )
}