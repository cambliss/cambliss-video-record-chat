import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { prisma } from "~/server/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";
import { triggerPusherEvent, getCallChannel, PUSHER_EVENTS } from "~/lib/pusher-server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    const formData = await req.formData();
    const file = formData.get("file") as File;
    const callId = formData.get("callId") as string;
    const roomId = formData.get("roomId") as string;
    const senderName = formData.get("senderName") as string;
    const senderEmail = formData.get("senderEmail") as string;

    if (!file || !callId) {
      return NextResponse.json(
        { error: "File and callId are required" },
        { status: 400 }
      );
    }

    const roomIdCookie = req.cookies.get("room-id")?.value;
    const isAuthorized = !!session || roomIdCookie === callId || roomId === callId;

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "public", "uploads", callId);
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${timestamp}-${sanitizedFileName}`;
    const filePath = path.join(uploadsDir, fileName);

    // Save file to disk
    const bytes = await file.arrayBuffer();
    const buffer = new Uint8Array(bytes);
    await writeFile(filePath, buffer);

    // Save file transfer record to database
    const publicPath = `/uploads/${callId}/${fileName}`;
    const fileTransfer = await prisma.fileTransfer.create({
      data: {
        callId,
        senderName: senderName || "Anonymous",
        senderEmail: senderEmail || null,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type || "application/octet-stream",
        filePath: publicPath,
      },
    });

    // Trigger Pusher event for real-time updates to all participants
    const channelName = getCallChannel(callId);
    const eventTriggered = await triggerPusherEvent(
      channelName,
      PUSHER_EVENTS.FILE_UPLOADED,
      fileTransfer
    );
    
    if (eventTriggered) {
      console.log(`File upload broadcasted via Pusher to ${channelName}`);
    } else {
      console.log('Pusher not configured, relying on polling for real-time updates');
    }

    return NextResponse.json({
      success: true,
      id: fileTransfer.id,
      filePath: publicPath,
      fileName: file.name,
      fileSize: file.size,
    });

  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

