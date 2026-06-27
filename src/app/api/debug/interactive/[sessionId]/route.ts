// DEBUG: Test interactive messages — multiple format approaches
import { NextResponse, NextRequest } from "next/server";
import { waManager } from "@/modules/whatsapp/manager";
import { getAuthenticatedUser, canAccessSession } from "@/lib/api-auth";
import { generateWAMessageFromContent } from "@whiskeysockets/baileys";
import crypto from "crypto";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        const user = await getAuthenticatedUser(request);
        if (!user) return NextResponse.json({ status: false, message: "Unauthorized" }, { status: 401 });

        const { sessionId } = await params;
        const canAccess = await canAccessSession(user.id, user.role, sessionId);
        if (!canAccess) return NextResponse.json({ status: false, message: "Forbidden" }, { status: 403 });

        const instance = waManager.getInstance(sessionId);
        if (!instance?.socket) return NextResponse.json({ status: false, message: "Session not ready" }, { status: 503 });

        const body = await request.json();
        const jid = decodeURIComponent(body.jid || "");
        const mode = body.mode || "list";
        if (!jid) return NextResponse.json({ status: false, message: "jid required" }, { status: 400 });

        const secret = crypto.randomBytes(32);
        const userJid = instance.socket.user?.id || "";
        let fullMsg: any;

        if (mode === "list") {
            // Old format: ListMessage + messageContextInfo
            fullMsg = generateWAMessageFromContent(jid, {
                listMessage: {
                    title: "Pilih Menu",
                    description: "Silakan pilih:",
                    buttonText: "Lihat Menu",
                    listType: 1,
                    footerText: "WA-AKG",
                    sections: [
                        { title: "Makanan", rows: [
                            { title: "Nasi Goreng", description: "Rp 15.000", rowId: "nasi_goreng" },
                            { title: "Mie Ayam", description: "Rp 12.000", rowId: "mie_ayam" },
                        ]}
                    ]
                },
                messageContextInfo: { messageSecret: secret }
            }, { userJid, timestamp: new Date() });
            await (instance.socket as any).relayMessage(jid, fullMsg.message, { messageId: fullMsg.key.id });
        }
        else if (mode === "button") {
            // Old format: ButtonsMessage + messageContextInfo
            fullMsg = generateWAMessageFromContent(jid, {
                buttonsMessage: {
                    contentText: "Pilih salah satu:",
                    footerText: "WA-AKG",
                    headerType: 2,
                    buttons: [
                        { buttonId: "yes", buttonText: { displayText: "Ya" }, type: 1 },
                        { buttonId: "no", buttonText: { displayText: "Tidak" }, type: 1 },
                    ]
                },
                messageContextInfo: { messageSecret: secret }
            }, { userJid, timestamp: new Date() });
            await (instance.socket as any).relayMessage(jid, fullMsg.message, { messageId: fullMsg.key.id });
        }
        else if (mode === "list-v2") {
            // New format: InteractiveMessage + nativeFlow single_select
            fullMsg = generateWAMessageFromContent(jid, {
                interactiveMessage: {
                    body: { text: "Silakan pilih menu:" },
                    footer: { text: "WA-AKG" },
                    header: { title: "Menu Makanan" },
                    nativeFlowMessage: {
                        buttons: [{
                            name: "single_select",
                            buttonParamsJson: JSON.stringify({
                                title: "Pilih Menu",
                                sections: [
                                    { title: "Makanan", rows: [
                                        { title: "Nasi Goreng", description: "Rp 15.000", id: "nasi_goreng" },
                                        { title: "Mie Ayam", description: "Rp 12.000", id: "mie_ayam" },
                                    ]}
                                ]
                            })
                        }]
                    }
                },
                messageContextInfo: { messageSecret: secret }
            }, { userJid, timestamp: new Date() });
            await (instance.socket as any).relayMessage(jid, fullMsg.message, { messageId: fullMsg.key.id });
        }
        else if (mode === "btn-v2") {
            // New format: InteractiveMessage + nativeFlow quick_reply
            fullMsg = generateWAMessageFromContent(jid, {
                interactiveMessage: {
                    body: { text: "Pilih salah satu:" },
                    footer: { text: "WA-AKG" },
                    nativeFlowMessage: {
                        buttons: [
                            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Ya", id: "yes" }) },
                            { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "Tidak", id: "no" }) },
                        ]
                    }
                },
                messageContextInfo: { messageSecret: secret }
            }, { userJid, timestamp: new Date() });
            await (instance.socket as any).relayMessage(jid, fullMsg.message, { messageId: fullMsg.key.id });
        }
        else {
            return NextResponse.json({ status: false, message: "Unknown mode: list|button|list-v2|btn-v2" }, { status: 400 });
        }

        return NextResponse.json({ status: true, message: "Sent", data: { mode, messageId: fullMsg.key.id } });

    } catch (error: any) {
        console.error("Interactive test error:", error);
        return NextResponse.json({
            status: false,
            message: error?.message || "Failed",
            error: error?.stack || String(error)
        }, { status: 500 });
    }
}
