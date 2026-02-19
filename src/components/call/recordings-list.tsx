"use client";

import * as React from "react";
import { Icons } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

interface Recording {
  id: string;
  room_id: string;
  session_id: string;
  status: string;
  created_at: string;
  started_at?: string;
  stopped_at?: string;
  duration?: number;
  size?: number;
  recording_assets?: Array<{
    id: string;
    path: string;
    type: string;
    url: string;
  }>;
}

export default function RecordingsList() {
  const [recordings, setRecordings] = React.useState<Recording[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/recordings", {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch recordings");
      }

      const data = await response.json();
      setRecordings(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    }
    return `${minutes}m ${secs}s`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "N/A";
    const mb = bytes / (1024 * 1024);
    if (mb > 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb.toFixed(2)} MB`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const downloadRecording = (url: string, recordingId: string) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = `recording-${recordingId}.mp4`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-3">
          <Icons.spinner color="#fff" width={24} height={24} />
          <p className="text-lg">Loading recordings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <p className="text-red-500">Error: {error}</p>
        <Button onClick={fetchRecordings}>Try Again</Button>
      </div>
    );
  }

  if (recordings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <Icons.video color="#9ca3af" width={64} height={64} />
        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">No recordings yet</h3>
          <p className="text-neutral-400">
            Start a call and click the record button to create your first recording.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Your Recordings</h2>
        <Button onClick={fetchRecordings} variant="outline" size="sm">
          <Icons.arrow className="rotate-180" width={16} height={16} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4">
        {recordings.map((recording) => (
          <div
            key={recording.id}
            className="bg-neutral-900 border border-neutral-800 rounded-lg p-6 hover:border-neutral-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    recording.status === "completed"
                      ? "bg-green-600/20 text-green-400"
                      : recording.status === "failed"
                      ? "bg-red-600/20 text-red-400"
                      : "bg-yellow-600/20 text-yellow-400"
                  }`}>
                    {recording.status}
                  </div>
                  <span className="text-sm text-neutral-400">
                    {formatDate(recording.created_at)}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-neutral-400 mb-1">Duration</p>
                    <p className="font-semibold">{formatDuration(recording.duration)}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400 mb-1">Size</p>
                    <p className="font-semibold">{formatFileSize(recording.size)}</p>
                  </div>
                  <div>
                    <p className="text-neutral-400 mb-1">Room ID</p>
                    <p className="font-mono text-xs break-all">{recording.room_id}</p>
                  </div>
                </div>

                {recording.recording_assets && recording.recording_assets.length > 0 && (
                  <div className="flex gap-2 pt-2">
                    {recording.recording_assets.map((asset) => (
                      <Button
                        key={asset.id}
                        size="sm"
                        onClick={() => downloadRecording(asset.url, recording.id)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Icons.video width={16} height={16} className="mr-2" />
                        Download {asset.type}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
