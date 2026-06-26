'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Configuracion } from '@/lib/types'

const DEFAULTS: Omit<Configuracion, 'id' | 'userId'> = {
  costo_energia_hora: 50,
  costo_amortizacion_hora: 300,
  costo_mano_obra_hora: 3000,
  margen_ganancia_default: 40,
  costo_packaging_default: 1500,
}

export function useConfiguracion(userId: string | undefined) {
  const [config, setConfig] = useState<Omit<Configuracion, 'id' | 'userId'>>(DEFAULTS)
  const [configId, setConfigId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadConfig = useCallback(async () => {
    if (!userId) {
      setLoading(false)
      return
    }

    const q = query(collection(db, 'configuraciones'), where('userId', '==', userId))
    const snapshot = await getDocs(q)

    if (!snapshot.empty) {
      const d = snapshot.docs[0]
      const data = d.data() as Configuracion
      setConfig({
        costo_energia_hora: data.costo_energia_hora,
        costo_amortizacion_hora: data.costo_amortizacion_hora,
        costo_mano_obra_hora: data.costo_mano_obra_hora,
        margen_ganancia_default: data.margen_ganancia_default,
        costo_packaging_default: data.costo_packaging_default ?? DEFAULTS.costo_packaging_default,
      })
      setConfigId(d.id)
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    loadConfig()
  }, [loadConfig])

  async function guardarConfig(newConfig: Omit<Configuracion, 'id' | 'userId'>) {
    if (!userId) return

    if (configId) {
      await updateDoc(doc(db, 'configuraciones', configId), newConfig)
    } else {
      const ref = await addDoc(collection(db, 'configuraciones'), {
        ...newConfig,
        userId,
        createdAt: serverTimestamp(),
      })
      setConfigId(ref.id)
    }
    setConfig(newConfig)
  }

  return { config, loading, guardarConfig }
}
