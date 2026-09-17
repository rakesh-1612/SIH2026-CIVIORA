"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getCiviConnectRoom,
  getCiviConnectMessages,
  sendCiviConnectMessage,
  uploadEvidenceFile,
  CiviConnectRoom,
  CiviConnectMessage
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/ui/ToastProvider";
import { useTranslation } from "@/lib/LanguageContext";
import {
  MessageSquare,
  Send,
  Paperclip,
  Users,
  Sparkles,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Building2,
  Landmark,
  GraduationCap,
  User,
  X
} from "lucide-react";

interface CiviConnectChatProps {
  projectId: string;
  projectName?: string;
  challengeTitle?: string;
}

export function CiviConnectChat({ projectId, projectName, challengeTitle }: CiviConnectChatProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [room, setRoom] = useState<CiviConnectRoom | null>(null);
  const [messages, setMessages] = useState<CiviConnectMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Composer State
  const [inputMessage, setInputMessage] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [sending, setSending] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Internal Chat Container Scroll Helper (Never touches the main browser page window)
  const scrollInternalChatToBottom = (smooth = true) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? "smooth" : "auto"
      });
    }
  };

  // Check if user is scrolled near bottom inside the chat container
  const isUserNearBottom = () => {
    if (!chatContainerRef.current) return true;
    const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
    return scrollHeight - scrollTop - clientHeight < 120;
  };

  // Fetch Room metadata and initial message stream
  const fetchChatData = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const [roomData, msgData] = await Promise.all([
        getCiviConnectRoom(projectId),
        getCiviConnectMessages(projectId)
      ]);
      setRoom(roomData);

      setMessages((prevMsgs) => {
        const hasNewMsg = msgData.length > prevMsgs.length;
        const nearBottom = isUserNearBottom();

        // Scroll internal chat container ONLY if initial load OR (new message AND user near bottom)
        if (isInitial || (hasNewMsg && nearBottom)) {
          setTimeout(() => {
            scrollInternalChatToBottom(!isInitial);
          }, 60);
        }
        return msgData;
      });
      setError(null);
    } catch (err: unknown) {
      console.error("CIVI-CONNECT fetch error:", err);
      const msg = err instanceof Error ? err.message : "Unable to access CIVI-CONNECT collaboration room";
      setError(msg);
    } finally {
      if (isInitial) setLoading(false);
    }
  };

  useEffect(() => {
    requestAnimationFrame(() => fetchChatData(false));

    // Polling interval for real-time collaboration (every 3 seconds)
    const interval = setInterval(() => {
      fetchChatData(false);
    }, 3000);

    return () => clearInterval(interval);
  }, [projectId]);

  // Handle File Upload Attachment
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 10 * 1024 * 1024) {
        showToast("File size limit is 10MB", "error");
        return;
      }
      setSelectedFile(file);
    }
  };

  // Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputMessage.trim() && !selectedFile) || sending) return;

    setSending(true);
    let attachmentUrl: string | undefined = undefined;

    try {
      // Step 1: Upload attachment if file selected
      if (selectedFile) {
        setUploadingFile(true);
        const uploadRes = await uploadEvidenceFile(selectedFile);
        attachmentUrl = uploadRes.url;
        setUploadingFile(false);
      }

      // Step 2: Send Message to CIVI-CONNECT API
      const msgText = inputMessage.trim();
      setInputMessage("");
      setSelectedFile(null);

      const createdMsg = await sendCiviConnectMessage(projectId, msgText, attachmentUrl);
      setMessages((prev) => [...prev, createdMsg]);
      showToast("Message delivered to project room", "success");

      // Auto-scroll internal chat container to newest message on user send
      setTimeout(() => {
        scrollInternalChatToBottom(true);
      }, 60);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Failed to send message";
      showToast(errorMsg, "error");
    } finally {
      setSending(false);
      setUploadingFile(false);
    }
  };


  // Role Badge Renderer
  const renderRoleBadge = (role: string) => {
    const r = (role || "").toUpperCase();
    if (r === "CITIZEN") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-teal-50 border border-teal-200 text-teal-800 text-[10px] font-extrabold uppercase">
          <User className="w-3 h-3 text-teal-700" /> CITIZEN
        </span>
      );
    }
    if (r.includes("UNIVERSITY") || r === "ACADEMIC") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-extrabold uppercase">
          <GraduationCap className="w-3 h-3 text-indigo-600" /> UNIVERSITY
        </span>
      );
    }
    if (r.includes("MSME") || r.includes("INDUSTRY")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-extrabold uppercase">
          <Building2 className="w-3 h-3 text-amber-600" /> MSME / INDUSTRY
        </span>
      );
    }
    if (r.includes("GOVERNMENT") || r.includes("ADMIN")) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold uppercase">
          <Landmark className="w-3 h-3 text-emerald-600" /> GOVERNMENT
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-mono font-bold uppercase">
        <ShieldCheck className="w-3 h-3 text-teal-700" /> {role}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="p-8 rounded-3xl bg-white border border-slate-200 flex flex-col items-center justify-center gap-3 text-slate-500 min-h-[300px]">
        <Loader2 className="w-7 h-7 animate-spin text-purple-600" />
        <span className="text-xs font-extrabold">Loading CIVI-CONNECT Collaboration Room...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-3xl bg-red-50 border border-red-200 text-red-600 space-y-2 text-center">
        <AlertCircle className="w-6 h-6 text-red-600 mx-auto" />
        <h4 className="text-sm font-extrabold">CIVI-CONNECT Access Restricted</h4>
        <p className="text-xs font-medium text-red-600 max-w-md mx-auto">{error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden flex flex-col space-y-0">
      
      {/* ---------------------------------------------------------------------- */}
      {/* 1. ROOM HEADER (Magenta / Purple #A855F7 Theme) */}
      {/* ---------------------------------------------------------------------- */}
      <div className="p-5 bg-gradient-to-r from-purple-700 via-purple-600 to-indigo-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/15 border border-white/25 text-purple-100 text-[10px] font-extrabold uppercase tracking-wider backdrop-blur-xs">
            <Sparkles className="w-3 h-3 text-purple-200" /> CIVI-CONNECT • UNIFIED STAKEHOLDER COLLABORATION
          </div>
          <h3 className="text-lg font-extrabold tracking-tight flex items-center gap-2 text-white">
            <MessageSquare className="w-5 h-5 text-purple-200" /> Project Collaboration Room
          </h3>
          <p className="text-xs text-purple-100 font-mono font-medium">
            {projectId} • {projectName || room?.project_name || challengeTitle}
          </p>
        </div>

        {/* 4 Participants Badge */}
        <div className="flex items-center gap-2 bg-purple-900/60 px-3 py-2 rounded-2xl border border-purple-500/40 shrink-0">
          <Users className="w-4 h-4 text-purple-200" />
          <div className="text-xs">
            <div className="font-extrabold text-white">4 Unified Participants</div>
            <div className="text-[10px] text-purple-200 font-medium">Citizen • University • MSME • Govt</div>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------------- */}
      {/* 2. MESSAGES STREAM */}
      {/* ---------------------------------------------------------------------- */}
      <div ref={chatContainerRef} className="p-4 sm:p-6 bg-slate-50 max-h-[460px] min-h-[300px] overflow-y-auto space-y-4">
        {messages.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs font-semibold space-y-2 bg-white rounded-2xl border border-slate-200">
            <MessageSquare className="w-8 h-8 text-purple-600 mx-auto" />
            <div className="font-extrabold text-slate-900">No messages logged in this project room yet.</div>
            <p className="text-[11px] text-slate-500">
              Citizens, University R&D teams, MSME funding partners, and Government officials communicate here in real time.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            // SYSTEM AUTOMATED LIFECYCLE EVENT MESSAGE
            if (msg.is_system_message || msg.sender_role === "SYSTEM") {
              return (
                <div key={msg.id} className="my-3 flex justify-center">
                  <div className="px-4 py-2 rounded-2xl bg-purple-50 border border-purple-200 text-purple-800 text-xs font-semibold shadow-xs flex items-center gap-2 max-w-xl text-center">
                    <span className="px-1.5 py-0.5 rounded bg-purple-600 text-white font-mono text-[9px] font-extrabold">SYSTEM</span>
                    <span>{msg.message}</span>
                  </div>
                </div>
              );
            }

            const isCurrentUser = user && msg.sender_id === user.id;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col space-y-1 ${isCurrentUser ? "items-end" : "items-start"}`}
              >
                {/* Header: Sender Name & Role */}
                <div className="flex items-center gap-2 px-1 text-xs">
                  <span className="font-extrabold text-slate-900">{msg.sender_name}</span>
                  {renderRoleBadge(msg.sender_role)}
                  <span className="font-mono text-[10px] text-slate-400 font-semibold">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`p-4 rounded-3xl text-xs max-w-lg leading-relaxed space-y-2 shadow-xs ${
                    isCurrentUser
                      ? "bg-purple-600 text-white rounded-tr-xs"
                      : "bg-white border border-slate-200 text-slate-800 rounded-tl-xs"
                  }`}
                >
                  <p className="font-medium whitespace-pre-wrap">{msg.message}</p>

                  {/* Attachment Preview */}
                  {msg.attachment_url && (
                    <div className="pt-2">
                      {msg.attachment_url.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                        <div className="relative rounded-2xl overflow-hidden border border-black/10 bg-slate-100 max-w-xs">
                          <img
                            src={msg.attachment_url}
                            alt="Attachment"
                            className="w-full h-auto max-h-48 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                            onClick={() => window.open(msg.attachment_url!, "_blank")}
                          />
                        </div>
                      ) : (
                        <a
                          href={msg.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                            isCurrentUser
                              ? "bg-purple-700 border-purple-800 text-white hover:bg-purple-800"
                              : "bg-slate-100 border-slate-200 text-slate-800 hover:bg-slate-200"
                          }`}
                        >
                          <FileText className="w-4 h-4" /> Download Shared Document Attachment
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>


      {/* ---------------------------------------------------------------------- */}
      {/* 3. MESSAGE COMPOSER */}
      {/* ---------------------------------------------------------------------- */}
      <div className="p-4 bg-white border-t border-slate-200 space-y-3">
        {selectedFile && (
          <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-purple-50 border border-purple-200 text-xs font-bold text-purple-900">
            <div className="flex items-center gap-2 truncate">
              {selectedFile.type.startsWith("image/") ? (
                <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-purple-600 shrink-0" />
              )}
              <span className="truncate">{selectedFile.name}</span>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="p-1 hover:bg-purple-100 rounded-lg text-purple-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          {/* File Attachment Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-2xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer shrink-0"
            title="Attach Document or Image"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Message Input */}
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={t("civiConnect.typeMessage", "Write a message to project team...")}
            className="flex-1 px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:border-purple-600 focus:bg-white transition-all"
          />

          {/* Send Button */}
          <button
            type="submit"
            disabled={sending || (!inputMessage.trim() && !selectedFile)}
            className="px-5 py-3 rounded-2xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-extrabold text-xs shadow-xs transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer shrink-0"
          >
            {sending || uploadingFile ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{t("civiConnect.send", "Send")}</span>
                <Send className="w-3.5 h-3.5 ltr:rotate-0 rtl:rotate-180 transition-transform" />
              </>
            )}
          </button>
        </form>
      </div>

    </div>
  );
}
