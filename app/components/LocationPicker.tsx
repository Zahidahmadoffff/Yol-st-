import React, { useState, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

const customIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [38, 38],
  iconAnchor: [19, 38],
})

function MapEvents({ setPos }: { setPos: (p: [number, number]) => void }) {
  useMapEvents({
    click(e) { setPos([e.latlng.lat, e.latlng.lng]) },
  })
  return null
}

function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()
  useEffect(() => { map.flyTo(center, 15) }, [center, map])
  return null
}

export default function LocationPicker({ title, onClose, onSelect }: any) {
  const [pos, setPos] = useState<[number, number]>([40.4093, 49.8671])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!search.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(search + ' Baku')}`)
      const data = await res.json()
      if (data && data.length > 0) {
        setPos([parseFloat(data[0].lat), parseFloat(data[0].lon)])
      } else { alert('Məkan tapılmadı. Daha dəqiq ad yazın.') }
    } catch (e) {}
    setLoading(false)
  }

  const confirm = async () => {
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos[0]}&lon=${pos[1]}&accept-language=az`)
      const data = await res.json()
      onSelect(pos[0], pos[1], data.display_name || 'Xəritədən seçildi')
    } catch {
      onSelect(pos[0], pos[1], 'Xəritədən seçildi')
    }
  }

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#f8fafc', zIndex: 99999, display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: 16, background: '#ffffff', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid #cbd5e1' }}>
        <button onClick={onClose} style={{ padding: '8px 12px', background: '#e2e8f0', color: '#0f172a', border: 'none', borderRadius: 8, fontWeight: 700 }}>Geri</button>
        <h3 style={{ margin: 0, flex: 1, fontSize: 16, textAlign: 'center', color: '#0f172a' }}>{title}</h3>
        <button onClick={confirm} style={{ padding: '8px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700 }}>Təsdiqlə</button>
      </div>
      
      <div style={{ padding: 10, display: 'flex', gap: 8, background: '#ffffff', zIndex: 1000, boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Küçə və ya Obyekt axtar (Məs: Gənclik Mall)..." style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', outline: 'none', fontSize: 14 }} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
        <button onClick={handleSearch} style={{ padding: '10px 16px', background: '#0f172a', color: '#ffffff', borderRadius: 8, border: 'none', fontWeight: 700 }}>{loading ? '⏳' : 'Axtar'}</button>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <MapContainer center={pos} zoom={14} style={{ height: '100%', width: '100%', zIndex: 1 }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Marker position={pos} icon={customIcon} />
          <MapEvents setPos={setPos} />
          <MapUpdater center={pos} />
        </MapContainer>
        <div style={{ position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, background: 'rgba(255,255,255,0.95)', padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 800, color: '#2563eb', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
          👆 Xəritədə yeri toxunaraq seçin
        </div>
      </div>
    </div>
  )
}