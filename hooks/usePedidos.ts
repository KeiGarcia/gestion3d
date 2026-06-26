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
import { normalizarFilamentos } from '@/lib/types'

async function ajustarStock(
  pedido: Pedido,
  modo: 'descontar' | 'restaurar'
) {
  const sign = modo === 'descontar' ? -1 : 1
  const cant = pedido.cantidad ?? 1

  // Filamentos (gramos × cantidad del pedido)
  const filamentos = normalizarFilamentos(pedido)
  for (const f of filamentos) {
    if (!f.materialId || f.consumo_gramos <= 0) continue
    const materialRef = doc(db, 'materiales', f.materialId)
    const snap = await getDoc(materialRef)
    if (!snap.exists()) continue
    const delta = f.consumo_gramos * cant
    await updateDoc(materialRef, { stock_gramos: increment(sign * delta) })
  }

  // Insumos (unidades × cantidad del pedido)
  if (pedido.insumos && pedido.insumos.length > 0) {
    for (const insumo of pedido.insumos) {
      if (!insumo.materialId || insumo.cantidad <= 0) continue
      const materialRef = doc(db, 'materiales', insumo.materialId)
      const snap = await getDoc(materialRef)
      if (!snap.exists()) continue
      const delta = insumo.cantidad * cant
      await updateDoc(materialRef, { stock_gramos: increment(sign * delta) })
    }
  }
}

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

  async function actualizarPedido(pedidoId: string, data: Partial<Omit<Pedido, 'id' | 'userId' | 'createdAt'>>) {
    await updateDoc(doc(db, 'pedidos', pedidoId), {
      ...data,
      updatedAt: serverTimestamp(),
    })
  }

  async function cambiarEstado(pedidoId: string, nuevoEstado: EstadoPedido, pedido: Pedido) {
    const pedidoRef = doc(db, 'pedidos', pedidoId)

    // Al completar: descontar stock (solo si no estaba ya Completado)
    if (nuevoEstado === 'Completado' && pedido.estado !== 'Completado') {
      await ajustarStock(pedido, 'descontar')
    }

    // Cancelado-PRE desde Completado: restaurar stock (fue marcado completado por error)
    if (nuevoEstado === 'Cancelado - PRE' && pedido.estado === 'Completado') {
      await ajustarStock(pedido, 'restaurar')
    }

    // Cancelado-POS desde Completado: no restaurar (producto ya fabricado, materiales consumidos)

    await updateDoc(pedidoRef, {
      estado: nuevoEstado,
      updatedAt: serverTimestamp(),
    })
  }

  return { pedidos, loading, agregarPedido, actualizarPedido, cambiarEstado }
}
