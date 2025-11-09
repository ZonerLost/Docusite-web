import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { MenuIcon } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { subscribeProjectsForUser, ProjectCardUI } from '@/lib/projects';
import { ChatMessageDoc, subscribeProjectMessages, sendTextMessage, sendFileMessage, markAllAsRead, deleteProjectMessage } from '@/lib/chat';
import { toggleMessageReaction } from '@/lib/chat';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';

const ChatSidebar = dynamic(() => import('@/components/messages/ChatSidebar'), { ssr: false });
const ChatArea = dynamic(() => import('@/components/messages/ChatArea'), { ssr: false });

interface Message {
  id: string;
  type: 'incoming' | 'outgoing' | 'date';
  content: string;
  timestamp: string;
  avatar?: string;
  isRead?: boolean;
  senderName?: string;
  messageType?: 'text' | 'image' | 'file';
  fileUrl?: string | null;
  fileName?: string | null;
  replyTo?: string | null;
  replyText?: string | null;
  replySender?: string | null;
  reactions?: Record<string, string[]>;
}

export default function Messages() {
  const router = useRouter();
  const [selectedChat, setSelectedChat] = useState('');
  const [showChatSidebar, setShowChatSidebar] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [projects, setProjects] = useState<ProjectCardUI[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [replyCtx, setReplyCtx] = useState<null | { id: string; text: string; sender: string }>(null);
  const unsubRef = useRef<null | (() => void)>(null);
  // Track last activity time per chat locally to enable instant sorting
  const [chatActivityTs, setChatActivityTs] = useState<Record<string, number>>({});

  // Subscribe only to chats (projects) where the current user is a member
  useEffect(() => {
    let stop: null | (() => void) = null;
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      if (stop) { try { stop(); } catch {} stop = null; }
      if (!u) {
        setProjects([]);
        return;
      }
      stop = subscribeProjectsForUser(u.uid, u.email || null, (items) => setProjects(items));
    });
    return () => { unsubAuth(); if (stop) try { stop(); } catch {} };
  }, []);

  const handleChatSelect = (chatId: string) => {
    setSelectedChat(chatId);
    setShowChatSidebar(false); // Close sidebar after selecting chat
    // push to route query for deep linkability
    try { router.replace({ pathname: '/dashboard/messages', query: { projectId: chatId } }, undefined, { shallow: true }); } catch {}
  };

  // (IDs/timestamps now come from Firestore)

  // Handle sending new messages
  const handleSendMessage = async (
    payload: { type: 'text'; content: string; replyTo?: string | null; replyText?: string | null; replySender?: string | null } | { type: 'image' | 'file'; file: File }
  ) => {
    if (!selectedChat || !projects.some((p) => p.id === selectedChat)) {
      toast.error('Select a project chat first');
      return;
    }
    setIsSending(true);
    try {
      if (payload.type === 'text') {
        const content = (payload.content || '').trim();
        if (!content) return;
        const reply = replyCtx ? { replyTo: replyCtx.id, replyText: replyCtx.text, replySender: replyCtx.sender } : undefined;
        await sendTextMessage(selectedChat, content, reply);
        setReplyCtx(null);
      } else {
        const isImage = payload.type === 'image';
        const id = toast.loading(isImage ? 'Uploading image…' : 'Uploading file…');
        await sendFileMessage(selectedChat, payload.file, isImage ? 'image' : 'file', ({ progress, state }) => {
          toast.loading(`${isImage ? 'Uploading image' : 'Uploading file'}… ${progress}%`, { id });
          if (state === 'success') toast.success('Upload complete', { id });
          if (state === 'error') toast.error('Upload failed', { id });
        });
      }
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.error('send message failed', e);
      toast.error('Failed to send');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!selectedChat || !messageId) return;
    try {
      await deleteProjectMessage(selectedChat, messageId);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('delete message failed', e);
    }
  };

  const handleReactMessage = async (messageId: string, emoji: string) => {
    if (!selectedChat || !messageId || !emoji) return;
    try {
      await toggleMessageReaction(selectedChat, messageId, emoji);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error('toggle reaction failed', e);
    }
  };

  // Map Firestore docs to UI messages
  const mapDocToUi = (d: { id: string; data: ChatMessageDoc }, myUid: string): Message => {
    const ts = (() => {
      try {
        const dt = (d.data as any)?.sentAt?.toDate?.();
        if (!dt) return '';
        const hours = dt.getHours();
        const minutes = dt.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'pm' : 'am';
        const displayHours = hours % 12 || 12;
        return `${displayHours}:${minutes} ${ampm}`;
      } catch { return ''; }
    })();
    const outgoing = d.data.userId === myUid;
    const readBy = Array.isArray(d.data.readBy) ? d.data.readBy : [];
    return {
      id: d.id,
      type: outgoing ? 'outgoing' : 'incoming',
      content: d.data.message || (d.data.fileName || ''),
      timestamp: ts,
      avatar: (d.data.photoUrl || '') || undefined,
      isRead: outgoing ? readBy.length > 1 : true,
      messageType: d.data.messageType,
      fileUrl: d.data.fileUrl,
      fileName: d.data.fileName,
      senderName: outgoing ? undefined : d.data.sentBy,
      replyTo: (d.data as any)?.replyTo || null,
      replyText: (d.data as any)?.replyText || null,
      replySender: (d.data as any)?.replySender || null,
      reactions: (d.data as any)?.reactions || undefined,
    };
  };

  // Subscribe to messages for the selected project (live updates), but only if the user is a member
  useEffect(() => {
    if (unsubRef.current) {
      try { unsubRef.current(); } catch {}
      unsubRef.current = null;
    }
    if (!selectedChat) return;
    // Ensure selected chat is one of the user's chats
    if (!projects.some((p) => p.id === selectedChat)) return;
    const u = auth.currentUser;
    if (!u) return;
    unsubRef.current = subscribeProjectMessages(selectedChat, async (docs) => {
      setMessages(docs.map((d) => mapDocToUi(d, u.uid)));
      // Update local activity timestamp for sorting (use last message's sentAt)
      try {
        const last = docs[docs.length - 1];
        const ts = (last?.data as any)?.sentAt?.toDate?.()?.getTime?.();
        if (typeof ts === 'number' && ts > 0) {
          setChatActivityTs((prev) => {
            const curr = prev[selectedChat] || 0;
            if (ts === curr) return prev;
            return { ...prev, [selectedChat]: ts };
          });
        }
      } catch {}
      // Mark as read best-effort on open/update
      try { await markAllAsRead(selectedChat, u.uid, 200); } catch {}
    });
    return () => {
      if (unsubRef.current) try { unsubRef.current(); } catch {}
      unsubRef.current = null;
    };
  }, [selectedChat, projects]);

  // Initialize selectedChat from route query
  useEffect(() => {
    const pid = (router.query?.projectId as string) || '';
    if (pid) setSelectedChat(pid);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.query?.projectId]);

  // If deep-linked to a chat the user is not a member of, clear selection
  useEffect(() => {
    if (selectedChat && !projects.some((p) => p.id === selectedChat)) {
      setSelectedChat('');
    }
  }, [projects, selectedChat]);

  return (
    <div className="h-full overflow-hidden bg-gray-50 relative">
      {/* Floating Sidebar Overlay */}
      {showChatSidebar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setShowChatSidebar(false)} />
      )}
     
      {/* Desktop Layout */}
      <div className="flex h-full">
        {/* Floating Chat Sidebar */}
        <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out ${
          showChatSidebar ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          <div className="w-80 bg-white border-r border-border-gray flex flex-col h-full">
            <ChatSidebar 
              selectedChat={selectedChat}
              chats={useMemo(() => {
                // Sort by latest activity (desc). If equal, keep original order (stable sort).
                const items = projects.slice().sort((a, b) => {
                  const ta = Math.max(a.lastUpdatedTs || 0, chatActivityTs[a.id] || 0);
                  const tb = Math.max(b.lastUpdatedTs || 0, chatActivityTs[b.id] || 0);
                  if (tb !== ta) return tb - ta;
                  return 0;
                });
                return items.map((p) => ({
                  id: p.id,
                  name: p.name,
                  avatar: p.name?.[0]?.toUpperCase?.() || 'P',
                  lastMessage: p.assignedTo || '',
                  timestamp: p.lastUpdatedTime || '',
                  isRead: true,
                  hasUnread: false,
                }));
              }, [projects, chatActivityTs])}
              onChatSelect={handleChatSelect}
              onClose={() => setShowChatSidebar(false)}
            />
          </div>
        </div>
        
        {/* Chat Area - Full height */}
        <div className="flex-1 flex flex-col h-full">
        {selectedChat ? (
          <ChatArea 
            selectedChat={selectedChat} 
            messages={messages}
            onSendMessage={handleSendMessage}
            disabled={isSending}
            projectName={projects.find(p => p.id === selectedChat)?.name || ''}
            onDeleteMessage={handleDeleteMessage}
            onReplyMessage={(m) => setReplyCtx(m)}
            replyContext={replyCtx}
            onCancelReply={() => setReplyCtx(null)}
            onReactMessage={handleReactMessage}
            onBackToChats={() => {
              setSelectedChat('');
              setShowChatSidebar(true); // Show sidebar when going back
            }}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white h-full w-full">
            <div className="text-center max-w-md mx-auto px-4">
              {projects.length === 0 ? (
                <>
                  <h3 className="text-lg font-semibold text-gray-500 mb-2">No active chats found.</h3>
                  <p className="text-sm text-gray-400 mb-4">You are not a member of any group.</p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-semibold text-gray-500 mb-2">Select a chat to start messaging</h3>
                  <p className="text-sm text-gray-400 mb-4">Choose a conversation from the sidebar</p>
                </>
              )}
               {/* Open Sidebar Button - Only visible on mobile when sidebar is closed */}
               {!showChatSidebar && (
                 <button
                   onClick={() => setShowChatSidebar(true)}
                   className="lg:hidden px-4 py-2 bg-action text-white rounded-lg hover:bg-action/90 transition-colors flex items-center space-x-2 mx-auto"
                 >
                   <MenuIcon className="w-4 h-4" />
                   <span>Open Chats</span>
                 </button>
               )}
            </div>
          </div>
         )}
         </div>
       </div>
    </div>
  );
}
