import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import SettingsHeader from '@/components/settings/SettingsHeader';
import SettingsNavigation from '@/components/settings/SettingsNavigation';
import AccountSettingsTab from '@/components/settings/account-settings/AccountSettingsTab';
import LanguageTab from '@/components/settings/language/LanguageTab';
import HelpSupportTab from '@/components/settings/help-support/HelpSupportTab';
import PrivacyTab from '@/components/settings/privacy/PrivacyTab';
import TermsTab from '@/components/settings/terms/TermsTab';
import { useUser } from '@/contexts/UserContext';
import { useTranslation } from '@/hooks/useTranslation';
import { useRouter } from 'next/router';

const SettingsPage: React.FC = () => {
  const { profilePicture, setProfilePicture, userName, setUserName } = useUser();
  const { t } = useTranslation();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('account');

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

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [formData, setFormData] = useState({
    fullName: userName,
    email: '',
    password: ''
  });

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

  const handleUpdateInformation = (values: any) => {
    console.log('Updating information:', values);

    if (values.fullName && values.fullName.trim()) {
      setUserName(values.fullName.trim());
    }

    setFormData(prev => ({
      ...prev,
      fullName: values.fullName || prev.fullName,
      email: values.email || prev.email
    }));
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

        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          setProfilePicture(result);
          console.log('Profile picture updated:', result);
        };
        reader.readAsDataURL(file);
      }
    };

    document.body.appendChild(input);
    input.click();
    document.body.removeChild(input);
  };

  const handleDeletePhoto = () => {
    setProfilePicture('/avatar.png');
    console.log('Profile picture deleted, reset to default');
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
            profilePicture={profilePicture}
            onInputChange={handleInputChange}
            onToggleNotifications={setNotificationsEnabled}
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
        memberSince="Member since February 2025"
        avatarSrc={profilePicture}
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
