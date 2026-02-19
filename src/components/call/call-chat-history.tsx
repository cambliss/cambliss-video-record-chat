"use client";

import React, { useState, useEffect } from "react";
import { Icons } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

interface ChatMessage {
  id: string;
  callId: string;
  senderName: string;
  senderEmail: string | null;
  message: string;
  createdAt: string;
}

interface FileTransfer {
  id: string;
  callId: string;
  senderName: string;
  senderEmail: string | null;
  fileName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  createdAt: string;
}

interface Call {
  id: string;
  roomId: string;
  name: string;
  createdAt: string;
  chatMessages: ChatMessage[];
  fileTransfers: FileTransfer[];
  participants: Array<{
    id: string;
    name: string;
    startTime: string | null;
    endTime: string | null;
  }>;
}

export default function CallChatHistory() {
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  useEffect(() => {
    fetchAllCallHistory();
  }, []);

  const fetchAllCallHistory = async () => {
    try {
      const response = await fetch("/api/account/call-history");
      
      if (!response.ok) {
        throw new Error("Failed to fetch call history");
      }

      const data = await response.json();
      
      // Combine created and participated calls
      const createdCalls: Call[] = data.created || [];
      const participatedCalls = (data.participated || []).map((p: any) => p.call);
      
      // Get unique calls (avoid duplicates)
      const allCallsMap = new Map<string, Call>();
      
      [...createdCalls, ...participatedCalls].forEach((call: Call) => {
        if (!allCallsMap.has(call.id)) {
          allCallsMap.set(call.id, call);
        }
      });
      
      const allCalls = Array.from(allCallsMap.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setCalls(allCalls);
      
      // Auto-select first call if available
      if (allCalls.length > 0 && !selectedCallId) {
        setSelectedCallId(allCalls[0]!.id);
      }
    } catch (error) {
      console.error("Error fetching call history:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const downloadFile = (filePath: string, fileName: string) => {
    const a = document.createElement("a");
    a.href = filePath;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const selectedCall = calls.find(call => call.id === selectedCallId);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icons.spinner className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Icons.message className="mx-auto mb-4 h-12 w-12 text-neutral-600" />
            <p className="text-neutral-400">
              No call history found. Start or join a call to see it here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-3">
      {/* Call List Sidebar */}
      <div className="md:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Your Calls ({calls.length})</CardTitle>
            <CardDescription>Click a call to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
              {calls.map((call) => (
                <button
                  key={call.id}
                  onClick={() => setSelectedCallId(call.id)}
                  className={`w-full text-left rounded-lg border p-3 transition-all ${
                    selectedCallId === call.id
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-neutral-800 bg-neutral-900 hover:bg-neutral-800"
                  }`}
                >
                  <div className="font-medium text-white truncate">
                    {call.name || call.roomId}
                  </div>
                  <div className="mt-1 text-xs text-neutral-500">
                    {formatDate(call.createdAt)}
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Icons.message className="h-3 w-3" />
                      {call.chatMessages?.length || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icons.file className="h-3 w-3" />
                      {call.fileTransfers?.length || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <Icons.invite className="h-3 w-3" />
                      {call.participants?.length || 0}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Call Details */}
      <div className="md:col-span-2">
        {!selectedCall ? (
          <Card>
            <CardContent className="flex items-center justify-center py-12">
              <div className="text-center">
                <Icons.message className="mx-auto mb-4 h-12 w-12 text-neutral-600" />
                <p className="text-neutral-400">
                  Select a call to view chat and file history
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Call Info */}
            <Card>
              <CardHeader>
                <CardTitle>{selectedCall.name || "Call Details"}</CardTitle>
                <CardDescription>
                  {formatDateTime(selectedCall.createdAt)} • Room: {selectedCall.roomId}
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Chat Messages */}
            <Card>
              <CardHeader>
                <CardTitle>Chat Messages</CardTitle>
                <CardDescription>
                  {selectedCall.chatMessages?.length || 0} message(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedCall.chatMessages || selectedCall.chatMessages.length === 0 ? (
                  <div className="py-8 text-center text-sm text-neutral-400">
                    No chat messages in this call
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {selectedCall.chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className="rounded-lg border border-neutral-800 bg-neutral-900 p-3"
                      >
                        <div className="mb-1 flex items-center justify-between">
                          <span className="font-medium text-white">
                            {message.senderName}
                          </span>
                          <span className="text-xs text-neutral-500">
                            {formatDateTime(message.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-300">
                          {message.message}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* File Transfers */}
            <Card>
              <CardHeader>
                <CardTitle>File Transfers</CardTitle>
                <CardDescription>
                  {selectedCall.fileTransfers?.length || 0} file(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!selectedCall.fileTransfers || selectedCall.fileTransfers.length === 0 ? (
                  <div className="py-8 text-center text-sm text-neutral-400">
                    No files transferred in this call
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedCall.fileTransfers.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-neutral-800">
                            <Icons.file className="h-5 w-5 text-neutral-400" />
                          </div>
                          <div>
                            <div className="font-medium text-white">
                              {file.fileName}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {file.senderName} • {formatFileSize(file.fileSize)} •{" "}
                              {formatDateTime(file.createdAt)}
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => downloadFile(file.filePath, file.fileName)}
                        >
                          <Icons.download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
