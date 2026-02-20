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

    // 1) Fetch recording details to resolve asset IDs
    const recordingResponse = await fetch(
      `https://api.100ms.live/v2/recordings/${recordingId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${managementToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!recordingResponse.ok) {
      const errorText = await recordingResponse.text();
      console.error("100ms Get Recording API error:", errorText);

      if (recordingResponse.status === 404) {
        return NextResponse.json({ error: "Recording not found" }, { status: 404 });
      }

      return NextResponse.json(
        { error: "Failed to get recording details", details: errorText },
        { status: recordingResponse.status }
      );
    }

    type RecordingAsset = {
      id: string;
      type?: string;
      path?: string;
      status?: string;
    };

    const isVideoAsset = (asset: RecordingAsset) => {
      const type = (asset.type ?? "").toLowerCase();
      const path = (asset.path ?? "").toLowerCase();

      return (
        type.includes("room-composite") ||
        type.includes("video") ||
        type.includes("stream") ||
        path.endsWith(".mp4") ||
        path.endsWith(".m3u8")
      );
    };

    const recordingData = (await recordingResponse.json()) as {
      id?: string;
      status?: string;
      recording_assets?: RecordingAsset[];
    };

    const assets = (recordingData.recording_assets ?? []).filter(
      (asset) => asset?.id && asset?.status !== "failed" && isVideoAsset(asset)
    );

    if (!assets.length) {
      return NextResponse.json({
        links: [],
        status: recordingData.status ?? "unknown",
        message: "Video asset is not available yet. Please retry in 1-2 minutes.",
      });
    }

    // 2) Generate presigned URL for each asset
    const links = await Promise.all(
      assets.map(async (asset) => {
        const presignedResponse = await fetch(
          `https://api.100ms.live/v2/recording-assets/${asset.id}/presigned-url`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${managementToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!presignedResponse.ok) {
          const errorText = await presignedResponse.text();
          console.error(`100ms presigned URL error for asset ${asset.id}:`, errorText);
          return null;
        }

        const data = (await presignedResponse.json()) as {
          id?: string;
          url?: string;
          path?: string;
          expiry?: number;
        };

        if (!data.url) return null;

        return {
          id: data.id ?? asset.id,
          type: asset.type ?? "asset",
          url: data.url,
          path: data.path ?? asset.path,
          expiry: data.expiry,
        };
      })
    );

    const validLinks = links.filter(Boolean);

    return NextResponse.json({
      recordingId,
      status: recordingData.status ?? "unknown",
      links: validLinks,
    });
  } catch (error) {
    console.error("Error getting recording links:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
