'use client'

import { useState, useEffect } from 'react'
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Producto } from '@/lib/types'

export function useProductos(userId: string | undefined) {
  const [productos, setProductos] = useState<Producto[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setProductos([])
      setLoading(false)
      return
    }
    const q = query(collection(db, 'productos'), where('userId', '==', userId), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setProductos(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Producto))
      setLoading(false)
    })
    return unsub
  }, [userId])

  async function agregarProducto(data: Omit<Producto, 'id' | 'createdAt'>) {
    await addDoc(collection(db, 'productos'), { ...data, createdAt: serverTimestamp() })
  }

  async function actualizarProducto(id: string, data: Partial<Omit<Producto, 'id' | 'userId' | 'createdAt'>>) {
    await updateDoc(doc(db, 'productos', id), data)
  }

  async function eliminarProducto(id: string) {
    await deleteDoc(doc(db, 'productos', id))
  }

  return { productos, loading, agregarProducto, actualizarProducto, eliminarProducto }
}
