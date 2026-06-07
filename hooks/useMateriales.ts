'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Material } from '@/lib/types'

export function useMateriales(userId: string | undefined) {
  const [materiales, setMateriales] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setMateriales([])
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'materiales'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Material)
      setMateriales(data)
      setLoading(false)
    })

    return unsubscribe
  }, [userId])

  async function agregarMaterial(material: Omit<Material, 'id' | 'createdAt'>) {
    await addDoc(collection(db, 'materiales'), {
      ...material,
      createdAt: serverTimestamp(),
    })
  }

  async function actualizarMaterial(id: string, data: Partial<Omit<Material, 'id' | 'userId' | 'createdAt'>>) {
    await updateDoc(doc(db, 'materiales', id), data)
  }

  async function eliminarMaterial(id: string) {
    await deleteDoc(doc(db, 'materiales', id))
  }

  return { materiales, loading, agregarMaterial, actualizarMaterial, eliminarMaterial }
}
