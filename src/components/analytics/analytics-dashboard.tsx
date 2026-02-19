"use client";

import React, { useState, useEffect } from "react";
import { Icons } from "~/components/ui/icons";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

interface AnalyticsData {
  totalCalls: number;
  totalDuration: number;
  totalMessages: number;
  totalFiles: number;
  averageParticipants: number;
  peakUsageHours: { hour: number; count: number }[];
  recentActivity: Array<{
    date: string;
    calls: number;
    duration: number;
  }>;
}

export function AnalyticsDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "year">("week");

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`/api/analytics?range=${timeRange}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icons.spinner className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center text-white/50">
        No analytics data available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex gap-2">
        {(["week", "month", "year"] as const).map((range) => (
          <button
            key={range}
            onClick={() => setTimeRange(range)}
            className={`rounded-md px-4 py-2 text-sm capitalize transition-colors ${
              timeRange === range
                ? "bg-blue-500 text-white"
                : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            {range}
          </button>
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Calls</CardDescription>
            <CardTitle className="text-3xl">{analytics.totalCalls}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-neutral-500">
              {formatDuration(analytics.totalDuration)} total duration
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Messages Sent</CardDescription>
            <CardTitle className="text-3xl">{analytics.totalMessages}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-neutral-500">
              Across all calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Files Shared</CardDescription>
            <CardTitle className="text-3xl">{analytics.totalFiles}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-neutral-500">
              Successfully transferred
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Participants</CardDescription>
            <CardTitle className="text-3xl">
              {analytics.averageParticipants.toFixed(1)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-neutral-500">
              Per call
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Peak Usage Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Peak Usage Hours</CardTitle>
          <CardDescription>When you use Cambliss the most</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.peakUsageHours.slice(0, 5).map((item) => (
              <div key={item.hour} className="flex items-center gap-4">
                <div className="w-20 text-sm text-neutral-400">
                  {item.hour}:00 - {item.hour + 1}:00
                </div>
                <div className="flex-1">
                  <div className="h-6 overflow-hidden rounded-full bg-neutral-800">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{
                        width: `${(item.count / Math.max(...analytics.peakUsageHours.map(h => h.count))) * 100}%`,
                      }}
                    />
                  </div>
                </div>
                <div className="w-12 text-right text-sm text-neutral-400">
                  {item.count}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your call activity over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {analytics.recentActivity.map((day) => (
              <div
                key={day.date}
                className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3"
              >
                <div>
                  <div className="font-medium text-white">
                    {new Date(day.date).toLocaleDateString([], {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-sm text-neutral-400">
                    {day.calls} calls • {formatDuration(day.duration)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-400">
                    {formatDuration(day.duration / (day.calls || 1))}
                  </div>
                  <div className="text-xs text-neutral-500">
                    avg/call
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
