'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Ride = {
  id: string
  origin: string
  destination: string
  departure_time: string
  seats: number
  price_per_seat: number
  notes: string | null
}

export default function Home() {
  const [rides, setRides] = useState<Ride[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getRides()
  }, [])

  async function getRides() {
    const { data, error } = await supabase
      .from('ride_listings')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Supabase xətası full:', JSON.stringify(error, null, 2))
    } else {
      setRides((data as Ride[]) || [])
    }

    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-white text-black p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-2">Yolüstü</h1>
        <p className="text-gray-600 mb-6">Bakı üçün ride-sharing mini app</p>

        <button
          className="bg-black text-white px-4 py-2 rounded-lg mb-6"
          onClick={getRides}
        >
          Yenilə
        </button>

        {loading ? (
          <p>Yüklənir...</p>
        ) : rides.length === 0 ? (
          <p>Hələ sürücü elanı yoxdur.</p>
        ) : (
          <div className="space-y-4">
            {rides.map((ride) => (
              <div key={ride.id} className="border rounded-xl p-4">
                <p><strong>Haradan:</strong> {ride.origin}</p>
                <p><strong>Hara:</strong> {ride.destination}</p>
                <p><strong>Vaxt:</strong> {ride.departure_time}</p>
                <p><strong>Yer sayı:</strong> {ride.seats}</p>
                <p><strong>1 nəfər qiymət:</strong> {ride.price_per_seat} AZN</p>
                <p><strong>Qeyd:</strong> {ride.notes || '—'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}