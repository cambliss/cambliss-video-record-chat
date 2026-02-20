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

interface RecordingLink {
  id: string;
  type: string;
  url: string;
  valid_till?: string;
}

export default function RecordingsList() {
  const [recordings, setRecordings] = React.useState<Recording[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [recordingErrors, setRecordingErrors] = React.useState<Record<string, string>>({});
  const [playingVideo, setPlayingVideo] = React.useState<string | null>(null);
  const [fetchingLink, setFetchingLink] = React.useState<string | null>(null);
  const [recordingLinks, setRecordingLinks] = React.useState<Record<string, RecordingLink[]>>({});

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

  // Fetch fresh recording links from 100ms API
  const fetchRecordingLink = async (recordingId: string): Promise<RecordingLink[]> => {
    try {
      setFetchingLink(recordingId);
      setRecordingErrors((prev) => ({ ...prev, [recordingId]: "" }));
      const response = await fetch(`/api/recordings/link?recordingId=${recordingId}`, {
        credentials: "include",
      });

      const raw = await response.text();
      let data: any = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { raw };
      }

      if (!response.ok) {
        const message = data?.error || data?.details || raw || "Failed to fetch recording links";
        throw new Error(message);
      }

      const links = (data.data || data.links || [data]) as RecordingLink[];

      if (!Array.isArray(links) || links.length === 0 || !links[0]?.url) {
        throw new Error("No downloadable links returned yet. Please wait 1-2 minutes and refresh.");
      }
      
      // Store the links with validity information
      setRecordingLinks((prev) => ({
        ...prev,
        [recordingId]: links,
      }));
      setRecordingErrors((prev) => ({ ...prev, [recordingId]: "" }));

      return links;
    } catch (err) {
      console.error("Error fetching recording link:", err);
      const message = err instanceof Error ? err.message : "Error fetching recording link";
      setRecordingErrors((prev) => ({ ...prev, [recordingId]: message }));
      throw err;
    } finally {
      setFetchingLink(null);
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

  const downloadRecording = async (recordingId: string, assetType: string) => {
    try {
      setRecordingErrors((prev) => ({ ...prev, [recordingId]: "" }));
      // Fetch fresh link before downloading
      let links: RecordingLink[] | undefined = recordingLinks[recordingId];
      if (!links) {
        links = await fetchRecordingLink(recordingId);
      }

      if (!links || links.length === 0) {
        setRecordingErrors((prev) => ({
          ...prev,
          [recordingId]: "No recording links available yet. Try again in 1-2 minutes.",
        }));
        return;
      }

      // Find the correct asset link
      const assetLink = links.find(
        (link: RecordingLink) => link.type === assetType || link.id === assetType
      );

      if (!assetLink || !assetLink.url) {
        setRecordingErrors((prev) => ({
          ...prev,
          [recordingId]: "No download URL found for this recording asset.",
        }));
        return;
      }

      // Open in new tab or download
      const link = document.createElement("a");
      link.href = assetLink.url;
      link.download = `recording-${recordingId}-${assetType}.mp4`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error downloading recording:", err);
      const message = err instanceof Error ? err.message : "Error downloading recording";
      setRecordingErrors((prev) => ({ ...prev, [recordingId]: message }));
    }
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
                  <div className="space-y-3 pt-2">
                    {/* Video Player */}
                    {playingVideo === recording.id ? (
                      <div className="rounded-lg overflow-hidden bg-black">
                        {fetchingLink === recording.id ? (
                          <div className="flex items-center justify-center h-80 bg-neutral-900">
                            <div className="flex flex-col items-center gap-2">
                              <Icons.spinner color="#fff" width={24} height={24} />
                              <p className="text-sm text-neutral-400">Loading video...</p>
                            </div>
                          </div>
                        ) : recordingLinks[recording.id]?.[0]?.url ? (
                          <>
                            <video
                              controls
                              autoPlay
                              className="w-full max-h-96"
                              src={recordingLinks[recording.id]?.[0]?.url ?? undefined}
                            >
                              Your browser does not support the video tag.
                            </video>
                            {recordingLinks[recording.id]?.[0]?.valid_till && (
                              <div className="p-2 bg-neutral-800 text-xs text-neutral-400">
                                Link valid until: {new Date(recordingLinks[recording.id]?.[0]?.valid_till ?? "").toLocaleString()}
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="flex items-center justify-center h-80 bg-neutral-900">
                            <p className="text-red-400">Failed to load video</p>
                          </div>
                        )}
                        <div className="p-2 bg-neutral-900">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setPlayingVideo(null)}
                          >
                            Close Player
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2 flex-wrap">
                        {/* Play Button */}
                        <Button
                          size="sm"
                          onClick={async () => {
                            await fetchRecordingLink(recording.id);
                            setPlayingVideo(recording.id);
                          }}
                          disabled={fetchingLink === recording.id}
                          className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                        >
                          {fetchingLink === recording.id ? (
                            <>
                              <Icons.spinner width={16} height={16} className="mr-2" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <Icons.video width={16} height={16} className="mr-2" />
                              Play Video
                            </>
                          )}
                        </Button>
                        
                        {/* Download Buttons */}
                        {recording.recording_assets.map((asset) => (
                          <Button
                            key={asset.id}
                            size="sm"
                            onClick={() => downloadRecording(recording.id, asset.type || asset.id)}
                            disabled={fetchingLink === recording.id}
                            variant="outline"
                            className="disabled:opacity-50"
                          >
                            {fetchingLink === recording.id ? (
                              <>
                                <Icons.spinner width={16} height={16} className="mr-2" />
                              </>
                            ) : (
                              <>
                                <Icons.download width={16} height={16} className="mr-2" />
                              </>
                            )}
                            Download {asset.type}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {(!recording.recording_assets || recording.recording_assets.length === 0) && recording.status === "completed" && (
                  <div className="flex items-center gap-2 text-sm text-yellow-400 pt-2">
                    <span>⚠️ Recording completed but video not yet available. Check back in a few minutes.</span>
                  </div>
                )}
                
                {(!recording.recording_assets || recording.recording_assets.length === 0) && recording.status === "processing" && (
                  <div className="flex items-center gap-2 text-sm text-blue-400 pt-2">
                    <Icons.spinner width={16} height={16} />
                    <span>Recording is being processed...</span>
                  </div>
                )}

                {!!recordingErrors[recording.id] && (
                  <div className="mt-3 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-300">
                    {recordingErrors[recording.id]}
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
