"use client";

import React, { useState, useEffect, useRef } from "react";
import { useHMSStore, selectLocalPeer } from "@100mslive/react-sdk";
import { Button } from "~/components/ui/button";
import { Icons } from "~/components/ui/icons";
import { useToast } from "~/components/ui/use-toast";
import { subscribeToCal, unsubscribeFromCall } from "~/lib/pusher-client";

interface Reaction {
  id: string;
  emoji: string;
  userName: string;
  userEmail?: string;
}

interface ChatMessage {
  id: string;
  callId: string;
  senderName: string;
  senderEmail: string | null;
  message: string;
  isEdited: boolean;
  editedAt: string | null;
  isDeleted: boolean;
  replyToId: string | null;
  replyTo?: {
    id: string;
    senderName: string;
    message: string;
  };
  reactions?: Reaction[];
  createdAt: string;
}

interface CallChatEnhancedProps {
  callId: string;
  roomId: string;
}

const EMOJI_REACTIONS = ["👍", "❤️", "😂", "🎉", "🔥", "👏"];

export function CallChatEnhanced({ callId, roomId }: CallChatEnhancedProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const localPeer = useHMSStore(selectLocalPeer);
  const { toast } = useToast();
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/chat/history?callId=${callId}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages || []);
        scrollToBottom();
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  useEffect(() => {
    fetchMessages();

    // Subscribe to real-time updates
    try {
      const channel = subscribeToCal(callId);
      if (channel) {
        channel.bind("chat-message", (data: ChatMessage) => {
          setMessages((prev) => [...prev, data]);
          scrollToBottom();
        });

        channel.bind("message-reaction", ({ messageId, reaction }: { messageId: string; reaction: Reaction }) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, reactions: [...(msg.reactions || []), reaction] }
                : msg
            )
          );
        });

        channel.bind("message-edited", (data: { messageId: string; message: string }) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === data.messageId
                ? { ...msg, message: data.message, isEdited: true, editedAt: new Date().toISOString() }
                : msg
            )
          );
        });

        channel.bind("message-deleted", ({ messageId }: { messageId: string }) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === messageId
                ? { ...msg, message: "This message has been deleted", isDeleted: true }
                : msg
            )
          );
        });

        channel.bind("typing-start", ({ userName }: { userName: string }) => {
          setIsTyping((prev) => [...new Set([...prev, userName])]);
        });

        channel.bind("typing-stop", ({ userName }: { userName: string }) => {
          setIsTyping((prev) => prev.filter((name) => name !== userName));
        });
      }
    } catch (error) {
      // Fallback to polling
      const interval = setInterval(fetchMessages, 3000);
      return () => {
        clearInterval(interval);
        unsubscribeFromCall(callId);
      };
    }

    return () => unsubscribeFromCall(callId);
  }, [callId]);

  const handleTyping = () => {
    fetch("/api/chat/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        callId,
        userName: localPeer?.name || "Anonymous",
        typing: true,
      }),
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      fetch("/api/chat/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          callId,
          userName: localPeer?.name || "Anonymous",
          typing: false,
        }),
      });
    }, 2000);
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const endpoint = editingMessage ? "/api/chat/edit" : "/api/chat/save";
      const body = editingMessage
        ? { messageId: editingMessage.id, message: newMessage }
        : {
            callId,
            roomId,
            senderName: localPeer?.name || "Anonymous",
            senderEmail: localPeer?.customerUserId || "",
            message: newMessage,
            replyToId: replyingTo?.id || null,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Failed to send message");

      setNewMessage("");
      setReplyingTo(null);
      setEditingMessage(null);
      await fetchMessages();
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    try {
      await fetch("/api/chat/react", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          messageId,
          emoji,
          userName: localPeer?.name || "Anonymous",
          userEmail: localPeer?.customerUserId || "",
        }),
      });
      setShowEmojiPicker(null);
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      await fetch("/api/chat/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ messageId }),
      });
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  };

  const startEdit = (message: ChatMessage) => {
    setEditingMessage(message);
    setNewMessage(message.message);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setNewMessage("");
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const groupedReactions = (reactions: Reaction[]) => {
    const groups: Record<string, Reaction[]> = {};
    reactions.forEach((r) => {
      if (!groups[r.emoji]) groups[r.emoji] = [];
      groups[r.emoji]!.push(r);
    });
    return groups;
  };

  return (
    <div className="absolute left-4 bottom-24 z-50 w-80 rounded-lg border border-white/10 bg-black/90 p-4 shadow-xl backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Chat</h3>
        <div className="text-xs text-white/50">{messages.length} messages</div>
      </div>

      {/* Messages */}
      <div className="mb-3 max-h-96 space-y-2 overflow-y-auto pr-2">
        {messages.length === 0 ? (
          <div className="py-8 text-center text-xs text-white/50">
            No messages yet
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`group rounded-lg border border-white/10 bg-white/5 p-2 ${
                message.replyToId ? "ml-4 border-l-2 border-l-blue-500" : ""
              }`}
            >
              {message.replyTo && (
                <div className="mb-1 text-[10px] text-white/40">
                  Replying to {message.replyTo.senderName}
                </div>
              )}
              
              <div className="mb-1 flex items-start justify-between">
                <span className="text-xs font-medium text-white">
                  {message.senderName}
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-white/50">
                    {formatTime(message.createdAt)}
                  </span>
                  {message.isEdited && (
                    <span className="text-[10px] text-white/40">(edited)</span>
                  )}
                </div>
              </div>

              <p className={`text-xs text-white/90 ${message.isDeleted ? "italic text-white/50" : ""}`}>
                {message.message}
              </p>

              {/* Reactions */}
              {message.reactions && message.reactions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(groupedReactions(message.reactions)).map(([emoji, reactionList]) => (
                    <button
                      key={emoji}
                      className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20"
                      title={reactionList.map(r => r.userName).join(", ")}
                    >
                      <span>{emoji}</span>
                      <span>{reactionList.length}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              {!message.isDeleted && (
                <div className="mt-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    onClick={() => setReplyingTo(message)}
                    className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20"
                  >
                    Reply
                  </button>
                  <button
                    onClick={() => setShowEmojiPicker(message.id)}
                    className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20"
                  >
                    😊
                  </button>
                  {message.senderEmail === localPeer?.customerUserId && (
                    <>
                      <button
                        onClick={() => startEdit(message)}
                        className="rounded bg-white/10 px-2 py-0.5 text-[10px] hover:bg-white/20"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteMessage(message.id)}
                        className="rounded bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/30"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              )}

              {/* Emoji Picker */}
              {showEmojiPicker === message.id && (
                <div className="mt-2 flex flex-wrap gap-1 rounded bg-white/10 p-2">
                  {EMOJI_REACTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => addReaction(message.id, emoji)}
                      className="rounded px-2 py-1 hover:bg-white/20"
                    >
                      {emoji}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowEmojiPicker(null)}
                    className="ml-auto text-xs text-white/50 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator */}
      {isTyping.length > 0 && (
        <div className="mb-2 text-[10px] italic text-white/40">
          {isTyping.join(", ")} {isTyping.length === 1 ? "is" : "are"} typing...
        </div>
      )}

      {/* Reply/Edit Bar */}
      {(replyingTo || editingMessage) && (
        <div className="mb-2 flex items-center justify-between rounded bg-white/10 p-2 text-xs">
          <span className="text-white/70">
            {editingMessage ? "Editing message" : `Replying to ${replyingTo?.senderName}`}
          </span>
          <button
            onClick={editingMessage ? cancelEdit : () => setReplyingTo(null)}
            className="text-white/50 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => {
            setNewMessage(e.target.value);
            handleTyping();
          }}
          onKeyPress={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder={editingMessage ? "Edit message..." : "Type a message..."}
          className="flex-1 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder-white/50 focus:border-blue-500 focus:outline-none"
          disabled={sending}
        />
        <Button
          size="sm"
          onClick={sendMessage}
          disabled={!newMessage.trim() || sending}
          className="px-3"
        >
          <Icons.send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
