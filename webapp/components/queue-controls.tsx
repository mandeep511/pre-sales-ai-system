"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, Square, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/backend-config";
import { useCallReadiness } from "@/app/context/call-readiness-context";

interface QueueControlsProps {
  campaignId: string;
}

export function QueueControls({ campaignId }: QueueControlsProps) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { ensureReady } = useCallReadiness();

  const loadStatus = useCallback(async () => {
    try {
      const res = await apiFetch(`/queue/status/${campaignId}`);
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (err) {
      console.error("Failed to load queue status:", err);
    }
  }, [campaignId]);

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, [loadStatus]);

  async function handleStart() {
    const ready = await ensureReady();
    if (!ready) return;
    setLoading(true);
    try {
      await apiFetch(`/queue/start/${campaignId}`, {
        method: "POST",
      });
      await loadStatus();
    } catch (err) {
      console.error("Failed to start queue:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePause() {
    setLoading(true);
    try {
      await apiFetch(`/queue/pause/${campaignId}`, {
        method: "POST",
      });
      await loadStatus();
    } catch (err) {
      console.error("Failed to pause queue:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleStop() {
    setLoading(true);
    try {
      await apiFetch(`/queue/stop/${campaignId}`, {
        method: "POST",
      });
      await loadStatus();
    } catch (err) {
      console.error("Failed to stop queue:", err);
    } finally {
      setLoading(false);
    }
  }

  if (!status) return <div>Loading queue status...</div>;

  const isRunning = status.isRunning;
  const queueState = status.state;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Queue Control</CardTitle>
            <CardDescription>Manage call queue processing</CardDescription>
          </div>
          <Badge variant={isRunning ? "default" : "secondary"}>
            {queueState?.status || "idle"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{queueState?.totalQueued || 0}</p>
            <p className="text-xs text-muted-foreground">Queued</p>
          </div>
          <div>
            <p className="text-2xl font-bold">
              {queueState?.totalCompleted || 0}
            </p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{queueState?.totalFailed || 0}</p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
        </div>

        <div className="flex gap-2">
          {!isRunning ? (
            <Button onClick={handleStart} disabled={loading} className="flex-1">
              <Play className="h-4 w-4 mr-2" />
              Start Queue
            </Button>
          ) : (
            <>
              <Button
                onClick={handlePause}
                disabled={loading}
                variant="outline"
                className="flex-1"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button
                onClick={handleStop}
                disabled={loading}
                variant="destructive"
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </>
          )}
          <Button
            onClick={loadStatus}
            disabled={loading}
            variant="ghost"
            size="icon"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {status.leadCounts && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2">Lead Status Breakdown</p>
            <div className="space-y-1 text-sm">
              {(status.leadCounts as Array<any>).map((count) => (
                <div key={count.status} className="flex justify-between">
                  <span className="text-muted-foreground">{count.status}</span>
                  <span className="font-medium">{count._count}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
