"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { User } from "@/types"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (user: User) => void
  signOut: () => void
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: () => {},
  signOut: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const stored = localStorage.getItem("auth_user")
    if (stored) {
      setUser(JSON.parse(stored))
    }
    setLoading(false)
  }, [])

  const signIn = (userData: User) => {
    localStorage.setItem("auth_user", JSON.stringify(userData))
    document.cookie = `auth=${btoa(JSON.stringify(userData))}; path=/`
    setUser(userData)
  }

  const signOut = () => {
    localStorage.removeItem("auth_user")
    document.cookie = "auth=; path=/; max-age=0"
    setUser(null)
    router.push("/login")
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
