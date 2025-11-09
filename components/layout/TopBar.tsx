import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import NotificationDropdown from "./NotificationDropdown";
import UserProfileDropdown from "./UserProfileDropdown";
import {
  BreadcrumbArrow,
  SearchIcon,
  NotificationIcon,
  ChevronDownSmall,
} from "../ui/Icons";
import { MenuIcon } from "lucide-react";
import Avatar from "@/components/ui/Avatar";
import { useTranslation } from "@/hooks/useTranslation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase-client";
import { ensureUserDoc } from "@/lib/ensure-user-doc";
import {
  subscribeUserNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  NotificationUI,
  acceptInviteFromNotification,
  declineInviteNotification,
  getInviteSummary,
  InviteSummary,
} from "@/lib/notifications";
import { toast } from "react-hot-toast";
import { useClickOutside } from "@/hooks/useClickOutside";

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
  userProfile = { name: "" },
}) => {
  const router = useRouter();
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationUI[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);
  const [invitePreview, setInvitePreview] = useState<{
    open: boolean;
    loading: boolean;
    notifId?: string;
    inviteId?: string;
    projectId?: string;
    summary?: InviteSummary | null;
  }>({ open: false, loading: false });
  const [acceptingInvite, setAcceptingInvite] = useState(false);

  // Subscribe to Firestore notifications for current user (by email)
  useEffect(() => {
    let stop: null | (() => void) = null;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (stop) {
        try {
          stop();
        } catch {}
        stop = null;
      }
      if (u?.email) {
        try {
          await ensureUserDoc();
        } catch {
          /* non-fatal */
        }
        stop = subscribeUserNotifications(u.email, setNotifications);
      } else {
        setNotifications([]);
      }
    });
    return () => {
      unsub();
      if (stop)
        try {
          stop();
        } catch {}
    };
  }, []);

  // Generate breadcrumbs dynamically based on current route
  const getBreadcrumbs = (): BreadcrumbItem[] => {
    const path = router.pathname;
    const pathSegments = path.split("/").filter((segment) => segment !== "");

    // If no segments, return home
    if (pathSegments.length === 0) {
      return [{ label: "Home", isActive: true }];
    }

    // Build breadcrumbs dynamically
    const breadcrumbs: BreadcrumbItem[] = [];
    let currentPath = "";

    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === pathSegments.length - 1;

      // Convert segment to readable label automatically
      const label = segment
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");

      breadcrumbs.push({
        label,
        isActive: isLast,
        href: isLast ? undefined : currentPath,
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

  const handleNotificationItemClick = async (notificationId: string) => {
    const user = auth.currentUser;
    setIsNotificationOpen(false);
    const n = notifications.find((n) => n.id === notificationId);
    if (n?.type === "project_upload") {
      if (user?.email) {
        try {
          await markNotificationRead(user.email, notificationId);
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("Failed to mark notification as read:", error);
          // Don't block UI for permission errors
        }
      }
      if (n.projectId) {
        try {
          const { checkProjectPermission } = await import("@/lib/permissions");
          const ok = await checkProjectPermission(n.projectId);
          if (!ok) return;
          router.push({
            pathname: "/dashboard/project-details",
            query: { projectId: n.projectId },
          });
        } catch {
          toast.error("Project not found or inaccessible");
        }
      } else {
        toast.error("Project not found or inaccessible");
      }
      return;
    }
    if (n?.type === "project_invite") {
      if (!user?.email || !n.inviteId) return;

      setInvitePreview({
        open: true,
        loading: true,
        notifId: notificationId,
        inviteId: n.inviteId,
        projectId: n.projectId,
      });

      try {
        // Only show the modal for pending invites
        const s = await getInviteSummary(user.email, n.inviteId, { pendingOnly: true });

        if (!s) {
          // Already accepted/declined/expired — remove the obsolete notification and bail
          try { await markNotificationRead(user.email, notificationId); } catch {}
          setInvitePreview({ open: false, loading: false });
          toast.success('This invite has already been handled.');
          return;
        }

        setInvitePreview((prev) => ({ ...prev, loading: false, summary: s }));
      } catch {
        setInvitePreview((prev) => ({ ...prev, loading: false, summary: null }));
      }

      return;
    }
  };

  const onAcceptInvite = async () => {
    const user = auth.currentUser;
    const ctx = invitePreview;
    if (!user?.email || !ctx.notifId) return;
    if (acceptingInvite) return;
    try {
      setAcceptingInvite(true);
      const res = await acceptInviteFromNotification({
        email: user.email,
        notificationId: ctx.notifId,
      });
      if (res === "already-member")
        toast.success("You are already a member of this project.");
      else toast.success("Invitation accepted successfully.");
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("acceptInvite failed", e);
      if (e?.code === "permission-denied") {
        toast.error("Permission denied. Please try logging out and back in.");
      } else if (/invalid|expired/i.test(String(e?.message || ""))) {
        toast.error("Invalid or expired invitation.");
      } else {
        toast.error(e?.message || "Unable to accept invite");
      }
    } finally {
      setAcceptingInvite(false);
      setInvitePreview({ open: false, loading: false });
    }
  };

  const onDeclineInvite = async () => {
    const user = auth.currentUser;
    const ctx = invitePreview;
    if (!user?.email || !ctx.inviteId) return;
    try {
      await declineInviteNotification(user.email, ctx.inviteId, ctx.notifId);
      toast.success("Invitation declined");
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error("declineInvite failed", e);
      toast.error(e?.message || "Unable to decline invite");
    } finally {
      setInvitePreview({ open: false, loading: false });
    }
  };

  const handleMarkAllRead = async () => {
    const user = auth.currentUser;
    if (user?.email) {
      try {
        await markAllNotificationsRead(user.email);
      } catch {}
    }
  };

  useClickOutside(notificationRef, () => setIsNotificationOpen(false), {
    enabled: isNotificationOpen,
  });

  return (
    <>
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

            {/* Right side items */}
            <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
              {/* Search Bar */}
              {/* <div className="relative flex-1 sm:flex-none">
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
                        </div> */}

              {/* Notification Bell */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={handleNotificationClick}
                  className="h-12 w-12 bg-light-gray border border-border-gray rounded-full text-gray-600 transition-colors flex items-center justify-center"
                >
                  <NotificationIcon className="sm:w-5 sm:h-5" />
                  {/* Unread notification indicator */}
                  {notifications.some((n) => n.isUnread) && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                      <span className="text-xs text-white font-bold">
                        {notifications.filter((n) => n.isUnread).length}
                      </span>
                    </div>
                  )}
                </button>

                {/* Notification Dropdown */}
                <NotificationDropdown
                  isOpen={isNotificationOpen}
                  notifications={notifications.map((n) => ({
                    id: n.id,
                    title: n.title,
                    description: n.description,
                    time: n.timeText,
                    isUnread: n.isUnread,
                    type: n.type,
                    inviteId: n.inviteId,
                    projectId: n.projectId,
                  }))}
                  onClose={() => setIsNotificationOpen(false)}
                  onNotificationClick={handleNotificationItemClick}
                  onMarkAllRead={handleMarkAllRead}
                />
              </div>

              {/* User Profile */}
              <div className="relative flex items-center space-x-1 sm:space-x-2">
                {/* Avatar */}
                <Avatar
                  src={userProfile.avatar}
                  alt={userProfile.name}
                  name={userProfile.name}
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
      {invitePreview.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-sm border border-border-dark-gray p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-black">
                Project Invitation
              </span>
              <button
                onClick={() =>
                  setInvitePreview({ open: false, loading: false })
                }
                className="text-gray-600 hover:text-black"
              >
                ✕
              </button>
            </div>
            {invitePreview.loading ? (
              <div className="text-sm text-text-gray">Loading…</div>
            ) : (
              <div className="space-y-2">
                <div>
                  <div className="text-xs text-placeholder-gray">Project</div>
                  <div className="text-sm text-black">
                    {invitePreview.summary?.projectTitle || "Untitled project"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-placeholder-gray">
                    Invited by
                  </div>
                  <div className="text-sm text-black">
                    {invitePreview.summary?.invitedByName ||
                      invitePreview.summary?.invitedByEmail ||
                      "Unknown"}
                  </div>
                  {invitePreview.summary?.invitedByEmail && (
                    <div className="text-xs text-text-gray">
                      {invitePreview.summary.invitedByEmail}
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={onDeclineInvite}
                    className="px-3 py-1 text-xs rounded-md border border-border-gray text-black hover:bg-gray-50"
                  >
                    Decline
                  </button>
                  <button
                    onClick={onAcceptInvite}
                    disabled={acceptingInvite}
                    className={`px-3 py-1 text-xs rounded-md bg-action text-white hover:bg-action/90 ${acceptingInvite ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    {acceptingInvite ? 'Accepting…' : 'Accept'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;
