import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '@/lib/firebase-client';
import { fetchProfile } from '@/lib/user-profile';
import { ensureUserDoc } from '@/lib/ensure-user-doc';
import { doc, onSnapshot } from 'firebase/firestore';

interface UserContextType {
  profilePicture: string;
  setProfilePicture: (picture: string) => void;
  userName: string;
  setUserName: (name: string) => void;
  language: string;
  setLanguage: (language: string) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (enabled: boolean) => Promise<void> | void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [profilePicture, setProfilePicture] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [language, setLanguage] = useState<string>('en');
  const [notificationsEnabled, _setNotificationsEnabled] = useState<boolean>(true);

  // Load user profile on first load and when auth state changes
  useEffect(() => {
    let cancelled = false;
    let stopProfile: null | (() => void) = null;
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      // Tear down any existing profile subscription
      if (stopProfile) { try { stopProfile(); } catch { /* ignore */ } stopProfile = null; }

      if (!u) {
        if (!cancelled) {
          setUserName('');
          setProfilePicture('');
        }
        return;
      }
      try {
        // Ensure the user doc exists for permissioned reads
        try { await ensureUserDoc(); } catch { /* non-fatal */ }

        // Prime state once (best-effort) to avoid a blank between login and first snapshot
        try {
          const docData = await fetchProfile(u.uid);
          if (!cancelled && docData) {
            setUserName(docData.fullName || docData.displayName || u.displayName || '');
            setProfilePicture((docData.photoUrl ?? u.photoURL ?? '') || '');
          }
        } catch { /* non-fatal */ }

        // Live subscribe to the user profile in Firestore for instant updates everywhere
        stopProfile = onSnapshot(
          doc(db, 'users', u.uid),
          (snap) => {
            if (cancelled) return;
            const d = snap.data() as any | undefined;
            if (!d) return;
            setUserName(d.fullName || d.displayName || u.displayName || '');
            // Treat null/empty as no image so Avatar falls back to initials
            const url = (d.photoUrl ?? u.photoURL ?? '') as string | null;
            setProfilePicture((url || '').trim());
            // Notifications preference (default true when missing)
            const pref = typeof d.notificationsEnabled === 'boolean' ? d.notificationsEnabled : true;
            _setNotificationsEnabled(pref);
          },
          () => { /* ignore errors to avoid breaking UI */ }
        );
      } catch {
        // Best-effort: fall back to Auth profile only
        if (!cancelled) {
          setUserName(u.displayName || '');
          setProfilePicture(u.photoURL || '');
        }
      }
    });
    return () => {
      cancelled = true;
      try { unsubAuth(); } catch { /* ignore */ }
      if (stopProfile) { try { stopProfile(); } catch { /* ignore */ } }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <UserContext.Provider value={{
      profilePicture,
      setProfilePicture,
      userName,
      setUserName,
      language,
      setLanguage,
      notificationsEnabled,
      setNotificationsEnabled: async (enabled: boolean) => {
        _setNotificationsEnabled(enabled); // optimistic update for instant UX
        try {
          const u = auth.currentUser;
          if (u) {
            const { updateUserProfile } = await import('@/lib/user-profile');
            await updateUserProfile(u.uid, { notificationsEnabled: enabled } as any);
          }
        } catch {
          // non-fatal: snapshot will reconcile on next server state
        }
      }
    }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
