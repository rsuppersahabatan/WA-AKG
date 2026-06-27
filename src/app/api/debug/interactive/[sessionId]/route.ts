// DEBUG: Test send interactive list message via raw protobuf
import { NextResponse, NextRequest } from "next/server";
import { waManager } from "@/modules/whatsapp/manager";
import { getAuthenticatedUser, canAccessSession } from "@/lib/api-auth";
import { generateWAMessageFromContent, proto } from "@whiskeysockets/baileys";

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
        const mode = body.mode || "list"; // "list" | "button" | "interactive"

        if (!jid) return NextResponse.json({ status: false, message: "jid required" }, { status: 400 });

        let result: any;

        if (mode === "list") {
            // Test 1: Native list message via raw protobuf
            const listMsg = {
                listMessage: {
                    title: "Pilih Menu",
                    description: "Silakan pilih salah satu:",
                    buttonText: "Lihat Menu",
                    listType: 1, // SINGLE_SELECT
                    sections: [
                        {
                            title: "Makanan",
                            rows: [
                                { title: "Nasi Goreng", description: "Rp 15.000", rowId: "nasi_goreng" },
                                { title: "Mie Ayam", description: "Rp 12.000", rowId: "mie_ayam" },
                                { title: "Bakso", description: "Rp 10.000", rowId: "bakso" },
                            ]
                        },
                        {
                            title: "Minuman",
                            rows: [
                                { title: "Es Teh", description: "Rp 5.000", rowId: "es_teh" },
                                { title: "Jus Jeruk", description: "Rp 8.000", rowId: "jus_jeruk" },
                            ]
                        }
                    ]
                }
            };

            const fullMsg = generateWAMessageFromContent(jid, listMsg, {
                userJid: instance.socket.user?.id || "",
                timestamp: new Date()
            });

            // @ts-ignore — relayMessage internal tapi available di socket
            await instance.socket.relayMessage(jid, fullMsg.message, {
                messageId: fullMsg.key.id
            });

            result = { mode: "list", messageId: fullMsg.key.id };
        }
        else if (mode === "button") {
            // Test 2: Native button message via raw protobuf
            const btnMsg = {
                buttonsMessage: {
                    contentText: "Pilih salah satu:",
                    footerText: "Dibuat oleh WA-AKG",
                    headerType: 2, // TEXT
                    buttons: [
                        {
                            buttonId: "btn_yes",
                            buttonText: { displayText: "Ya" },
                            type: 1 // RESPONSE
                        },
                        {
                            buttonId: "btn_no",
                            buttonText: { displayText: "Tidak" },
                            type: 1
                        },
                        {
                            buttonId: "btn_maybe",
                            buttonText: { displayText: "Nanti" },
                            type: 1
                        }
                    ]
                }
            };

            const fullMsg = generateWAMessageFromContent(jid, btnMsg, {
                userJid: instance.socket.user?.id || "",
                timestamp: new Date()
            });

            // @ts-ignore
            await instance.socket.relayMessage(jid, fullMsg.message, {
                messageId: fullMsg.key.id
            });

            result = { mode: "button", messageId: fullMsg.key.id };
        }
        else if (mode === "interactive") {
            // Test 3: Interactive message (newer WhatsApp format)
            const interactiveMsg = {
                interactiveMessage: {
                    body: { text: "Pilih opsi dibawah:" },
                    footer: { text: "WA-AKG Interactive" },
                    header: { title: "Menu Interaktif" },
                    nativeFlowMessage: {
                        buttons: [
                            {
                                name: "quick_reply",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "Lihat Menu",
                                    id: "lihat_menu"
                                })
                            },
                            {
                                name: "quick_reply",
                                buttonParamsJson: JSON.stringify({
                                    display_text: "Hubungi Admin",
                                    id: "hubungi_admin"
                                })
                            }
                        ]
                    }
                }
            };

            const fullMsg = generateWAMessageFromContent(jid, interactiveMsg, {
                userJid: instance.socket.user?.id || "",
                timestamp: new Date()
            });

            // @ts-ignore
            await instance.socket.relayMessage(jid, fullMsg.message, {
                messageId: fullMsg.key.id
            });

            result = { mode: "interactive", messageId: fullMsg.key.id };
        }
        else {
            return NextResponse.json({ status: false, message: "Unknown mode: list|button|interactive" }, { status: 400 });
        }

        return NextResponse.json({ status: true, message: "Sent", data: result });

    } catch (error: any) {
        console.error("Interactive test error:", error);
        return NextResponse.json({
            status: false,
            message: error?.message || "Failed",
            error: error?.stack || String(error)
        }, { status: 500 });
    }
}
