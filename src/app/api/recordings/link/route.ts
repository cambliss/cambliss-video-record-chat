import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { generateManagementToken } from "~/server/management-token";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get recording ID from query params
    const { searchParams } = new URL(req.url);
    const recordingId = searchParams.get("recordingId");

    if (!recordingId) {
      return NextResponse.json(
        { error: "Recording ID is required" },
        { status: 400 }
      );
    }

    // Generate management token dynamically
    const managementToken = await generateManagementToken();

    // Get recording links from 100ms API
    // This returns pre-signed URLs with validity period
    const response = await fetch(
      `https://api.100ms.live/v2/recording-links/${recordingId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${managementToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("100ms Get Recording Link API error:", errorText);
      
      // Handle specific error cases
      if (response.status === 404) {
        return NextResponse.json(
          { error: "Recording not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: "Failed to get recording links", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // The response contains links for each asset
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error getting recording links:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
