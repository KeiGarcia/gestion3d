'use client'

import { useState, useEffect } from 'react'
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  getDoc,
  increment,
  orderBy,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Pedido, EstadoPedido } from '@/lib/types'

export function usePedidos(userId: string | undefined) {
  const [pedidos, setPedidos] = useState<Pedido[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) {
      setPedidos([])
      setLoading(false)
      return
    }

    const q = query(
      collection(db, 'pedidos'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Pedido)
      setPedidos(data)
      setLoading(false)
    })

    return unsubscribe
  }, [userId])

  async function agregarPedido(pedido: Omit<Pedido, 'id' | 'createdAt' | 'updatedAt'>) {
    await addDoc(collection(db, 'pedidos'), {
      ...pedido,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  }

  async function cambiarEstado(pedidoId: string, nuevoEstado: EstadoPedido, pedido: Pedido) {
    const pedidoRef = doc(db, 'pedidos', pedidoId)

    // Descontar stock al completar (solo si no estaba Completado antes)
    if (nuevoEstado === 'Completado' && pedido.estado !== 'Completado' && pedido.materialId) {
      const materialRef = doc(db, 'materiales', pedido.materialId)
      const materialSnap = await getDoc(materialRef)
      if (materialSnap.exists()) {
        const stockActual = materialSnap.data().stock_gramos as number
        const descuento = Math.min(pedido.consumo_gramos, stockActual)
        await updateDoc(materialRef, {
          stock_gramos: increment(-descuento),
        })
      }
    }

    await updateDoc(pedidoRef, {
      estado: nuevoEstado,
      updatedAt: serverTimestamp(),
    })
  }

  return { pedidos, loading, agregarPedido, cambiarEstado }
}
