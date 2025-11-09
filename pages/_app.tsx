import type { AppProps } from 'next/app'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { Inter } from 'next/font/google'
import MainLayout from '@/components/layout/MainLayout'
import { UserProvider } from '@/context/UserContext'
import PerformanceMonitor from '@/components/ui/PerformanceMonitor'
import '../app/globals.css'
import NProgress from 'nprogress'
import NotificationsGate from '@/components/providers/NotificationsGate'
import { useEffect } from 'react'
import { ensureSignedIn } from '@/lib/auth.init'

const inter = Inter({ subsets: ['latin'] })

// Pages that should not have the main layout (auth pages)
const authPages = ['/login', '/signup', '/verification', '/forgot-password', '/reset-password']

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  
  // Check if current page is an auth page
  const isAuthPage = authPages.includes(router.pathname)
  
  // Configure NProgress
  useEffect(() => {
    const handleStart = () => NProgress.start()
    const handleComplete = () => NProgress.done()
    
    router.events.on('routeChangeStart', handleStart)
    router.events.on('routeChangeComplete', handleComplete)
    router.events.on('routeChangeError', handleComplete)
    
    return () => {
      router.events.off('routeChangeStart', handleStart)
      router.events.off('routeChangeComplete', handleComplete)
      router.events.off('routeChangeError', handleComplete)
    }
  }, [router.events])

  // Ensure we have an authenticated Firebase user (anonymous if needed)
  useEffect(() => {
    ensureSignedIn().catch(() => {/* ignore */})
  }, [])
  
  return (
    <UserProvider>
      <div className={inter.className}>
        <Head>
          <title>Docusite</title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </Head>
        <PerformanceMonitor enabled={process.env.NODE_ENV === 'development'} />
        <NotificationsGate />
        {isAuthPage ? (
          <Component {...pageProps} />
        ) : (
          <MainLayout>
            <Component {...pageProps} />
          </MainLayout>
        )}
      </div>
    </UserProvider>
  )
}
