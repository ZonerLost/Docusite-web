import React, { useRef, useState } from "react";
import { useRouter } from "next/router";
import UserProfileDropdown from "./UserProfileDropdown";
import { BreadcrumbArrow, ChevronDownSmall } from "../ui/Icons";
import { MenuIcon } from "lucide-react";
import Avatar from "@/components/ui/Avatar";

import TopBarNotifications, {
  TopBarNotificationsHandle,
} from "@/components/layout/TopBarNotifications";

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
  onNotificationClick,
  onProfileClick,
  onMobileMenuToggle,
  userProfile = { name: "" },
}) => {
  const router = useRouter();

  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);

  const notificationsRef = useRef<TopBarNotificationsHandle>(null);

  // Generate breadcrumbs dynamically based on current route
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const path = router.pathname;
    const pathSegments = path.split("/").filter(Boolean);

    if (pathSegments.length === 0) {
      return [{ label: "Home", isActive: true }];
    }

    const crumbs: BreadcrumbItem[] = [];
    let currentPath = "";

    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;

      const label = segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      crumbs.push({
        label,
        isActive: isLast,
        href: isLast ? undefined : currentPath,
      });
    });

    return crumbs;
  };

  const currentBreadcrumbs = breadcrumbs || getBreadcrumbs();

  const handleProfileClick = () => {
    setIsProfileDropdownOpen((s) => !s);
    onProfileClick?.();
  };

  const openNotificationsFromProfile = () => {
    setIsProfileDropdownOpen(false);
    notificationsRef.current?.open();
  };

  return (
    <div className="bg-white px-2 sm:px-4 py-2">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
          {/* Left: Mobile Menu + Breadcrumbs */}
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <button
              onClick={onMobileMenuToggle}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-md transition-colors"
            >
              <MenuIcon className="w-5 h-5 text-gray-600" />
            </button>

            <div className="flex items-center space-x-1 sm:space-x-2 min-w-0 flex-1">
              {currentBreadcrumbs.map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <BreadcrumbArrow />}
                  {item.href ? (
                    <button
                      onClick={() => router.push(item.href!)}
                      className={`text-sm sm:text-base font-medium truncate hover:text-action transition-colors ${
                        item.isActive && currentBreadcrumbs.length > 1
                          ? "text-action"
                          : item.isActive && currentBreadcrumbs.length === 1
                          ? "text-black font-bold"
                          : "text-gray-500"
                      }`}
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span
                      className={`text-sm sm:text-base font-medium truncate ${
                        item.isActive && currentBreadcrumbs.length > 1
                          ? "text-action"
                          : item.isActive && currentBreadcrumbs.length === 1
                          ? "text-black font-bold"
                          : "text-gray-500"
                      }`}
                    >
                      {item.label}
                    </span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Right: Notifications + Profile */}
          <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
            {/* Notifications (extracted) */}
            <TopBarNotifications
              ref={notificationsRef}
              onOpen={() => {
                setIsProfileDropdownOpen(false);
                onNotificationClick?.();
              }}
            />

            {/* Profile */}
            <div className="relative flex items-center space-x-1 sm:space-x-2">
              <Avatar
                src={userProfile.avatar}
                alt={userProfile.name}
                name={userProfile.name}
                size="lg"
              />

              <span className="text-sm sm:text-base font-semibold text-black hidden sm:block">
                {userProfile.name}
              </span>

              <button
                onClick={handleProfileClick}
                className="text-black hover:text-action transition-colors"
              >
                <ChevronDownSmall className="sm:w-6 sm:h-6" />
              </button>

              <UserProfileDropdown
                isOpen={isProfileDropdownOpen}
                onClose={() => setIsProfileDropdownOpen(false)}
                userName={userProfile.name}
                userAvatar={userProfile.avatar}
                onNotificationClick={openNotificationsFromProfile}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
