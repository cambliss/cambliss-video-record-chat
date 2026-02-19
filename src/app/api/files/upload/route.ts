import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { prisma } from "~/server/db";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

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

    // NOTE: File is now available to all participants in the call
    // The FileTransfer component polls the API every 3 seconds to fetch new files
    // For instant updates, consider implementing WebSocket/Pusher notifications:
    // await pusher.trigger(`call-${callId}`, 'file-uploaded', fileTransfer);

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

export const config = {
  api: {
    bodyParser: false,
  },
};
