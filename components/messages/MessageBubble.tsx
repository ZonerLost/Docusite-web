import React from "react";
import dynamic from 'next/dynamic';
import type { EmojiClickData } from 'emoji-picker-react';
import { CheckIcon } from "@/components/ui/Icons";
import Avatar from "@/components/ui/Avatar";

interface Message {
  id: string;
  type: "incoming" | "outgoing" | "date";
  content: string;
  timestamp: string;
  avatar?: string;
  isRead?: boolean;
  senderName?: string;
  // Extended for media/file support
  messageType?: 'text' | 'image' | 'file';
  fileUrl?: string | null;
  fileName?: string | null;
  replyTo?: string | null;
  replyText?: string | null;
  replySender?: string | null;
  reactions?: Record<string, string[]>;
}

interface MessageBubbleProps {
  message: Message;
  onDelete?: (messageId: string) => Promise<void> | void;
  onReply?: (payload: { id: string; text: string; sender: string }) => void;
  onReact?: (messageId: string, emoji: string) => Promise<void> | void;
}

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, onDelete, onReply, onReact }) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [pickerPos, setPickerPos] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const longPressTimer = React.useRef<number | null>(null);

  if (message.type === "date") {
    return (
      <div className="flex justify-center">
        <div className="bg-light-gray text-text-gray px-3 py-1 rounded-lg text-[12px]">
          {message.content}
        </div>
      </div>
    );
  }

  const isOutgoing = message.type === "outgoing";
  const canDelete = isOutgoing && typeof onDelete === 'function';
  const canReply = typeof onReply === 'function';
  const canReact = typeof onReact === 'function';

  const openMenuAt = (x: number, y: number) => {
    if (!canDelete && !canReply && !canReact) return;
    try {
      const MENU_W = 160;
      const MENU_H = 44;
      const padding = 8;
      const maxX = Math.max(0, (window?.innerWidth || 0) - MENU_W - padding);
      const maxY = Math.max(0, (window?.innerHeight || 0) - MENU_H - padding);
      const nx = Math.min(Math.max(x + 4, padding), maxX);
      const ny = Math.min(Math.max(y + 4, padding), maxY);
      setMenuPos({ x: nx, y: ny });
    } catch {
      setMenuPos({ x: x + 4, y: y + 4 });
    }
    setMenuOpen(true);
  };

  const handleContextMenu: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!canDelete && !canReply && !canReact) return;
    e.preventDefault();
    openMenuAt(e.clientX, e.clientY);
  };

  const onTouchStart: React.TouchEventHandler<HTMLDivElement> = (e) => {
    if (!canDelete && !canReply && !canReact) return;
    if (longPressTimer.current) window.clearTimeout(longPressTimer.current);
    const touch = e.touches[0];
    longPressTimer.current = window.setTimeout(() => {
      openMenuAt(touch.clientX, touch.clientY);
    }, 500);
  };

  const clearLongPress = () => {
    if (longPressTimer.current) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleConfirmDelete = async () => {
    try { await onDelete?.(message.id); } catch (e) { /* eslint-disable-next-line no-console */ console.error('delete message failed', e); }
    setConfirmOpen(false);
    setMenuOpen(false);
  };

  const handleReply = () => {
    if (!canReply) return;
    const text = message.content || '';
    const sender = message.senderName || 'You';
    onReply?.({ id: message.id, text, sender });
    setMenuOpen(false);
  };

  const openPickerAt = (x: number, y: number) => {
    if (!canReact) return;
    const W = 320; const H = 360; const pad = 8;
    const maxX = Math.max(0, (window?.innerWidth || 0) - W - pad);
    const maxY = Math.max(0, (window?.innerHeight || 0) - H - pad);
    const nx = Math.min(Math.max(x, pad), maxX);
    const ny = Math.min(Math.max(y, pad), maxY);
    setPickerPos({ x: nx, y: ny });
    setPickerOpen(true);
  };

  const handleReact = () => {
    if (!canReact) return;
    openPickerAt(menuPos.x, menuPos.y + 8);
    setMenuOpen(false);
  };

  const onEmojiClick = async (emojiData: EmojiClickData) => {
    try { await onReact?.(message.id, emojiData.emoji); } catch (e) { /* eslint-disable-next-line no-console */ console.error('reaction failed', e); }
    setPickerOpen(false);
  };

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMenuOpen(false); setConfirmOpen(false); }
    };
    if (menuOpen || confirmOpen) {
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [menuOpen, confirmOpen]);

  React.useEffect(() => () => clearLongPress(), []);

  return (
    <div
      className={`flex ${isOutgoing ? "justify-end" : "justify-start"} group relative`}
      onContextMenu={handleContextMenu}
      onTouchStart={onTouchStart}
      onTouchEnd={clearLongPress}
      onTouchCancel={clearLongPress}
    >
      <div className={`flex flex-col ${isOutgoing ? "items-end" : "items-start"} max-w-xs lg:max-w-md relative`}>
        {/* Sender Name for incoming messages */}
        {!isOutgoing && message.senderName && (
          <span className="text-xs text-text-gray mb-1 font-medium">{message.senderName}</span>
        )}
        
        {/* Message Bubble */}
        <div
          className={`px-3 py-2 sm:px-4 sm:py-2 rounded-xl ${
            isOutgoing ? "bg-action text-white" : "bg-light-gray text-black"
          }`}
        >
          {message.replyText && message.replySender ? (
            <p className={`text-[11px] mb-1 ${isOutgoing ? 'text-white/80' : 'text-text-gray'}`}>
              Replying to {message.replySender}: {message.replyText}
            </p>
          ) : null}
          {message.messageType === 'image' && message.fileUrl ? (
            <img src={message.fileUrl} alt={message.fileName || 'image'} className="max-w-[220px] sm:max-w-xs rounded-lg" />
          ) : message.messageType === 'file' && message.fileUrl ? (
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noreferrer"
              className={`underline break-all ${isOutgoing ? 'text-white' : 'text-action'}`}
            >
              {message.fileName || 'Download file'}
            </a>
          ) : (
            <p className="text-sm">{message.content}</p>
          )}
        </div>

        {/* Hover react trigger */}
        {canReact && (
          <button
            type="button"
            className={`absolute -top-2 ${isOutgoing ? 'right-0' : 'left-0'} bg-white/90 border border-border-gray rounded-full px-2 py-0.5 text-xs opacity-0 group-hover:opacity-100 transition`}
            onClick={(e) => { e.stopPropagation(); openPickerAt((e as any).clientX, (e as any).clientY); }}
            aria-label="Add reaction"
          >
            
          </button>
        )}

        {/* Reactions summary below message */}
        {message.reactions && Object.keys(message.reactions).length > 0 && (
          <div className={`mt-1 text-xs ${isOutgoing ? 'text-white/90' : 'text-text-gray'}`}>
            {Object.entries(message.reactions)
              .filter(([_, arr]) => Array.isArray(arr) && arr.length > 0)
              .map(([emo, arr]) => `${emo} ${arr.length}`)
              .join('  ')}
          </div>
        )}

        {/* Timestamp, Check Icon, and Avatar */}
        <div className={`flex items-center space-x-1 mt-1 gap-1 ${isOutgoing ? " space-x-reverse" : "flex-row-reverse"}`}>
          <div className="flex items-center space-x-1">
          <span className="text-xs text-placeholder-gray">
            {message.timestamp}
          </span>
            {isOutgoing && (
              <CheckIcon className={`w-4 h-4 ${message.isRead ? 'text-action' : 'text-placeholder-gray'}`} />
            )}
          </div>
          <Avatar
            src={message.avatar || undefined}
            alt={message.senderName || 'User'}
            name={message.senderName || 'User'}
            size="xs"
            className="flex-shrink-0"
          />
        </div>
      </div>

      {/* Context Menu (WhatsApp-like trigger) */}
      {menuOpen && (canDelete || canReply || canReact) && !confirmOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div
            className="fixed z-50 bg-white border border-border-gray rounded shadow-md text-sm w-40"
            style={{ left: menuPos.x, top: menuPos.y }}
            role="menu"
            aria-label="Message actions"
          >
            {canReact && (
              <button
                className="px-4 py-2 hover:bg-light-gray w-full text-left text-black"
                onClick={handleReact}
              >
                React
              </button>
            )}
            {canReply && (
              <button
                className="px-4 py-2 hover:bg-light-gray w-full text-left text-black"
                onClick={handleReply}
              >
                Reply
              </button>
            )}
            {canDelete && (
              <button
                className="px-4 py-2 hover:bg-light-gray w-full text-left text-black"
                onClick={() => { setConfirmOpen(true); }}
              >
                Delete
              </button>
            )}
          </div>
        </>
      )}

      {pickerOpen && canReact && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
          <div className="fixed z-50" style={{ left: pickerPos.x, top: pickerPos.y }}>
            {/* Emoji picker renders client-side only */}
            {/* @ts-ignore - dynamic import default typing */}
            <EmojiPicker onEmojiClick={(e: any) => onEmojiClick(e as EmojiClickData)} width={320} height={360} />
          </div>
        </>
      )}

      {/* Confirm Delete Dialog */}
      {confirmOpen && canDelete && (
        <div className="fixed inset-0 z-50" aria-modal="true" role="dialog" aria-label="Delete message dialog">
          <div className="absolute inset-0 bg-black bg-opacity-30" onClick={() => { setConfirmOpen(false); setMenuOpen(false); }} />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg w-80 max-w-[90vw] p-4">
            <div className="mb-3">
              <h3 className="text-base font-semibold text-black">Delete message?</h3>
              <p className="text-sm text-text-gray mt-1">This message will be deleted.</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 rounded-md border border-border-gray text-black bg-white hover:bg-light-gray"
                onClick={() => { setConfirmOpen(false); setMenuOpen(false); }}
                autoFocus
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-600"
                onClick={handleConfirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
