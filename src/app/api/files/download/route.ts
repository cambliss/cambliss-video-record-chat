import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { readFile } from "fs/promises";
import path from "path";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 }
      );
    }

    // Security: ensure the file path is within the uploads directory
    const fullPath = path.join(process.cwd(), "public", filePath);
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    
    if (!fullPath.startsWith(uploadsDir)) {
      return NextResponse.json(
        { error: "Invalid file path" },
        { status: 403 }
      );
    }

    // Read and return the file
    const fileBuffer = await readFile(fullPath);
    const fileName = path.basename(fullPath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Content-Type": "application/octet-stream",
      },
    });

  } catch (error) {
    console.error("Error downloading file:", error);
    return NextResponse.json(
      { error: "File not found or internal server error" },
      { status: 500 }
    );
  }
}
