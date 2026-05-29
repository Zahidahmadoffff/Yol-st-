'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface LocationPickerProps {
  onSelect: (lat: number, lng: number, address: string) => void
  onClose: () => void
  title?: string
}

export default function LocationPicker({ onSelect, onClose, title = 'Məkan seç' }: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)

  const [mapReady, setMapReady] = useState(false)
  const [selected, setSelected] = useState<{ lat: number; lng: number; address: string } | null>(null)
  const [loading, setLoading] = useState(false)

  // ── Nominatim ilə ünvan al (pulsuz, API key yoxdur) ──────────────
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=az`,
        { headers: { 'User-Agent': 'YolDash/1.0' } }
      )
      const data = await res.json()
      if (data?.display_name) {
        // Qısa ünvan: ilk 2-3 hissəni götür
        const parts = data.display_name.split(',')
        return parts.slice(0, 3).join(',').trim()
      }
    } catch (_) {}
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  }, [])

  // ── 1. Leaflet yüklə ─────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    if ((window as any).L) { setMapReady(true); return }

    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link')
      link.id = 'leaflet-css'
      link.rel = 'stylesheet'
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'
      document.head.appendChild(link)
    }
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script')
      script.id = 'leaflet-js'
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'
      script.onload = () => setMapReady(true)
      document.head.appendChild(script)
    }
  }, [])

  // ── 2. Xəritəni qur + klikə qulaq as ────────────────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return

    const L = (window as any).L
    // Bakının mərkəzi
    const map = L.map(mapRef.current).setView([40.4093, 49.8671], 13)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap', maxZoom: 19,
    }).addTo(map)

    map.on('click', async (e: any) => {
      const { lat, lng } = e.latlng
      setLoading(true)

      // Marker yenilə
      const icon = L.divIcon({ html: '📍', iconSize: [30, 30], className: '' })
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng], { icon }).addTo(map)
      }

      const address = await reverseGeocode(lat, lng)
      setSelected({ lat, lng, address })
      setLoading(false)
    })

    // GPS ilə cari məkanı göstər (istəyə bağlı)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          map.setView([pos.coords.latitude, pos.coords.longitude], 15)
        },
        () => {} // GPS xətasını ignore et
      )
    }

    mapInstanceRef.current = map

    return () => {
      map.remove()
      mapInstanceRef.current = null
      markerRef.current = null
    }
  }, [mapReady, reverseGeocode])

  const handleConfirm = () => {
    if (!selected) return
    onSelect(selected.lat, selected.lng, selected.address)
    onClose()
  }

  return (
    // Modal overlay
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        background: '#0f172a', color: '#fff',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontWeight: 800, fontSize: 16 }}>📍 {title}</span>
        <button type="button" onClick={onClose} style={{
          background: 'none', border: 'none', color: '#fff',
          fontSize: 22, cursor: 'pointer', lineHeight: 1,
        }}>✕</button>
      </div>

      {/* Hint */}
      <div style={{ background: '#1e293b', color: '#94a3b8', padding: '8px 16px', fontSize: 13 }}>
        Xəritəyə toxunun — məkan seçin
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ flex: 1, minHeight: 0 }} />

      {/* Bottom bar */}
      <div style={{
        background: '#fff', padding: '12px 16px',
        borderTop: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ flex: 1 }}>
          {loading && <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>⏳ Ünvan yoxlanılır...</p>}
          {selected && !loading && (
            <p style={{ margin: 0, fontSize: 13, color: '#0f172a', fontWeight: 600 }}>
              📍 {selected.address}
            </p>
          )}
          {!selected && !loading && (
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Hələ məkan seçilməyib</p>
          )}
        </div>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!selected || loading}
          style={{
            padding: '12px 20px',
            background: selected && !loading ? '#2563eb' : '#cbd5e1',
            color: '#fff', border: 'none', borderRadius: 12,
            cursor: selected && !loading ? 'pointer' : 'not-allowed',
            fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap',
          }}
        >
          Təsdiqlə ✓
        </button>
      </div>
    </div>
  )
}
