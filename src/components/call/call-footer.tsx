/* eslint-disable @typescript-eslint/no-misused-promises */
"use client";

import * as React from "react";
import { useAVToggle, useHMSActions, useHMSStore, selectRecordingState } from "@100mslive/react-sdk";
import {
  MicOffIcon,
  MicOnIcon,
  VideoOffIcon,
  VideoOnIcon,
  HangUpIcon,
  ShareScreenIcon,
} from "@100mslive/react-icons";
import { useParams } from "next/navigation";
import Cookies from "js-cookie";
import { extractId } from "~/lib/extract-id";
import useClipboard from "~/hooks/use-copy";
import { Icons } from "../ui/icons";
import { Button } from "../ui/button";
import { useToast } from "../ui/use-toast";
import RejoinCall from "./rejoin-call";
import { CallChatEnhanced } from "./call-chat-enhanced";
import RecordingTimer from "./recording-timer";
import { FileTransferEnhanced } from "./file-transfer-enhanced";

export default function CallFooter() {
  const {
    isLocalAudioEnabled,
    isLocalVideoEnabled,
    toggleAudio,
    toggleVideo,
  } = useAVToggle();

  const actions = useHMSActions();
  const { toast } = useToast();
  const recordingState = useHMSStore(selectRecordingState);

  const [isScreenShareEnabled, setIsScreenShareEnabled] = React.useState(false);
  const [showRejoinPopup, setShowRejoinPopup] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingStartTime, setRecordingStartTime] = React.useState<Date | undefined>();

  const params = useParams();
  const roomId = Cookies.get("room-id");
  const roomName = Cookies.get("room-name");
  const [showFileTransfer, setShowFileTransfer] = React.useState(false);

  const { copyToClipboard } = useClipboard();

  // 🎥 Auto-start recording when joining call
  React.useEffect(() => {
    const startRecordingOnJoin = async () => {
      // Check if already recording
      const currentlyRecording = recordingState.browser?.running || recordingState.server?.running || false;
      if (currentlyRecording) {
        console.log('Recording already active, skipping auto-start');
        return;
      }

      // Check if on localhost
      const baseUrl = window.location.origin;
      const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
      
      if (isLocalhost) {
        console.log('Localhost detected, skipping auto-recording');
        return;
      }

      // Wait a bit for the call to stabilize
      await new Promise(resolve => setTimeout(resolve, 3000));

      try {
        console.log('Auto-starting recording...');
        const meetingURL = `${baseUrl}/call/${roomId}`;
        
        await actions.startRTMPOrRecording({
          meetingURL,
          rtmpURLs: [],
          record: true,
        });

        console.log('Recording auto-started successfully');
        toast({
          title: "Recording started",
          description: "Call recording has started automatically.",
          variant: "default",
        });
      } catch (error) {
        console.error('Auto-start recording failed:', error);
        // Don't show error toast for auto-start failure - it's optional
      }
    };

    startRecordingOnJoin();

    // Stop recording when leaving
    return () => {
      const currentlyRecording = recordingState.browser?.running || recordingState.server?.running || false;
      if (currentlyRecording) {
        console.log('Stopping recording on call exit...');
        actions.stopRTMPAndRecording().catch(err => {
          console.error('Failed to stop recording on exit:', err);
        });
      }
    };
  }, []); // Only run once on mount

  // 🎥 Update recording state when it changes
  React.useEffect(() => {
    const currentlyRecording = recordingState.browser?.running || recordingState.server?.running || false;
    const hasError = recordingState.browser?.error || recordingState.server?.error;
    
    console.log('Recording state update:', {
      browser: recordingState.browser?.running,
      server: recordingState.server?.running,
      currentlyRecording,
      localIsRecording: isRecording,
      error: hasError
    });
    
    // If there's an error, stop recording
    if (hasError) {
      console.error('Recording error detected:', hasError);
      if (isRecording) {
        setIsRecording(false);
        setRecordingStartTime(undefined);
      }
      return;
    }
    
    // Sync local state with HMS (source of truth)
    if (currentlyRecording !== isRecording) {
      console.log(`Syncing recording state: ${isRecording} -> ${currentlyRecording}`);
      setIsRecording(currentlyRecording);
      
      // If HMS says recording is active but we didn't start it, show a toast
      if (currentlyRecording && !isRecording && !recordingStartTime) {
        toast({
          title: "Recording detected",
          description: "A recording is already in progress. Click the record button to stop it.",
          variant: "default",
        });
      }
    }
    
    // Manage recording start time
    if (currentlyRecording && !recordingStartTime) {
      const startTime = new Date();
      console.log('Setting recording start time:', startTime);
      setRecordingStartTime(startTime);
    } else if (!currentlyRecording && recordingStartTime) {
      console.log('Clearing recording start time');
      setRecordingStartTime(undefined);
    }
  }, [recordingState]);

  // 🔁 Handle screen share toggle directly on click
  const handleToggleScreenShare = async () => {
    const nextState = !isScreenShareEnabled;

    try {
      await actions.setScreenShareEnabled(nextState);
      setIsScreenShareEnabled(nextState);
    } catch (error) {
      toast({
        title: "Something went wrong.",
        description: nextState
          ? "Your screen cannot be shared. Please try again."
          : "There is an issue disabling screen share. Please try again.",
        variant: "destructive",
      });
    }
  };

  // 🔗 Handle invite link copy
  const handleCopyInviteLink = async () => {
    try {
      // Generate preview link instead of direct call link
      const baseUrl = window.location.origin;
      const inviteUrl = `${baseUrl}/preview/${roomId}`;
      await copyToClipboard(inviteUrl);
      toast({
        title: "Copied to clipboard",
        description: "The invite link has been copied to your clipboard.",
        variant: "default",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy the link. Please try again.",
        variant: "destructive",
      });
    }
  };

  // 🎥 Handle recording toggle
  const handleToggleRecording = async () => {
    // Check the actual recording state from 100ms
    const currentlyRecording = recordingState.browser?.running || recordingState.server?.running || false;
    
    console.log('Toggle recording clicked:', {
      currentlyRecording,
      localIsRecording: isRecording,
      recordingState,
      startedAt: recordingStartTime
    });
    
    try {
      if (currentlyRecording) {
        // Stop recording
        console.log('Stopping recording...', {
          browserRunning: recordingState.browser?.running,
          serverRunning: recordingState.server?.running,
        });
        
        try {
          await actions.stopRTMPAndRecording();
          console.log('Recording stopped successfully');
          
          toast({
            title: "Recording stopped",
            description: "The recording has been stopped successfully.",
            variant: "default",
          });
        } catch (stopError: any) {
          console.error('Stop recording error:', stopError);
          const stopErrorMsg = stopError.message || String(stopError);
          
          // If recording doesn't exist, just sync state
          if (stopErrorMsg.includes("does not exist") || stopErrorMsg.includes("not found")) {
            console.log('Recording already stopped, syncing state');
            setIsRecording(false);
            setRecordingStartTime(undefined);
            toast({
              title: "Recording cleared",
              description: "Recording state has been reset.",
              variant: "default",
            });
            return;
          }
          
          throw stopError;
        }
      } else {
        // Check if running on localhost
        const baseUrl = window.location.origin;
        const isLocalhost = baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1');
        
        if (isLocalhost) {
          toast({
            title: "Recording unavailable on localhost",
            description: "Recording requires a public URL. Deploy your app or use ngrok to enable recording.",
            variant: "destructive",
          });
          return;
        }
        
        // Start recording - using browser recording
        console.log('Starting recording...');
        const meetingURL = `${baseUrl}/call/${roomId}`;
        
        console.log('Recording config:', {
          meetingURL,
          rtmpURLs: [],
          record: true
        });
        
        await actions.startRTMPOrRecording({
          meetingURL,
          rtmpURLs: [], // Empty for recording only, not streaming
          record: true,
        });
        
        toast({
          title: "Recording started",
          description: "The call is now being recorded.",
          variant: "default",
        });
        
        console.log('Recording started successfully, HMS will update state');
      }
    } catch (error) {
      console.error("Recording error:", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isAlreadyStartedError = errorMessage.includes("Recording already started");
      const isConnectionError = errorMessage.includes("couldn't connect") || 
                                errorMessage.includes("Meeting URL");
      const isPermissionError = errorMessage.includes("does not have required permission");
      const isNotFoundError = errorMessage.includes("does not exist") || 
                             errorMessage.includes("not found") ||
                             errorMessage.includes("Recording not found") ||
                             errorMessage.includes("No stream running");
      
      // If recording already started on HMS, sync local state with server
      if (isAlreadyStartedError) {
        console.log("Recording already active on HMS, syncing local state...");
        const actualRecordingState = recordingState.browser?.running || recordingState.server?.running || false;
        setIsRecording(actualRecordingState);
        if (actualRecordingState && !recordingStartTime) {
          setRecordingStartTime(new Date());
        }
        toast({
          title: "Recording already active",
          description: "This call is already being recorded.",
          variant: "default",
        });
        return;
      }
      
      // If recording doesn't exist (orphaned state), clear local state
      if (isNotFoundError) {
        console.log("Recording doesn't exist on HMS, clearing local state...");
        setIsRecording(false);
        setRecordingStartTime(undefined);
        toast({
          title: "Recording state cleared",
          description: "The recording was already stopped or doesn't exist.",
          variant: "default",
        });
        return;
      }
      
      // For other errors, reset states
      setIsRecording(false);
      setRecordingStartTime(undefined);
      
      let errorDescription = "Failed to start recording. Please try again.";
      if (isPermissionError) {
        errorDescription = "Your role lacks recording permission. Enable 'Browser Recording' for the host role in your 100ms template.";
      } else if (isConnectionError) {
        errorDescription = "100ms servers cannot reach your URL. Deploy the app or use a public URL.";
      } else if (currentlyRecording) {
        errorDescription = "Failed to stop recording. Please try again.";
      }
      
      toast({
        title: "Recording failed",
        description: errorDescription,
        variant: "destructive",
      });
    }
  };

  return (
    <footer className="flex-shrink-0 rounded-lg flex items-center justify-between gap-4 px-5 py-8 bg-neutral-950 flex-wrap">
      {/* Recording Timer */}
      <RecordingTimer isRecording={isRecording} startedAt={recordingStartTime} />
      
      <div className="flex gap-3 flex-wrap">
        {/* Mic toggle */}
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleAudio}
          className="rounded-full flex justify-center items-center bg-neutral-800 py-6 px-4"
        >
          {isLocalAudioEnabled ? (
            <MicOnIcon color="white" width={20} height={20} />
          ) : (
            <MicOffIcon color="white" width={20} height={20} />
          )}
        </Button>

        {/* Video toggle */}
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleVideo}
          className="rounded-full flex justify-center items-center py-6 px-4 bg-neutral-800"
        >
          {isLocalVideoEnabled ? (
            <VideoOnIcon color="white" width={20} height={20} />
          ) : (
            <VideoOffIcon color="white" width={20} height={20} />
          )}
        </Button>

        {/* Screen share toggle */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleToggleScreenShare}
          className="rounded-full flex justify-center items-center py-6 px-4 bg-neutral-800"
        >
          <ShareScreenIcon color="white" width={20} height={20} />
        </Button>

        {/* Recording toggle */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleToggleRecording}
          className={`rounded-full flex justify-center items-center py-6 px-4 ${
            isRecording ? "bg-red-600 animate-pulse" : "bg-neutral-800"
          }`}
          title={isRecording ? "Stop Recording (Auto-recording active)" : "Start Recording (Manual override)"}
        >
          <Icons.record color="white" width={20} height={20} />
        </Button>

        {/* Chat with Reactions, Threading, Edit/Delete */}
        <CallChatEnhanced callId={roomId || "unknown"} roomId={roomId || "unknown"} />

        {/* File Transfer */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setShowFileTransfer(!showFileTransfer)}
          className="rounded-full flex justify-center items-center py-6 px-4 bg-neutral-800"
          title="File Transfer"
        >
          <Icons.file color="white" width={20} height={20} />
        </Button>

        {/* Copy invite link */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopyInviteLink}
          className="rounded-full flex justify-center items-center py-6 px-4 bg-neutral-800"
        >
          <Icons.invite color="white" width={20} height={20} />
        </Button>

        {/* Hang up / Rejoin popup */}
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setShowRejoinPopup(true);
          }}
          className="rounded-full flex justify-center py-6 bg-red-500"
        >
          <HangUpIcon color="white" width={25} height={25} />
        </Button>
      </div>

      <span className="text-xs text-neutral-400 font-semibold uppercase tracking-wide">
        Cambliss
      </span>

      {/* File Transfer Panel with Drag & Drop, Progress, Preview */}
      {showFileTransfer && roomId && (
        <FileTransferEnhanced 
          callId={roomId}
          roomId={roomId}
        />
      )}

      {showRejoinPopup && (
        <RejoinCall
          roomName={roomName ? roomName : extractId(params.slug as string)}
          stayOnScreenHandler={() => setShowRejoinPopup(false)}
          roomId={roomId as string}
        />
      )}
    </footer>
  );
}
