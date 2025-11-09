import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SettingsHeader from '@/components/settings/SettingsHeader';
import SettingsNavigation from '@/components/settings/SettingsNavigation';
import AccountSettingsTab from '@/components/settings/account-settings/AccountSettingsTab';
import LanguageTab from '@/components/settings/language/LanguageTab';
import HelpSupportTab from '@/components/settings/help-support/HelpSupportTab';
import PrivacyTab from '@/components/settings/privacy/PrivacyTab';
import TermsTab from '@/components/settings/terms/TermsTab';
import { useUser } from '@/context/UserContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useRouter } from 'next/router';
import { auth, storage } from '@/lib/firebase-client';
import { onAuthStateChanged, updateProfile, updateEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { niceError } from '@/services/authService';
import { passwordChangeSchema } from '@/lib/validation';
import { fetchProfile, updateUserProfile } from '@/lib/user-profile';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { toast } from 'react-hot-toast';

const SettingsPage: React.FC = () => {
  const { profilePicture, setProfilePicture, userName, setUserName, notificationsEnabled, setNotificationsEnabled } = useUser();
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('account');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [memberSince, setMemberSince] = useState<string>('');

  // Check hash on every render for immediate updates
  const currentHash = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
  if (currentHash && ['account', 'language', 'help', 'privacy', 'terms'].includes(currentHash) && currentHash !== activeTab) {
    setActiveTab(currentHash);
  } else if (!currentHash && activeTab !== 'account') {
    // If no hash is present, default to account tab
    setActiveTab('account');
  }

  // Handle URL hash navigation
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['account', 'language', 'help', 'privacy', 'terms'].includes(hash)) {
        setActiveTab(hash);
      } else if (!hash) {
        // If no hash, default to account tab
        setActiveTab('account');
      }
    };

    // Check initial hash on component mount
    handleHashChange();

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);

    // Also listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleHashChange);

    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('popstate', handleHashChange);
    };
  }, []);

  // Handle hash changes when component is already mounted (for same-page navigation)
  useEffect(() => {
    const handleHashUpdate = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && ['account', 'language', 'help', 'privacy', 'terms'].includes(hash)) {
        setActiveTab(hash);
      } else if (!hash) {
        // If no hash, default to account tab
        setActiveTab('account');
      }
    };

    // Check hash on every render to catch updates
    handleHashUpdate();

    // Also listen for custom events
    window.addEventListener('hashUpdated', handleHashUpdate);

    return () => {
      window.removeEventListener('hashUpdated', handleHashUpdate);
    };
  });

  // notificationsEnabled is managed by UserContext (live Firestore sync)
  const [formData, setFormData] = useState({
    fullName: userName,
    email: '',
    password: ''
  });

  // Load current user profile from Firestore and sync UI
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        router.replace('/login');
        return;
      }
      try {
        const doc = await fetchProfile(u.uid);
        if (doc) {
          setUserName(doc.fullName || doc.displayName || userName);
          setProfilePicture(doc.photoUrl || '');
          setFormData((prev) => ({ ...prev, fullName: doc.fullName || '', email: doc.email || '' }));
          // Prefer Firestore timestamp; fallback to auth metadata
          if ((doc as any).createdAt && typeof (doc as any).createdAt.toDate === 'function') {
            const d = (doc as any).createdAt.toDate() as Date;
            setMemberSince(`Member since ${d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}`);
          } else if (u.metadata?.creationTime) {
            const d = new Date(u.metadata.creationTime);
            setMemberSince(`Member since ${d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}`);
          }
        }
        setProfileLoaded(true);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.error('Failed to load user profile:', e);
        setProfileLoaded(true);
      }
    });
    return () => unsub();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs = [
    { id: 'account', label: t('settings.accountSettings') },
    { id: 'language', label: t('settings.language') },
    { id: 'help', label: t('settings.helpSupport') },
    { id: 'privacy', label: t('settings.privacyPolicy') },
    { id: 'terms', label: t('settings.termsConditions') }
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleUpdateInformation = async (values: any) => {
    const u = auth.currentUser;
    if (!u) {
      router.replace('/login');
      return;
    }

    const newName = (values.fullName || '').trim();
    const newEmail = (values.email || '').trim();
    const currentPassword: string = values.currentPassword || '';
    const newPasswordVal: string = values.newPassword || '';
    const confirmPassword: string = values.confirmPassword || '';

    try {
      // Update Auth profile (best effort)
      if (newName && newName !== u.displayName) {
        await updateProfile(u, { displayName: newName });
      }
      if (newEmail && newEmail !== (u.email || '')) {
        try {
          await updateEmail(u, newEmail);
        } catch (err: any) {
          // Most likely requires recent login; continue updating Firestore anyway
          // eslint-disable-next-line no-console
          console.warn('updateEmail failed; will still update Firestore:', err?.code || err);
          toast('Reauthentication required to change email. Please log in again.');
        }
      }

      // Change password flow (only if any password fields provided)
      const wantsPasswordChange = currentPassword.length > 0 || newPasswordVal.length > 0 || confirmPassword.length > 0;
      if (wantsPasswordChange) {
        // Validate input minimally using existing schema
        try {
          await passwordChangeSchema.validate(
            { currentPassword, newPassword: newPasswordVal, confirmPassword },
            { abortEarly: true }
          );
        } catch (e: any) {
          toast.error(e?.message || 'Please check your password inputs.');
          // Do not proceed with password update; continue with other updates
          throw e; // bubble to outer catch to show a single error toast and stop success toast
        }

        if (!u.email) {
          throw new Error('No email on account. Cannot reauthenticate.');
        }

        try {
          const cred = EmailAuthProvider.credential(u.email, currentPassword);
          await reauthenticateWithCredential(u, cred);
        } catch (e) {
          // Wrong current password or reauth failed
          toast.error(niceError(e, 'Incorrect current password.'));
          throw e;
        }

        try {
          await updatePassword(u, newPasswordVal);
          toast.success('Password updated successfully');
        } catch (e) {
          toast.error(niceError(e, 'Unable to update password.'));
          throw e;
        }
      }

      // Update Firestore user doc
      await updateUserProfile(u.uid, {
        fullName: newName,
        displayName: newName,
        email: newEmail,
      } as any);

      // Reflect in local UI state
      if (newName) setUserName(newName);
      setFormData((prev) => ({ ...prev, fullName: newName, email: newEmail }));
      // Only show success if we didn't already show password success exclusively
      toast.success('Profile updated successfully');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to update profile:', e);
      // Avoid double-toasting if password branch already displayed a specific error
      if (!(typeof e === 'object' && e && (e as any).code)) {
        toast.error('Failed to update profile');
      }
    }
  };

  const handleResetChanges = () => {
    setFormData({
      fullName: userName,
      email: '',
      password: ''
    });
  };

  const handleUploadPhoto = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        if (!file.type.startsWith('image/')) {
          alert('Please select a valid image file');
          return;
        }

        if (file.size > 5 * 1024 * 1024) {
          alert('Image size should be less than 5MB');
          return;
        }

        (async () => {
          const u = auth.currentUser;
          if (!u) {
            router.replace('/login');
            return;
          }
          try {
            // 1) Best-effort delete of existing photo from Storage (if any)
            try {
              const doc = await fetchProfile(u.uid);
              const oldUrl = (doc?.photoUrl || '').trim();
              const isStorageUrl = oldUrl.startsWith('gs://') || oldUrl.startsWith('https://firebasestorage.googleapis.com');
              if (isStorageUrl) {
                try {
                  // Convert download URL or gs:// URL to a storage path
                  const extractPath = (url: string): string | null => {
                    if (url.startsWith('gs://')) {
                      const idx = url.indexOf('/', 'gs://'.length);
                      return idx !== -1 ? url.slice(idx + 1) : null;
                    }
                    const match = url.match(/\/o\/([^?]+)/);
                    return match && match[1] ? decodeURIComponent(match[1]) : null;
                  };
                  const pathFromUrl = extractPath(oldUrl);
                  if (pathFromUrl) {
                    const oldRef = storageRef(storage, pathFromUrl);
                    await deleteObject(oldRef);
                  }
                } catch (delErr) {
                  // Non-fatal: proceed with upload even if delete fails
                  // eslint-disable-next-line no-console
                  console.warn('Failed to delete previous photo. Continuing with upload.', delErr);
                }
              }
            } catch (fetchErr) {
              // eslint-disable-next-line no-console
              console.warn('Could not verify existing photo URL from Firestore.', fetchErr);
            }

            // 2) Upload new photo
            const path = `users/${u.uid}/profile_${Date.now()}`;
            const ref = storageRef(storage, path);
            await uploadBytes(ref, file);
            const url = await getDownloadURL(ref);

            // 3) Update Auth and Firestore
            try { await updateProfile(u, { photoURL: url }); } catch {}
            await updateUserProfile(u.uid, { photoUrl: url } as any);

            // 4) Update local state and notify
            setProfilePicture(url);
            toast.success('Profile photo updated');
          } catch (err) {
            // eslint-disable-next-line no-console
            console.error('Photo upload failed:', err);
            toast.error('Failed to upload photo');
          }
        })();
      }
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

  const handleDeletePhoto = async () => {
    const u = auth.currentUser;
    if (!u) {
      router.replace('/login');
      return;
    }
    try {
      try { await updateProfile(u, { photoURL: undefined }); } catch {}
      await updateUserProfile(u.uid, { photoUrl: null } as any);
      setProfilePicture('/avatar.png');
      toast.success('Photo removed');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('Failed to remove photo:', e);
      toast.error('Failed to remove photo');
    }
  };

  const handleLogout = () => {
    router.push('/login');
  };

  // Updated tab change handler to update URL hash
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `#${tabId}`);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'account':
        return (
          <AccountSettingsTab
            formData={formData}
            notificationsEnabled={notificationsEnabled}
            profilePicture={profileLoaded ? (profilePicture || '/avatar.png') : undefined as any}
            onInputChange={handleInputChange}
            onToggleNotifications={(enabled) => { void setNotificationsEnabled(enabled); }}
            onUpdateInformation={handleUpdateInformation}
            onResetChanges={handleResetChanges}
            onUploadPhoto={handleUploadPhoto}
            onDeletePhoto={handleDeletePhoto}
          />
        );
      case 'language':
        return <LanguageTab />;
      case 'help':
        return <HelpSupportTab />;
      case 'privacy':
        return <PrivacyTab />;
      case 'terms':
        return <TermsTab />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-light-gray h-full flex flex-col">
      <SettingsHeader
        userName={userName}
        memberSince={memberSince || 'Member since'}
        avatarSrc={profileLoaded ? (profilePicture || '/avatar.png') : undefined}
        onLogout={handleLogout}
      />

      <SettingsNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange} // use updated handler here
      />

      <div className="flex-1 py-2 overflow-y-auto w-full">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default SettingsPage;
