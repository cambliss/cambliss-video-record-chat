"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useHMSStore, selectLocalPeer } from "@100mslive/react-sdk";
import { Button } from "~/components/ui/button";
import { Icons } from "~/components/ui/icons";
import { useToast } from "~/components/ui/use-toast";
import { subscribeToCal, unsubscribeFromCall } from "~/lib/pusher-client";

interface FileItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  filePath: string;
  senderName: string;
  thumbnailPath?: string;
  isPreviewable: boolean;
  downloadCount: number;
  createdAt: string;
}

interface FileTransferEnhancedProps {
  callId: string;
  roomId: string;
}

export function FileTransferEnhanced({ callId, roomId }: FileTransferEnhancedProps) {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<{ file: FileItem; show: boolean } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localPeer = useHMSStore(selectLocalPeer);
  const { toast } = useToast();

  // Fetch files on mount
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

  useEffect(() => {
    fetchFiles();
    let interval: ReturnType<typeof setInterval> | null = null;

    // Subscribe to real-time updates
    try {
      const channel = subscribeToCal(callId);
      if (channel) {
        channel.bind("file-uploaded", (data: FileItem) => {
          setFiles((prev) => [data, ...prev]);
          toast({
            title: "New file shared",
            description: `${data.senderName} shared ${data.fileName}`,
          });
        });
      } else {
        interval = setInterval(fetchFiles, 3000);
      }
    } catch (error) {
      // Fallback to polling
      interval = setInterval(fetchFiles, 3000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      unsubscribeFromCall(callId);
    };
  }, [callId]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = async (selectedFile: File) => {
    // Check file size (max 50MB)
    const maxSize = 50 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      toast({
        title: "File too large",
        description: "Maximum file size is 50MB",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("callId", callId);
      formData.append("roomId", roomId);
      formData.append("senderName", localPeer?.name || "Anonymous");
      formData.append("senderEmail", localPeer?.customerUserId || "");

      // XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setUploadProgress(percent);
        }
      });

      const uploadPromise = new Promise<any>((resolve, reject) => {
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error("Upload failed"));
          }
        });

        xhr.addEventListener("error", () => reject(new Error("Upload failed")));
        xhr.open("POST", "/api/files/upload");
        xhr.withCredentials = true;
        xhr.send(formData);
      });

      await uploadPromise;

      // Refresh file list
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
      setUploadProgress(0);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    await uploadFile(selectedFile);
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      await uploadFile(droppedFiles[0]!);
    }
  }, [callId, roomId, localPeer]);

  const handleDownload = async (file: FileItem) => {
    const a = document.createElement("a");
    a.href = file.filePath;
    a.download = file.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Track download
    await fetch(`/api/files/track-download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId: file.id }),
    });

    toast({
      title: "Download started",
      description: file.fileName,
    });
  };

  const openPreview = (file: FileItem) => {
    if (file.isPreviewable) {
      setPreview({ file, show: true });
    } else {
      handleDownload(file);
    }
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

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Icons.file className="h-4 w-4 text-blue-400" />;
    if (fileType.startsWith("video/")) return <Icons.video className="h-4 w-4 text-purple-400" />;
    if (fileType.includes("pdf")) return <Icons.file className="h-4 w-4 text-red-400" />;
    return <Icons.file className="h-4 w-4 text-white/70" />;
  };

  return (
    <>
      <div 
        className={`absolute right-4 bottom-24 z-50 w-80 rounded-lg border transition-all ${
          isDragging 
            ? "border-blue-500 bg-blue-500/20 backdrop-blur-md" 
            : "border-white/10 bg-black/90 backdrop-blur-md"
        } p-4 shadow-xl`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
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
            {uploading ? `${uploadProgress}%` : "Upload"}
          </Button>
        </div>

        {isDragging && (
          <div className="mb-3 rounded-md border-2 border-dashed border-blue-400 bg-blue-500/10 p-4 text-center">
            <Icons.upload className="mx-auto mb-2 h-8 w-8 text-blue-400" />
            <p className="text-sm text-blue-400">Drop file here to upload</p>
          </div>
        )}

        {uploading && (
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-xs text-white/70">
              <span>Uploading...</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

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
              <br />
              <span className="text-[10px]">Drag & drop or click upload</span>
            </div>
          ) : (
            files.map((file) => (
              <div
                key={file.id}
                className="group flex items-start gap-2 rounded-md border border-white/10 bg-white/5 p-2 transition-all hover:bg-white/10 cursor-pointer"
                onClick={() => openPreview(file)}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-white/10">
                  {getFileIcon(file.fileType)}
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
                  {file.downloadCount > 0 && (
                    <div className="mt-1 text-[10px] text-white/40">
                      {file.downloadCount} downloads
                    </div>
                  )}
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(file);
                  }}
                  className="h-7 w-7 shrink-0 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Icons.download className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      {preview?.show && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setPreview(null)}
        >
          <div 
            className="relative max-h-[90vh] max-w-4xl overflow-auto rounded-lg bg-black/90 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setPreview(null)}
              className="absolute right-2 top-2 rounded-full bg-white/10 p-2 hover:bg-white/20"
            >
              <Icons.close className="h-4 w-4 text-white" />
            </button>
            
            <div className="mb-4 text-white">
              <h3 className="text-lg font-semibold">{preview.file.fileName}</h3>
              <p className="text-sm text-white/60">
                {preview.file.senderName} • {formatFileSize(preview.file.fileSize)}
              </p>
            </div>

            {preview.file.fileType.startsWith("image/") ? (
              <img
                src={preview.file.filePath}
                alt={preview.file.fileName}
                className="max-h-[70vh] w-auto rounded"
              />
            ) : preview.file.fileType === "application/pdf" ? (
              <iframe
                src={preview.file.filePath}
                className="h-[70vh] w-full rounded"
                title={preview.file.fileName}
              />
            ) : (
              <div className="flex flex-col items-center py-12">
                <Icons.file className="mb-4 h-16 w-16 text-white/40" />
                <p className="mb-4 text-white/60">Preview not available</p>
                <Button onClick={() => handleDownload(preview.file)}>
                  <Icons.download className="mr-2 h-4 w-4" />
                  Download File
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
