'use client'

import { useState, useEffect } from 'react'
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Cliente } from '@/lib/types'

export function useClientes(userId: string | undefined) {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setClientes([])
      setLoading(false)
      return
    }
    const q = query(collection(db, 'clientes'), where('userId', '==', userId), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setClientes(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Cliente))
      setLoading(false)
    })
    return unsub
  }, [userId])

  async function agregarCliente(data: Omit<Cliente, 'id' | 'createdAt'>) {
    await addDoc(collection(db, 'clientes'), { ...data, createdAt: serverTimestamp() })
  }

  async function actualizarCliente(id: string, data: Partial<Omit<Cliente, 'id' | 'userId' | 'createdAt'>>) {
    await updateDoc(doc(db, 'clientes', id), data)
  }

  async function eliminarCliente(id: string) {
    await deleteDoc(doc(db, 'clientes', id))
  }

  return { clientes, loading, agregarCliente, actualizarCliente, eliminarCliente }
}
