import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import NotificationDropdown from './NotificationDropdown';
import UserProfileDropdown from './UserProfileDropdown';
import { BreadcrumbArrow, SearchIcon, NotificationIcon, ChevronDownSmall } from '../ui/Icons';
import { MenuIcon } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { useTranslation } from '@/hooks/useTranslation';

interface BreadcrumbItem {
    label: string;
    isActive: boolean;
    href?: string;
}

interface TopBarProps {
    breadcrumbs?: BreadcrumbItem[];
    onSearch?: (query: string) => void;
    onNotificationClick?: () => void;
    onProfileClick?: () => void;
    onMobileMenuToggle?: () => void;
    userProfile?: {
        name: string;
        avatar?: string;
    };
}

const TopBar: React.FC<TopBarProps> = ({
    breadcrumbs,
    onSearch,
    onNotificationClick,
    onProfileClick,
    onMobileMenuToggle,
    userProfile = { name: 'Kevin Backer' }
}) => {
    const router = useRouter();
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState('');
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);
    const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
    const [notifications, setNotifications] = useState([
        {
            id: 1,
            icon: 'A',
            title: 'Account Created!',
            description: 'Your account has been successfully created.',
            time: '12 mins ago',
            isUnread: true
        },
        {
            id: 2,
            icon: 'I',
            title: 'Image Added',
            description: 'Your captured image has been uploaded successfully.',
            time: '12 mins ago',
            isUnread: true
        },
        {
            id: 3,
            icon: 'P',
            title: 'Project Invitation',
            description: 'You have received a project invitation from admin.',
            time: '12 mins ago',
            isUnread: false,
            action: 'Tap to view'
        }
    ]);
    const notificationRef = useRef<HTMLDivElement>(null);

    // Generate breadcrumbs dynamically based on current route
    const getBreadcrumbs = (): BreadcrumbItem[] => {
        const path = router.pathname;
        const pathSegments = path.split('/').filter(segment => segment !== '');
        
        // If no segments, return home
        if (pathSegments.length === 0) {
            return [{ label: 'Home', isActive: true }];
        }
        
        // Build breadcrumbs dynamically
        const breadcrumbs: BreadcrumbItem[] = [];
        let currentPath = '';
        
        pathSegments.forEach((segment, index) => {
            currentPath += `/${segment}`;
            const isLast = index === pathSegments.length - 1;
            
            // Convert segment to readable label automatically
            const label = segment
                .split('-')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ');
            
            breadcrumbs.push({
                label,
                isActive: isLast,
                href: isLast ? undefined : currentPath
            });
        });
        
        return breadcrumbs;
    };

    const currentBreadcrumbs = breadcrumbs || getBreadcrumbs();

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        onSearch?.(e.target.value);
    };

    const handleNotificationClick = () => {
        setIsNotificationOpen(!isNotificationOpen);
        setIsProfileDropdownOpen(false); // Close profile dropdown when opening notifications
        onNotificationClick?.();
    };

    const handleProfileClick = () => {
        setIsProfileDropdownOpen(!isProfileDropdownOpen);
        setIsNotificationOpen(false); // Close notification dropdown when opening profile
        onProfileClick?.();
    };

    const handleNotificationItemClick = (notificationId: number) => {
        setNotifications(prevNotifications => 
            prevNotifications.map(notification => 
                notification.id === notificationId 
                    ? { ...notification, isUnread: false }
                    : notification
            )
        );
    };

    // Close notification dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setIsNotificationOpen(false);
            }
        };

        if (isNotificationOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isNotificationOpen]);

    return (
        <div className="bg-white px-2 sm:px-4 py-2">
            <div className="max-w-7xl mx-auto">
                {/* Mobile: Two rows layout */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                    {/* Mobile Menu Button + Breadcrumb Navigation */}
                    <div className="flex items-center space-x-2 min-w-0 flex-1">
                        {/* Mobile Menu Button */}
                        <button
                            onClick={onMobileMenuToggle}
                            className="lg:hidden p-2 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            <MenuIcon className="w-5 h-5 text-gray-600" />
                        </button>
                        
                        {/* Breadcrumb Navigation */}
                        <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1">
                            {currentBreadcrumbs.map((item, index) => (
                                <React.Fragment key={index}>
                                    {index > 0 && (
                                        <BreadcrumbArrow />
                                    )}
                                    {item.href ? (
                                        <button
                                            onClick={() => router.push(item.href!)}
                                            className={`text-sm sm:text-base font-medium truncate hover:text-action transition-colors ${
                                                item.isActive && currentBreadcrumbs.length > 1
                                                    ? 'text-action'
                                                    : item.isActive && currentBreadcrumbs.length === 1
                                                        ? 'text-black font-bold'
                                                        : 'text-gray-500'
                                            }`}
                                        >
                                            {item.label}
                                        </button>
                                    ) : (
                                        <span
                                            className={`text-sm sm:text-base font-medium truncate ${item.isActive && currentBreadcrumbs.length > 1
                                                    ? 'text-action'
                                                    : item.isActive && currentBreadcrumbs.length === 1
                                                        ? 'text-black font-bold'
                                                        : 'text-gray-500'
                                                }`}
                                        >
                                            {item.label}
                                        </span>
                                    )}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>

                    {/* Right side items */}
                    <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                        {/* Search Bar */}
                        <div className="relative flex-1 sm:flex-none">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="text-text-gray" />
                            </div>
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={handleSearchChange}
                                placeholder={t('common.search')}
                                 className="block w-full sm:w-80 pl-10 pr-3 h-12 border bg-light-gray border-border-gray rounded-xl text-base text-black placeholder-placeholder-gray placeholder:font-medium focus:outline-none"
                            />
                        </div>

                        {/* Notification Bell */}
                        <div className="relative" ref={notificationRef}>
                            <button
                                onClick={handleNotificationClick}
                                className="h-12 w-12 bg-light-gray border border-border-gray rounded-full text-gray-600 transition-colors flex items-center justify-center"
                            >
                                <NotificationIcon className="sm:w-5 sm:h-5" />
                                {/* Unread notification indicator */}
                                {notifications.some(n => n.isUnread) && (
                                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                                        <span className="text-xs text-white font-bold">
                                            {notifications.filter(n => n.isUnread).length}
                                        </span>
                                    </div>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            <NotificationDropdown
                                isOpen={isNotificationOpen}
                                notifications={notifications}
                                onClose={() => setIsNotificationOpen(false)}
                                onNotificationClick={handleNotificationItemClick}
                            />
                        </div>

                        {/* User Profile */}
                        <div className="relative flex items-center space-x-1 sm:space-x-2">
                            {/* Avatar */}
                            <Avatar
                                src={userProfile.avatar || "/avatar.png"}
                                alt={userProfile.name}
                                size="lg"
                            />

                            {/* User Name */}
                            <span className="text-sm sm:text-base font-semibold text-black hidden sm:block">
                                {userProfile.name}
                            </span>

                            {/* Dropdown Chevron */}
                            <button
                                onClick={handleProfileClick}
                                className="text-black hover:text-action transition-colors"
                            >
                                <ChevronDownSmall className="sm:w-6 sm:h-6" />
                            </button>

                            {/* User Profile Dropdown */}
                            <UserProfileDropdown
                                isOpen={isProfileDropdownOpen}
                                onClose={() => setIsProfileDropdownOpen(false)}
                                userName={userProfile.name}
                                userAvatar={userProfile.avatar}
                                onNotificationClick={handleNotificationClick}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopBar;
