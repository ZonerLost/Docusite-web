import React from 'react';
import Button from '@/components/ui/Button';
import { FlagIcon, FlagIconCode } from "react-flag-kit";
import { SelectedLanguageIcon } from '@/components/ui/Icons';
import { useUser } from '@/contexts/UserContext';
import { useTranslation } from '@/hooks/useTranslation';

interface Language {
  id: string;
  name: string;
  flagCode: FlagIconCode;
  code: string;
}

const languages: Language[] = [
  { id: 'en', name: 'English', flagCode: 'GB', code: 'en' },
  { id: 'de', name: 'German', flagCode: 'DE', code: 'de' },
  { id: 'zh', name: 'Chinese', flagCode: 'CN', code: 'zh' },
  { id: 'nl', name: 'Dutch', flagCode: 'NL', code: 'nl' },
  { id: 'fr', name: 'French', flagCode: 'FR', code: 'fr' },
  { id: 'ar', name: 'Arabic', flagCode: 'SA', code: 'ar' }
];

const LanguageTab: React.FC = () => {
  const { language, setLanguage } = useUser();
  const { t } = useTranslation();

  const handleLanguageChange = (languageId: string) => {
    setLanguage(languageId);
  };

  const handleUpdateInformation = () => {
    console.log('Language updated to:', language);
    // Language is already updated in context, so no additional action needed
  };

  const handleResetChanges = () => {
    setLanguage('en');
  };

  return (
    <div className="space-y-4 w-full lg:w-3/4">
      <div className="rounded-xl border border-border-gray shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          <div className="w-full lg:w-1/2 lg:pr-6">
            <h2 className="text-lg font-semibold text-black mb-2">{t('settings.changeLanguage')}</h2>
            <p className="text-text-gray text-sm">{t('settings.languageDesc')}</p>
          </div>
          <div className="w-full lg:w-1/2">
            <div className="space-y-3">
              {languages.map((lang) => (
                <div
                  key={lang.id}
                  onClick={() => handleLanguageChange(lang.id)}
                  className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors ${
                    language === lang.id
                      ? 'border-action bg-white'
                      : 'border-border-gray bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="rounded-sm overflow-hidden">
                      <FlagIcon code={lang.flagCode} size={24} />
                    </div>
                    <span className="text-sm font-medium text-black">{lang.name}</span>
                  </div>
                  <div className="flex items-center">
                    {language === lang.id && (
                      <SelectedLanguageIcon className="w-4 h-4" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
        <div className="w-full lg:w-1/2 lg:pr-6">
          {/* Empty space to align with other sections */}
        </div>
        <div className="w-full lg:w-1/2">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              variant="primary" 
              size="sm"
              onClick={handleUpdateInformation}
              className="w-full sm:w-auto"
            >
              {t('common.update')}
            </Button>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={handleResetChanges}
              className="w-full sm:w-auto"
            >
              {t('common.reset')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LanguageTab;