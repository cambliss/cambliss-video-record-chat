/*
  Warnings:

  - Added the required column `updatedAt` to the `FileTransfer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isEdited" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "replyToId" TEXT;

-- AlterTable
ALTER TABLE "FileTransfer" ADD COLUMN     "downloadCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isPreviewable" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "thumbnailPath" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "MessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "callId" TEXT,
    "relatedId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallAnalytics" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "peakParticipants" INTEGER NOT NULL DEFAULT 0,
    "totalParticipants" INTEGER NOT NULL DEFAULT 0,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "screenShareDuration" INTEGER NOT NULL DEFAULT 0,
    "recordingDuration" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recording" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "filePath" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "thumbnailPath" TEXT,
    "transcriptPath" TEXT,
    "s3Key" TEXT,
    "cloudUrl" TEXT,
    "isProcessed" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "shareToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "views" INTEGER NOT NULL DEFAULT 0,
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Recording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallSecurity" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "isPasswordProtected" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "isWaitingRoomEnabled" BOOLEAN NOT NULL DEFAULT false,
    "requireApproval" BOOLEAN NOT NULL DEFAULT false,
    "allowedEmails" TEXT[],
    "blockedUsers" TEXT[],
    "recordingConsent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallSecurity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallSettings" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "maxDuration" INTEGER,
    "autoRecording" BOOLEAN NOT NULL DEFAULT false,
    "chatEnabled" BOOLEAN NOT NULL DEFAULT true,
    "fileShareEnabled" BOOLEAN NOT NULL DEFAULT true,
    "screenShareEnabled" BOOLEAN NOT NULL DEFAULT true,
    "virtualBackgroundEnabled" BOOLEAN NOT NULL DEFAULT false,
    "noiseSuppression" BOOLEAN NOT NULL DEFAULT false,
    "breakoutRoomsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pollsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CallSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "MessageReaction_messageId_emoji_userEmail_key" ON "MessageReaction"("messageId", "emoji", "userEmail");

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_idx" ON "Notification"("userId", "isRead");

-- CreateIndex
CREATE INDEX "Notification_callId_idx" ON "Notification"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "CallAnalytics_callId_key" ON "CallAnalytics"("callId");

-- CreateIndex
CREATE INDEX "CallAnalytics_callId_idx" ON "CallAnalytics"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "Recording_shareToken_key" ON "Recording"("shareToken");

-- CreateIndex
CREATE INDEX "Recording_callId_idx" ON "Recording"("callId");

-- CreateIndex
CREATE INDEX "Recording_shareToken_idx" ON "Recording"("shareToken");

-- CreateIndex
CREATE UNIQUE INDEX "CallSecurity_callId_key" ON "CallSecurity"("callId");

-- CreateIndex
CREATE INDEX "CallSecurity_callId_idx" ON "CallSecurity"("callId");

-- CreateIndex
CREATE UNIQUE INDEX "CallSettings_callId_key" ON "CallSettings"("callId");

-- CreateIndex
CREATE INDEX "CallSettings_callId_idx" ON "CallSettings"("callId");

-- CreateIndex
CREATE INDEX "ChatMessage_replyToId_idx" ON "ChatMessage"("replyToId");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
