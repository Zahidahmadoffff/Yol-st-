'use client'

import { useEffect, useState } from 'react'

// CSS-i import et
import 'leaflet/dist/leaflet.css'

export default function LiveMap({ locations, ride, centerOnUser = false, userLocation }: any) {
  const [isClient, setIsClient] = useState(false)
  const [MapComponents, setMapComponents] = useState<any>(null)
  const [L, setL] = useState<any>(null)

  useEffect(() => {
    setIsClient(true)
    
    // Dinamik importlar
    const loadLeaflet = async () => {
      const leaflet = await import('leaflet')
      const reactLeaflet = await import('react-leaflet')
      
      // Leaflet marker ikonlarını düzəlt
      const L_default = leaflet.default
      delete (L_default.Icon.Default.prototype as any)._getIconUrl
      L_default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
      })
      
      setL(L_default)
      setMapComponents({
        MapContainer: reactLeaflet.MapContainer,
        TileLayer: reactLeaflet.TileLayer,
        Marker: reactLeaflet.Marker,
        Popup: reactLeaflet.Popup,
        Polyline: reactLeaflet.Polyline,
        useMap: reactLeaflet.useMap
      })
    }
    
    loadLeaflet()
  }, [])

  // MapController komponenti (useMap hook istifadə edir)
  const MapController = ({ centerOnUser, userLocation, ride }: any) => {
    const map = MapComponents?.useMap()
    const [hasCentered, setHasCentered] = useState(false)

    useEffect(() => {
      if (map && centerOnUser && userLocation && !hasCentered) {
        map.setView([userLocation.lat, userLocation.lng], 13)
        setHasCentered(true)
      } else if (map && ride?.origin_lat && ride?.origin_lng && !hasCentered && !userLocation) {
        map.setView([ride.origin_lat, ride.origin_lng], 12)
        setHasCentered(true)
      }
    }, [map, centerOnUser, userLocation, ride, hasCentered])

    return null
  }

  if (!isClient || !MapComponents || !L) {
    return (
      <div style={{ height: 400, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: 8 }}>🗺️</div>
          <div>Xəritə yüklənir...</div>
        </div>
      </div>
    )
  }

  const { MapContainer: MapCont, TileLayer: Tile, Marker: Mark, Popup: Pop, Polyline: Poly } = MapComponents

  const routePoints = ride?.origin_lat && ride?.origin_lng && ride?.destination_lat && ride?.destination_lng
    ? [[ride.origin_lat, ride.origin_lng], [ride.destination_lat, ride.destination_lng]]
    : []

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return '-'
    try {
      return new Date(value).toLocaleString()
    } catch {
      return String(value)
    }
  }

  const getRoleLabel = (role: string | null) => {
    return role === 'passenger' ? 'Sərnişin' : 'Sürücü'
  }

  return (
    <MapCont
      center={[40.4093, 49.8671]} // Bakı koordinatları
      zoom={12}
      style={{ height: '100%', width: '100%', borderRadius: 12 }}
    >
      <Tile
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      
      {routePoints.length > 0 && (
        <Poly 
          positions={routePoints} 
          color="#2563eb" 
          weight={3} 
          opacity={0.7}
        />
      )}
      
      {locations.map((loc: any) => {
        const icon = L.divIcon({
          className: 'custom-marker',
          html: `<div style="
            background: ${loc.role === 'driver' ? '#2563eb' : '#16a34a'};
            width: 28px;
            height: 28px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            font-weight: bold;
            color: white;
          ">${loc.role === 'driver' ? '🚗' : '👤'}</div>`,
          iconSize: [28, 28],
          popupAnchor: [0, -14]
        })
        
        return (
          <Mark
            key={loc.id}
            position={[loc.lat, loc.lng]}
            icon={icon}
          >
            <Pop>
              <div style={{ minWidth: 150 }}>
                <strong>{loc.user_name || `User ${loc.user_id}`}</strong><br />
                Rol: {getRoleLabel(loc.user_role || loc.role)}<br />
                Son yenilənmə: {formatDateTime(loc.updated_at)}
                {loc.speed && (
                  <><br />Sürət: {(loc.speed * 3.6).toFixed(1)} km/s</>
                )}
              </div>
            </Pop>
          </Mark>
        )
      })}
      
      <MapController 
        centerOnUser={centerOnUser} 
        userLocation={userLocation} 
        ride={ride}
      />
    </MapCont>
  )
}