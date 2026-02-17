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
import CallChat from "./call-chat";
import RecordingTimer from "./recording-timer";

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

  const { copyToClipboard } = useClipboard();

  // 🎥 Update recording state when it changes
  React.useEffect(() => {
    const currentlyRecording = recordingState.browser?.running || recordingState.server?.running || false;
    
    console.log('Recording state update:', {
      browser: recordingState.browser?.running,
      server: recordingState.server?.running,
      currentlyRecording,
      isRecording,
      error: recordingState.browser?.error || recordingState.server?.error
    });
    
    // Check for recording errors
    const hasError = recordingState.browser?.error || recordingState.server?.error;
    
    if (hasError && isRecording) {
      // Recording failed, reset state
      console.error('Recording error detected:', hasError);
      setIsRecording(false);
      setRecordingStartTime(undefined);
    }
    
    // Update the recording state
    setIsRecording(currentlyRecording);
    
    // If recording just started and we don't have a start time, set it
    if (currentlyRecording && !recordingStartTime) {
      setRecordingStartTime(new Date());
    }
    
    // If recording stopped, clear the start time
    if (!currentlyRecording && recordingStartTime) {
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
      isRecording,
      recordingState
    });
    
    try {
      if (currentlyRecording) {
        // Stop recording
        console.log('Stopping recording...');
        await actions.stopRTMPAndRecording();
        setIsRecording(false);
        setRecordingStartTime(undefined);
        toast({
          title: "Recording stopped",
          description: "The recording has been stopped successfully.",
          variant: "default",
        });
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
        
        await actions.startRTMPOrRecording({
          meetingURL,
          rtmpURLs: [], // Empty for recording only, not streaming
          record: true,
        });
        
        const startTime = new Date();
        setIsRecording(true);
        setRecordingStartTime(startTime);
        
        toast({
          title: "Recording started",
          description: "The call is now being recorded.",
          variant: "default",
        });
        
        console.log('Recording started at:', startTime);
      }
    } catch (error) {
      console.error("Recording error:", error);
      
      // Reset states on error
      setIsRecording(false);
      setRecordingStartTime(undefined);
      
      // Check if it's a connection error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isConnectionError = errorMessage.includes("couldn't connect") || 
                                errorMessage.includes("Meeting URL");
      
      toast({
        title: "Recording failed",
        description: isConnectionError
          ? "100ms servers cannot reach your URL. Deploy the app or use a public URL."
          : currentlyRecording
          ? "Failed to stop recording. Please try again."
          : "Failed to start recording. Please try again.",
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
          title={isRecording ? "Stop Recording" : "Start Recording"}
        >
          <Icons.record color="white" width={20} height={20} />
        </Button>

        {/* Chat */}
        <CallChat />

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
