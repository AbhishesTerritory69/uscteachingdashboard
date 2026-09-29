import { createContext, useContext, useEffect, useState } from 'react'
import { authApi } from '../api/auth.js'
import { ApiError, tokenStore } from '../api/client.js'

const AuthContext = createContext(null)
let restoreRequest

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)
  const [sessionError, setSessionError] = useState('')
  const [restoreAttempt, setRestoreAttempt] = useState(0)

  useEffect(() => {
    let active = true
    const restore = async () => {
      const token = tokenStore.get()
      if (!token) {
        if (active) { setSessionError(''); setReady(true) }
        return
      }
      try {
        if (!restoreRequest) restoreRequest = authApi.me().finally(() => { restoreRequest = null })
        const response = await restoreRequest
        if (active) setUser(response.user)
        if (active) setSessionError('')
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          tokenStore.clear()
          if (active) setUser(null)
        } else if (active) {
          setSessionError(error.message || 'The session could not be restored.')
        }
      } finally {
        if (active) setReady(true)
      }
    }
    const handleUnauthorized = () => {
      tokenStore.clear()
      setUser(null)
      setReady(true)
    }
    window.addEventListener('sste:unauthorized', handleUnauthorized)
    restore()
    return () => {
      active = false
      window.removeEventListener('sste:unauthorized', handleUnauthorized)
    }
  }, [restoreAttempt])

  const login = async (credentials) => {
    const response = await authApi.login(credentials)
    tokenStore.set(response.token)
    setUser(response.user)
    setSessionError('')
    setReady(true)
    return response.user
  }

  const register = async (account) => {
    const response = await authApi.register(account)
    tokenStore.set(response.token)
    setUser(response.user)
    setSessionError('')
    setReady(true)
    return response.user
  }

  const logout = () => {
    tokenStore.clear()
    setUser(null)
    setReady(true)
  }

  const retrySession = () => {
    setReady(false)
    setSessionError('')
    setRestoreAttempt((value) => value + 1)
  }

  const value = {
    user,
    ready,
    sessionError,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'admin',
    isEditor: user?.role === 'editor',
    login,
    register,
    logout,
    retrySession,
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}