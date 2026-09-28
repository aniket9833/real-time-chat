import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getErrorMessage,
  getMessages,
  getUsers,
  sendMessage as sendMessageRest,
} from '../services/api';
import {
  emitEvent,
  isSocketConnected,
  sendMessageViaSocket,
  subscribe,
} from '../services/socket';

const PAGE_SIZE = 30;
const TYPING_IDLE_MS = 1500; // stop signal after the user pauses
const TYPING_SAFETY_MS = 6000; // hide indicator if a stop event never arrives
const STATUS_RANK = { sending: 0, sent: 1, delivered: 2, read: 3 };

const isTemp = (message) => String(message._id).startsWith('temp-');

function mergeMessages(existing, incoming) {
  const byId = new Map();
  existing.forEach((m) => byId.set(m._id, m));
  incoming.forEach((m) => byId.set(m._id, m));
  return [...byId.values()].sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt),
  );
}

/**
 * All chat logic for one conversation: history, sending, receiving,
 * typing, delivery/read status and presence of the other user.
 */
export default function useChat(currentUser, partner) {
  const partnerId = partner._id;
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerStatus, setPartnerStatus] = useState({
    isOnline: Boolean(partner.isOnline),
    lastSeen: partner.lastSeen || null,
  });

  const typingActive = useRef(false);
  const idleTimer = useRef(null);
  const safetyTimer = useRef(null);

  const markRead = useCallback(() => {
    emitEvent('message:read', { senderId: partnerId });
  }, [partnerId]);

  const loadHistory = useCallback(
    async ({ silent = false } = {}) => {
      try {
        if (!silent) {
          setLoading(true);
          setError(null);
        }
        const data = await getMessages(partnerId, { limit: PAGE_SIZE });
        setMessages((prev) => mergeMessages(prev, data.messages));
        if (!silent) setHasMore(data.hasMore);
        markRead();
      } catch (err) {
        if (!silent) setError(getErrorMessage(err));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [partnerId, markRead],
  );

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Real-time listeners (registered once, cleaned up on unmount)
  useEffect(() => {
    const updateStatus = (ids, status) =>
      setMessages((prev) =>
        prev.map((m) =>
          ids.includes(m._id) &&
          (STATUS_RANK[m.status] ?? 0) < STATUS_RANK[status]
            ? { ...m, status }
            : m,
        ),
      );

    const refreshPartnerStatus = async () => {
      try {
        const users = await getUsers();
        const fresh = users.find((u) => u._id === partnerId);
        if (fresh)
          setPartnerStatus({
            isOnline: fresh.isOnline,
            lastSeen: fresh.lastSeen,
          });
      } catch {
        /* non-critical */
      }
    };

    const unsubscribers = [
      subscribe('message:new', (message) => {
        if (message.senderId !== partnerId) return;
        setMessages((prev) => mergeMessages(prev, [message]));
        setIsTyping(false);
        markRead(); // the conversation is open, so it is read immediately
      }),
      subscribe('message:delivered', ({ receiverId, messageIds }) => {
        if (receiverId === partnerId) updateStatus(messageIds, 'delivered');
      }),
      subscribe('message:read', ({ readerId, messageIds }) => {
        if (readerId === partnerId) updateStatus(messageIds, 'read');
      }),
      subscribe('typing:start', ({ senderId }) => {
        if (senderId !== partnerId) return;
        setIsTyping(true);
        clearTimeout(safetyTimer.current);
        safetyTimer.current = setTimeout(
          () => setIsTyping(false),
          TYPING_SAFETY_MS,
        );
      }),
      subscribe('typing:stop', ({ senderId }) => {
        if (senderId === partnerId) setIsTyping(false);
      }),
      subscribe('user:online', ({ userId }) => {
        if (userId === partnerId)
          setPartnerStatus((s) => ({ ...s, isOnline: true }));
      }),
      subscribe('user:offline', ({ userId, lastSeen }) => {
        if (userId !== partnerId) return;
        setPartnerStatus({ isOnline: false, lastSeen });
        setIsTyping(false);
      }),
      // Fires on every (re)connect: catch up on anything missed while offline
      subscribe('connect', () => {
        loadHistory({ silent: true });
        refreshPartnerStatus();
      }),
    ];
    return () => {
      unsubscribers.forEach((off) => off());
      clearTimeout(safetyTimer.current);
    };
  }, [partnerId, markRead, loadHistory]);

  // --- typing (debounced: one start per burst, one stop after a pause) ---
  const stopTyping = useCallback(() => {
    clearTimeout(idleTimer.current);
    if (typingActive.current) {
      typingActive.current = false;
      emitEvent('typing:stop', { receiverId: partnerId });
    }
  }, [partnerId]);

  const handleTextChange = useCallback(
    (text) => {
      if (!text.trim()) return stopTyping();
      if (!typingActive.current) {
        typingActive.current = true;
        emitEvent('typing:start', { receiverId: partnerId });
      }
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(stopTyping, TYPING_IDLE_MS);
    },
    [partnerId, stopTyping],
  );

  useEffect(() => stopTyping, [stopTyping]);

  // --- sending (optimistic; socket when connected, REST fallback otherwise) ---
  const send = useCallback(
    async (text, retryId) => {
      const clean = text.trim();
      if (!clean) return;
      stopTyping();

      const tempId =
        retryId ||
        `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const optimistic = {
        _id: tempId,
        senderId: currentUser._id,
        receiverId: partnerId,
        text: clean,
        status: 'sending',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) =>
        retryId
          ? prev.map((m) =>
              m._id === retryId ? { ...m, status: 'sending' } : m,
            )
          : mergeMessages(prev, [optimistic]),
      );

      try {
        const saved = isSocketConnected()
          ? await sendMessageViaSocket({ receiverId: partnerId, text: clean })
          : await sendMessageRest({ receiverId: partnerId, text: clean });
        setMessages((prev) =>
          mergeMessages(
            prev.filter((m) => m._id !== tempId),
            [saved],
          ),
        );
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m._id === tempId
              ? { ...m, status: 'failed', errorMessage: getErrorMessage(err) }
              : m,
          ),
        );
      }
    },
    [currentUser._id, partnerId, stopTyping],
  );

  const retry = useCallback(
    (message) => send(message.text, message._id),
    [send],
  );
  const discard = useCallback(
    (message) =>
      setMessages((prev) => prev.filter((m) => m._id !== message._id)),
    [],
  );

  // --- pagination (older messages) ---
  const loadOlder = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    const oldest = messages.find((m) => !isTemp(m));
    if (!oldest) return;
    setLoadingMore(true);
    try {
      const data = await getMessages(partnerId, {
        limit: PAGE_SIZE,
        before: oldest.createdAt,
      });
      setMessages((prev) => mergeMessages(prev, data.messages));
      setHasMore(data.hasMore);
    } catch {
      /* keep what we have; user can scroll again to retry */
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, messages, partnerId]);

  return {
    messages,
    loading,
    error,
    isTyping,
    partnerStatus,
    hasMore,
    loadingMore,
    send,
    retry,
    discard,
    handleTextChange,
    loadOlder,
    reload: () => loadHistory(),
  };
}
