import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UserContextType {
  profilePicture: string;
  setProfilePicture: (picture: string) => void;
  userName: string;
  setUserName: (name: string) => void;
  language: string;
  setLanguage: (language: string) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [profilePicture, setProfilePicture] = useState<string>('/avatar.png');
  const [userName, setUserName] = useState<string>('Kevin Backer');
  const [language, setLanguage] = useState<string>('en');

  return (
    <UserContext.Provider value={{
      profilePicture,
      setProfilePicture,
      userName,
      setUserName,
      language,
      setLanguage
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
