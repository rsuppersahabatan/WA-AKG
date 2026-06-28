"use client";

import { useState, useEffect, useCallback } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Loader2, ChevronDown, X } from "lucide-react";

interface WebhookLog {
    id: string;
    webhookId: string;
    event: string;
    status: string;
    requestUrl: string;
    requestHeaders?: any;
    requestBody?: any;
    responseStatusCode?: number;
    responseBody?: string;
    responseTimeMs?: number;
    errorMessage?: string;
    createdAt: string;
}

interface Props {
    webhookId: string;
    webhookName: string;
    targetSessionId: string;
    open: boolean;
    onClose: () => void;
}

function formatTime(ts: string) {
    const d = new Date(ts);
    return d.toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
}

function formatJson(obj: any): string {
    try {
        return JSON.stringify(obj, null, 2);
    } catch {
        return String(obj);
    }
}

export default function WebhookLogDialog({ webhookId, webhookName, targetSessionId, open, onClose }: Props) {
    const [logs, setLogs] = useState<WebhookLog[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [meta, setMeta] = useState({ total: 0, offset: 0 });

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/webhooks/${targetSessionId}/${webhookId}/logs?limit=50&offset=0`);
            if (res.ok) {
                const data = await res.json();
                setLogs(data?.data || []);
                setMeta({ total: data.total || 0, offset: 50 });
            }
        } catch (e) {
            console.error("Failed to fetch logs", e);
        } finally {
            setLoading(false);
        }
    }, [webhookId, targetSessionId]);

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const res = await fetch(`/api/webhooks/${targetSessionId}/${webhookId}/logs?limit=50&offset=${meta.offset}`);
            if (res.ok) {
                const data = await res.json();
                const newEntries = data?.data || [];
                setLogs(prev => [...prev, ...newEntries]);
                setMeta(prev => ({ total: data.total || prev.total, offset: prev.offset + newEntries.length }));
            }
        } catch (e) {
            console.error("Failed to load more", e);
        } finally {
            setLoadingMore(false);
        }
    };

    // Realtime polling
    useEffect(() => {
        if (!open) return;
        fetchLogs();
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`/api/webhooks/${targetSessionId}/${webhookId}/logs?limit=1&offset=0`);
                if (res.ok) {
                    const data = await res.json();
                    const latest = data?.data?.[0];
                    if (latest && (logs.length === 0 || latest.id !== logs[0]?.id)) {
                        fetchLogs();
                    }
                }
            } catch { /* silent */ }
        }, 5000);
        return () => clearInterval(interval);
    }, [open, webhookId, targetSessionId]);

    const shown = logs.length;
    const total = meta.total;
    const hasMore = shown < total;

    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="flex items-center gap-2">
                                <History className="h-5 w-5" />
                                Webhook Logs
                            </DialogTitle>
                            <DialogDescription>
                                {webhookName} — Delivery history
                            </DialogDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </DialogHeader>

                <div className="flex items-center justify-between px-1 py-2 text-xs text-muted-foreground border-b">
                    <span className="flex items-center gap-2">
                        <span className="bg-slate-100 px-2 py-0.5 rounded-full font-medium">
                            {total} total
                        </span>
                        <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                            live
                        </span>
                    </span>
                    {loading && <Loader2 className="h-3 w-3 animate-spin" />}
                </div>

                <div className="flex-1 min-h-0">
                    {loading && logs.length === 0 ? (
                        <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Loading...
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 text-sm text-muted-foreground space-y-2">
                            <History className="h-10 w-10 opacity-20" />
                            <p>No delivery logs yet.</p>
                            <p className="text-xs">Logs appear after events are dispatched or when you click "Test".</p>
                        </div>
                    ) : (
                        <ScrollArea className="h-[55vh]">
                            <div className="divide-y">
                                {logs.map((log) => (
                                    <div
                                        key={log.id}
                                        className={`p-3 space-y-1 text-sm ${
                                            log.status === "SUCCESS"
                                                ? "hover:bg-green-50/30"
                                                : "bg-red-50/30 hover:bg-red-50/60"
                                        }`}
                                    >
                                        {/* Header row */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Badge
                                                variant={log.status === "SUCCESS" ? "default" : "destructive"}
                                                className="text-[10px] px-1.5 py-0"
                                            >
                                                {log.status}
                                            </Badge>
                                            <span className="text-xs font-mono text-muted-foreground bg-slate-100 px-1 rounded">
                                                {log.event}
                                            </span>
                                            {log.responseStatusCode != null && (
                                                <span className={`text-xs font-mono font-semibold ${
                                                    log.responseStatusCode < 400 ? "text-green-600" : "text-red-600"
                                                }`}>
                                                    {log.responseStatusCode}
                                                </span>
                                            )}
                                            {log.responseTimeMs != null && (
                                                <span className="text-xs text-muted-foreground">
                                                    {log.responseTimeMs < 1000
                                                        ? `${log.responseTimeMs}ms`
                                                        : `${(log.responseTimeMs / 1000).toFixed(1)}s`}
                                                </span>
                                            )}
                                            <span className="text-[10px] text-muted-foreground ml-auto whitespace-nowrap" title={formatTime(log.createdAt)}>
                                                {formatTime(log.createdAt)}
                                            </span>
                                        </div>

                                        {/* URL */}
                                        <div className="text-xs font-mono text-muted-foreground truncate" title={log.requestUrl}>
                                            {log.requestUrl}
                                        </div>

                                        {/* Error message */}
                                        {log.errorMessage && (
                                            <div className="text-xs text-red-600 bg-red-50 border border-red-100 p-1.5 rounded flex items-start gap-1">
                                                <span className="font-bold">✗</span>
                                                <span>{log.errorMessage}</span>
                                            </div>
                                        )}

                                        {/* Expandable sections */}
                                        <div className="flex flex-wrap gap-2 pt-1">
                                            {log.requestBody && (
                                                <details className="text-xs flex-1 min-w-0">
                                                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Request Body</summary>
                                                    <pre className="mt-1 bg-slate-50 p-2 rounded overflow-x-auto max-h-28 text-[10px] border">
                                                        {formatJson(log.requestBody)}
                                                    </pre>
                                                </details>
                                            )}
                                            {log.responseBody && (
                                                <details className="text-xs flex-1 min-w-0">
                                                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Response Body</summary>
                                                    <pre className="mt-1 bg-slate-50 p-2 rounded overflow-x-auto max-h-28 text-[10px] border">
                                                        {log.responseBody.length > 1000
                                                            ? log.responseBody.slice(0, 1000) + "..."
                                                            : log.responseBody}
                                                    </pre>
                                                </details>
                                            )}
                                            {log.requestHeaders && (
                                                <details className="text-xs flex-1 min-w-0">
                                                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Headers</summary>
                                                    <pre className="mt-1 bg-slate-50 p-2 rounded overflow-x-auto max-h-28 text-[10px] border">
                                                        {formatJson(log.requestHeaders)}
                                                    </pre>
                                                </details>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Load more */}
                            {hasMore ? (
                                <div className="p-3 border-t">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full text-xs"
                                        onClick={loadMore}
                                        disabled={loadingMore}
                                    >
                                        {loadingMore ? (
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                        ) : (
                                            <ChevronDown className="h-3 w-3 mr-1" />
                                        )}
                                        Load {total - shown} more
                                    </Button>
                                </div>
                            ) : shown > 0 ? (
                                <div className="p-2 border-t text-[10px] text-center text-muted-foreground">
                                    Showing all {total} entries
                                </div>
                            ) : null}
                        </ScrollArea>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
