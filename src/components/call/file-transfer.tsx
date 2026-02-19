"use client";

import React, { useState, useRef, useEffect } from "react";
import { useHMSStore, selectLocalPeer } from "@100mslive/react-sdk";
import { Button } from "~/components/ui/button";
import { Icons } from "~/components/ui/icons";
import { useToast } from "~/components/ui/use-toast";

interface FileItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  senderName: string;
  createdAt: string;
}

interface FileTransferProps {
  callId: string;
  roomId: string;
}

export function FileTransfer({ callId, roomId }: FileTransferProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localPeer = useHMSStore(selectLocalPeer);
  const { toast } = useToast();

  // Fetch files from database
  const fetchFiles = async () => {
    try {
      const response = await fetch(`/api/files/${callId}`);
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      }
    } catch (error) {
      console.error("Error fetching files:", error);
    }
  };

  // Fetch files on mount and poll every 3 seconds
  useEffect(() => {
    fetchFiles();
    const interval = setInterval(fetchFiles, 3000);
    return () => clearInterval(interval);
  }, [callId]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast({
        title: "File too large",
        description: "Maximum file size is 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("callId", callId);
      formData.append("roomId", roomId);
      formData.append("senderName", localPeer?.name || "Anonymous");
      formData.append("senderEmail", localPeer?.customerUserId || "");

      const response = await fetch("/api/files/upload", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      // Refresh file list to show the new file (will appear for all users)
      await fetchFiles();

      toast({
        title: "File uploaded",
        description: `${selectedFile.name} has been shared with all participants`,
      });

      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      console.error("File upload error:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = (file: FileItem) => {
    // Direct download using the file path
    const a = document.createElement("a");
    a.href = file.filePath;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast({
      title: "Download started",
      description: file.fileName,
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="absolute right-4 bottom-24 z-50 w-80 rounded-lg border border-white/10 bg-black/90 p-4 shadow-xl backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">File Transfer</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleFileSelect}
          disabled={uploading}
          className="h-8 gap-2 text-xs"
        >
          <Icons.upload className="h-4 w-4" />
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="*/*"
      />

      {/* Files List */}
      <div className="max-h-80 space-y-2 overflow-y-auto pr-2">
        {files.length === 0 ? (
          <div className="py-8 text-center text-xs text-white/50">
            No files shared yet
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.id}
              className="group flex items-start gap-2 rounded-md border border-white/10 bg-white/5 p-2 transition-all hover:bg-white/10"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white/10">
                <Icons.file className="h-4 w-4 text-white/70" />
              </div>
              
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-white">
                  {file.fileName}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-white/50">
                  <span>{file.senderName}</span>
                  <span>•</span>
                  <span>{formatFileSize(file.fileSize)}</span>
                  <span>•</span>
                  <span>{formatTime(file.createdAt)}</span>
                </div>
              </div>

              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleDownload(file)}
                className="h-7 w-7 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Icons.download className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
