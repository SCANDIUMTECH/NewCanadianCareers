import { useAuthContext } from '@/lib/auth/context'

export function useAuth() {
  return useAuthContext()
}

export { useAuthContext }
