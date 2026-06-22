"use client";

import { useState } from "react";
import { ChatList } from "./chat-list";
import { ChatWindow } from "./chat-window";
import { MessageCircle } from "lucide-react";

interface ChatLayoutClientProps {
    sessionId: string;
}

interface SelectedChat {
    jid: string;
    name?: string;
}

export function ChatLayoutClient({ sessionId }: ChatLayoutClientProps) {
    const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(null);

    const handleSelectChat = (jid: string, name?: string) => {
        setSelectedChat({ jid, name });
    };

    const handleBack = () => {
        setSelectedChat(null);
    };

    return (
        <div className="flex h-full bg-background rounded-xl border border-border/40 shadow-sm overflow-hidden">
            {/* Chat List Panel — always rendered, hidden on mobile when chat selected */}
            <div className={`w-full md:w-80 lg:w-[340px] border-r border-border/30 h-full overflow-hidden flex-shrink-0
                ${selectedChat ? "hidden md:flex md:flex-col" : "flex flex-col"}`}
            >
                <ChatList
                    sessionId={sessionId}
                    onSelectChat={handleSelectChat}
                    selectedJid={selectedChat?.jid}
                />
            </div>

            {/* Chat Window Panel */}
            <div className={`flex-1 h-full overflow-hidden
                ${!selectedChat ? "hidden md:block" : "block"}`}
            >
                {selectedChat ? (
                    <ChatWindow
                        sessionId={sessionId}
                        jid={selectedChat.jid}
                        name={selectedChat.name}
                        onBack={handleBack}
                    />
                ) : (
                    <div className="flex h-full items-center justify-center">
                        <div className="text-center p-6">
                            <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                                <MessageCircle className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Select a chat to start messaging
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
