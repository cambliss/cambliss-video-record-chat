import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const managementToken = process.env.HMS_MANAGEMENT_TOKEN;
    
    if (!managementToken) {
      return NextResponse.json(
        { error: "HMS_MANAGEMENT_TOKEN not configured" },
        { status: 500 }
      );
    }

    // Fetch recordings from 100ms API
    const response = await fetch(
      "https://api.100ms.live/v2/recordings",
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
      console.error("100ms API error:", errorText);
      return NextResponse.json(
        { error: "Failed to fetch recordings", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching recordings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
