'use client'

import { useEffect, useRef, useState } from 'react'

interface LocationPickerProps {
  origin: string
  setOrigin: (val: string) => void
  destination: string
  setDestination: (val: string) => void
}

type FieldType = 'origin' | 'destination'

type SuggestionItem = {
  place_id: number | string
  display_name: string
  lat: string
  lon: string
}

export default function LocationPicker({
  origin,
  setOrigin,
  destination,
  setDestination,
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const originMarkerRef = useRef<any>(null)
  const destMarkerRef = useRef<any>(null)

  const originInputRef = useRef<HTMLInputElement>(null)
  const destinationInputRef = useRef<HTMLInputElement>(null)

  const originDebounceRef = useRef<NodeJS.Timeout | null>(null)
  const destinationDebounceRef = useRef<NodeJS.Timeout | null>(null)

  const [mapReady, setMapReady] = useState(false)
  const [activeField, setActiveField] = useState<FieldType>('origin')
  const [loadingAddress, setLoadingAddress] = useState(false)
  const [err, setErr] = useState('')

  const [originSuggestions, setOriginSuggestions] = useState<SuggestionItem[]>([])
  const [destinationSuggestions, setDestinationSuggestions] = useState<SuggestionItem[]>([])
  const [showOriginSuggestions, setShowOriginSuggestions] = useState(false)
  const [showDestinationSuggestions, setShowDestinationSuggestions] = useState(false)

  const normalizeAddress = (fullAddress: string) => {
    const parts = fullAddress
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)

    return parts.slice(0, 3).join(', ')
  }

  const createMarkerIcon = (field: FieldType) => {
    const L = (window as any).L

    return L.divIcon({
      html: field === 'origin' ? '🟢' : '🔴',
      iconSize: [24, 24],
      iconAnchor: [12, 24],
      className: '',
    })
  }

  const setMarkerOnMap = (
    lat: number,
    lng: number,
    field: FieldType,
    popupText?: string
  ) => {
    const L = (window as any).L
    if (!mapInstanceRef.current || !L) return

    mapInstanceRef.current.setView([lat, lng], 15)

    if (field === 'origin') {
      const icon = createMarkerIcon('origin')

      if (originMarkerRef.current) {
        originMarkerRef.current.setLatLng([lat, lng])
      } else {
        originMarkerRef.current = L.marker([lat, lng], { icon }).addTo(mapInstanceRef.current)
      }

      if (popupText) {
        originMarkerRef.current.bindPopup(popupText)
      }
    } else {
      const icon = createMarkerIcon('destination')

      if (destMarkerRef.current) {
        destMarkerRef.current.setLatLng([lat, lng])
      } else {
        destMarkerRef.current = L.marker([lat, lng], { icon }).addTo(mapInstanceRef.current)
      }

      if (popupText) {
        destMarkerRef.current.bindPopup(popupText)
      }
    }
  }

  const fetchAddressName = async (lat: number, lng: number, field: FieldType) => {
    setLoadingAddress(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&accept-language=az&lat=${lat}&lon=${lng}`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      )

      const data = await res.json()

      if (data?.display_name) {
        const cleanAddress = normalizeAddress(data.display_name)

        if (field === 'origin') {
          setOrigin(cleanAddress)
        } else {
          setDestination(cleanAddress)
        }
      }
    } catch (e) {
      console.error('Ünvan tapılmadı', e)
    } finally {
      setLoadingAddress(false)
    }
  }

  const searchAddress = async (query: string): Promise<SuggestionItem[]> => {
    const trimmed = query.trim()
    if (trimmed.length < 3) return []

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&accept-language=az&countrycodes=az&q=${encodeURIComponent(
          trimmed
        )}&limit=5`,
        {
          headers: {
            Accept: 'application/json',
          },
        }
      )

      const data = await res.json()
      return Array.isArray(data) ? data : []
    } catch (e) {
      console.error('Ünvan axtarışı zamanı xəta baş verdi', e)
      return []
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    if ((window as any).L) {
      setMapReady(true)
      return
    }

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
      document.head.appendChild(s)
    }
  }, [])

  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return

    const L = (window as any).L

    const map = L.map(mapRef.current).setView([40.4093, 49.8671], 12)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map)

    mapInstanceRef.current = map

    map.on('click', (e: any) => {
      const { lat, lng } = e.latlng
      const field = activeField

      setMarkerOnMap(lat, lng, field, field === 'origin' ? 'Haradan' : 'Hara')
      void fetchAddressName(lat, lng, field)
    })

    return () => {
      map.remove()
      mapInstanceRef.current = null
      originMarkerRef.current = null
      destMarkerRef.current = null
    }
  }, [mapReady, activeField])

  useEffect(() => {
    return () => {
      if (originDebounceRef.current) clearTimeout(originDebounceRef.current)
      if (destinationDebounceRef.current) clearTimeout(destinationDebounceRef.current)
    }
  }, [])

  const locateMe = () => {
    if (!navigator.geolocation) {
      setErr('GPS dəstəklənmir')
      return
    }

    setErr('')
    setLoadingAddress(true)

    navigator.geolocation.getCurrentPosition(
      (p) => {
        const lat = p.coords.latitude
        const lng = p.coords.longitude

        setActiveField('origin')
        setMarkerOnMap(lat, lng, 'origin', 'Haradan')
        void fetchAddressName(lat, lng, 'origin')
      },
      () => {
        setErr('GPS icazəsi verilmədi və ya siqnal zəifdir')
        setLoadingAddress(false)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      }
    )
  }

  const handleOriginChange = (value: string) => {
    setOrigin(value)

    if (originDebounceRef.current) {
      clearTimeout(originDebounceRef.current)
    }

    if (value.trim().length < 3) {
      setOriginSuggestions([])
      setShowOriginSuggestions(false)
      return
    }

    originDebounceRef.current = setTimeout(async () => {
      const results = await searchAddress(value)
      setOriginSuggestions(results)
      setShowOriginSuggestions(true)
    }, 700)
  }

  const handleDestinationChange = (value: string) => {
    setDestination(value)

    if (destinationDebounceRef.current) {
      clearTimeout(destinationDebounceRef.current)
    }

    if (value.trim().length < 3) {
      setDestinationSuggestions([])
      setShowDestinationSuggestions(false)
      return
    }

    destinationDebounceRef.current = setTimeout(async () => {
      const results = await searchAddress(value)
      setDestinationSuggestions(results)
      setShowDestinationSuggestions(true)
    }, 700)
  }

  const handleSelectSuggestion = (item: SuggestionItem, field: FieldType) => {
    const cleanAddress = normalizeAddress(item.display_name)
    const lat = Number(item.lat)
    const lng = Number(item.lon)

    if (field === 'origin') {
      setOrigin(cleanAddress)
      setActiveField('origin')
      setOriginSuggestions([])
      setShowOriginSuggestions(false)
      setMarkerOnMap(lat, lng, 'origin', 'Haradan')
      originInputRef.current?.blur()
    } else {
      setDestination(cleanAddress)
      setActiveField('destination')
      setDestinationSuggestions([])
      setShowDestinationSuggestions(false)
      setMarkerOnMap(lat, lng, 'destination', 'Hara')
      destinationInputRef.current?.blur()
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gap: 12,
        background: '#f8fafc',
        padding: 14,
        borderRadius: 14,
        border: '1px solid #e2e8f0',
      }}
    >
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          type="button"
          onClick={() => setActiveField('origin')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 10,
            border: '1px solid #cbd5e1',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            background: activeField === 'origin' ? '#dbeafe' : '#ffffff',
            color: activeField === 'origin' ? '#1e4ed8' : '#0f172a',
            borderColor: activeField === 'origin' ? '#2563eb' : '#cbd5e1',
          }}
        >
          🟢 Haradan seçilir
        </button>

        <button
          type="button"
          onClick={() => setActiveField('destination')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: 10,
            border: '1px solid #cbd5e1',
            fontWeight: 700,
            fontSize: 13,
            cursor: 'pointer',
            background: activeField === 'destination' ? '#fee2e2' : '#ffffff',
            color: activeField === 'destination' ? '#991b1b' : '#0f172a',
            borderColor: activeField === 'destination' ? '#dc2626' : '#cbd5e1',
          }}
        >
          🔴 Hara seçilir
        </button>
      </div>

      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: 220,
          borderRadius: 12,
          border: '1px solid #cbd5e1',
          overflow: 'hidden',
        }}
      />

      {loadingAddress && (
        <p style={{ margin: 0, fontSize: 12, color: '#2563eb' }}>
          🔄 Ünvan təyin edilir...
        </p>
      )}

      {err && (
        <p style={{ margin: 0, fontSize: 12, color: '#dc2626' }}>
          ⚠️ {err}
        </p>
      )}

      {activeField === 'origin' && (
        <button
          type="button"
          onClick={locateMe}
          style={{
            padding: '8px 12px',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 10,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 700,
            color: '#334155',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          🎯 Mövcud yerimi xəritədə tap və "Haradan" et
        </button>
      )}

      <div style={{ display: 'grid', gap: 10, gridTemplateColumns: '1fr 1fr' }}>
        <div style={{ display: 'grid', gap: 4, position: 'relative' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
            Haradan (Mətn)
          </label>

          <input
            ref={originInputRef}
            value={origin}
            onFocus={() => {
              setActiveField('origin')
              if (originSuggestions.length > 0) setShowOriginSuggestions(true)
            }}
            onChange={(e) => handleOriginChange(e.target.value)}
            onBlur={() => {
              setTimeout(() => setShowOriginSuggestions(false), 150)
            }}
            placeholder="Ünvan yazın və ya xəritədən seçin"
            required
            autoComplete="off"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />

          {showOriginSuggestions && originSuggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                zIndex: 30,
                overflow: 'hidden',
                maxHeight: 240,
                overflowY: 'auto',
              }}
            >
              {originSuggestions.map((item, index) => (
                <button
                  key={`${item.place_id}-${index}`}
                  type="button"
                  onMouseDown={() => handleSelectSuggestion(item, 'origin')}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    border: 'none',
                    borderBottom:
                      index !== originSuggestions.length - 1
                        ? '1px solid #f1f5f9'
                        : 'none',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#0f172a',
                  }}
                >
                  {normalizeAddress(item.display_name)}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gap: 4, position: 'relative' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
            Hara (Mətn)
          </label>

          <input
            ref={destinationInputRef}
            value={destination}
            onFocus={() => {
              setActiveField('destination')
              if (destinationSuggestions.length > 0) setShowDestinationSuggestions(true)
            }}
            onChange={(e) => handleDestinationChange(e.target.value)}
            onBlur={() => {
              setTimeout(() => setShowDestinationSuggestions(false), 150)
            }}
            placeholder="Ünvan yazın və ya xəritədən seçin"
            required
            autoComplete="off"
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: 8,
              border: '1px solid #cbd5e1',
              fontSize: 14,
              boxSizing: 'border-box',
            }}
          />

          {showDestinationSuggestions && destinationSuggestions.length > 0 && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 4,
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
                zIndex: 30,
                overflow: 'hidden',
                maxHeight: 240,
                overflowY: 'auto',
              }}
            >
              {destinationSuggestions.map((item, index) => (
                <button
                  key={`${item.place_id}-${index}`}
                  type="button"
                  onMouseDown={() => handleSelectSuggestion(item, 'destination')}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 12px',
                    border: 'none',
                    borderBottom:
                      index !== destinationSuggestions.length - 1
                        ? '1px solid #f1f5f9'
                        : 'none',
                    background: '#ffffff',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#0f172a',
                  }}
                >
                  {normalizeAddress(item.display_name)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}