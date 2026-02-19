"use client";

import React, { useState, useEffect } from "react";
import { Icons } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";
import { useToast } from "~/components/ui/use-toast";
import { getPusherClient } from "~/lib/pusher-client";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  callId?: string;
  relatedId?: string;
  isRead: boolean;
  createdAt: string;
}

export function NotificationCenter({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time notifications
    try {
      const pusher = getPusherClient();
      const channel = pusher.subscribe(`private-user-${userId}`);

      channel.bind("notification", (notification: Notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);

        // Browser notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(notification.title, {
            body: notification.message,
            icon: "/cambliss.webp",
          });
        }

        // Toast notification
        toast({
          title: notification.title,
          description: notification.message,
        });
      });

      return () => {
        channel.unbind_all();
        channel.unsubscribe();
      };
    } catch (error) {
      // Fallback to polling
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [userId]);

  const fetchNotifications = async () => {
    try {
      const response = await fetch("/api/notifications");
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      });

      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("/api/notifications/read-all", {
        method: "POST",
      });

      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const requestNotificationPermission = async () => {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="relative rounded-full p-2 hover:bg-white/10"
      >
        <Icons.message className="h-5 w-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="absolute right-0 top-12 z-50 w-96 rounded-lg border border-white/10 bg-black/95 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 p-4">
            <h3 className="font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={markAllAsRead}
                className="text-xs"
              >
                Mark all read
              </Button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-sm text-white/50">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border-b border-white/10 p-4 transition-colors hover:bg-white/5 ${
                    !notification.isRead ? "bg-blue-500/10" : ""
                  }`}
                  onClick={() => {
                    if (!notification.isRead) markAsRead(notification.id);
                    if (notification.callId) {
                      window.location.href = `/call/${notification.callId}`;
                    }
                  }}
                >
                  <div className="mb-1 flex items-start justify-between">
                    <h4 className="font-medium text-white">
                      {notification.title}
                    </h4>
                    {!notification.isRead && (
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                  <p className="mb-2 text-sm text-white/70">
                    {notification.message}
                  </p>
                  <p className="text-xs text-white/50">
                    {formatTime(notification.createdAt)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
