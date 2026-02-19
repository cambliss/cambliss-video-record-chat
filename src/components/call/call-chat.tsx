"use client";

import * as React from "react";
import {
  useHMSActions,
  useHMSStore,
  selectHMSMessages,
  selectLocalPeer,
} from "@100mslive/react-sdk";
import { Icons } from "../ui/icons";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

interface ChatMessage {
  id: string;
  senderName: string;
  message: string;
  time: Date;
  senderId?: string;
}

interface CallChatProps {
  callId: string;
}

export default function CallChat({ callId }: CallChatProps) {
  const hmsActions = useHMSActions();
  const messages = useHMSStore(selectHMSMessages);
  const localPeer = useHMSStore(selectLocalPeer);
  
  const [inputMessage, setInputMessage] = React.useState("");
  const [isOpen, setIsOpen] = React.useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save new messages to database
  React.useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      // Only save if lastMessage exists and has required properties
      if (lastMessage?.message && lastMessage?.senderName) {
        // Save to database (fire and forget)
        fetch("/api/chat/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            callId,
            senderName: lastMessage.senderName,
            senderEmail: lastMessage.senderUserId || null,
            message: lastMessage.message,
          }),
        }).catch((error) => {
          console.error("Failed to save message to database:", error);
        });
      }
    }
  }, [messages, callId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inputMessage.trim()) return;

    try {
      await hmsActions.sendBroadcastMessage(inputMessage);
      setInputMessage("");
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-full flex justify-center items-center py-6 px-4 bg-neutral-800 relative"
        title="Toggle Chat"
      >
        <Icons.message color="white" width={20} height={20} />
        {messages.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {messages.length}
          </span>
        )}
      </Button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed right-4 bottom-24 w-80 h-96 bg-neutral-900 rounded-lg shadow-xl border border-neutral-800 flex flex-col z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
            <h3 className="text-sm font-semibold text-white">Chat</h3>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0"
            >
              <Icons.close color="white" width={16} height={16} />
            </Button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
                No messages yet. Start the conversation!
              </div>
            ) : (
              messages.map((msg) => {
                const isLocalMessage = msg.senderUserId === localPeer?.customerUserId;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isLocalMessage ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                        isLocalMessage
                          ? "bg-blue-600 text-white"
                          : "bg-neutral-800 text-white"
                      }`}
                    >
                      {!isLocalMessage && (
                        <p className="text-xs font-semibold mb-1 text-neutral-400">
                          {msg.senderName}
                        </p>
                      )}
                      <p className="text-sm break-words">{msg.message}</p>
                    </div>
                    <span className="text-xs text-neutral-500 mt-1">
                      {new Date(msg.time).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSendMessage}
            className="border-t border-neutral-800 px-4 py-3"
          >
            <div className="flex gap-2">
              <Input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
              />
              <Button
                type="submit"
                size="sm"
                disabled={!inputMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Icons.send width={16} height={16} />
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
