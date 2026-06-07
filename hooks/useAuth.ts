'use client'

import { useState } from 'react'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  AuthError,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'

const ERROR_MESSAGES: Record<string, string> = {
  'auth/user-not-found': 'Usuario no encontrado',
  'auth/wrong-password': 'Contraseña incorrecta',
  'auth/email-already-in-use': 'El email ya está registrado',
  'auth/invalid-email': 'Email inválido',
  'auth/weak-password': 'La contraseña debe tener al menos 6 caracteres',
  'auth/invalid-credential': 'Credenciales incorrectas',
  'auth/too-many-requests': 'Demasiados intentos. Intenta más tarde',
}

function parseError(error: unknown): string {
  const authError = error as AuthError
  return ERROR_MESSAGES[authError?.code] ?? 'Error desconocido. Intenta de nuevo.'
}

export function useAuth() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function login(email: string, password: string): Promise<boolean> {
    setLoading(true)
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return true
    } catch (e) {
      setError(parseError(e))
      return false
    } finally {
      setLoading(false)
    }
  }

  async function register(email: string, password: string): Promise<boolean> {
    setLoading(true)
    setError(null)
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      return true
    } catch (e) {
      setError(parseError(e))
      return false
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    await signOut(auth)
  }

  return { login, register, logout, error, loading }
}
