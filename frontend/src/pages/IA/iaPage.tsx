import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import PageMeta from "@/components/common/PageMeta";
import { apiUrl } from "@/config/api";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type ApiRole = ChatRole | "system";

type ApiMessage = {
  role: ApiRole;
  content: string;
};

type ChatItemGroup = "Today" | "Yesterday" | "Last Week";

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

export default function IaPage() {
  const pageName = "Asistente IA";
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastErrorStatus, setLastErrorStatus] = useState<number | null>(null);
  const [lastErrorKind, setLastErrorKind] = useState<'cors' | 'upstream_502' | 'http' | 'network' | 'unknown' | null>(null);
  const [openConversationMenuId, setOpenConversationMenuId] = useState<string | null>(null);
  const [renameConversationId, setRenameConversationId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const STORAGE_KEY = 'ia_conversations_v1';

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    try {
      messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    } catch {
      return;
    }
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : parsed?.conversations;
      if (!Array.isArray(list)) return;
      const sanitized: Conversation[] = list
        .filter((c: any) => c && typeof c.id === 'string')
        .map((c: any) => ({
          id: String(c.id),
          title: typeof c.title === 'string' && c.title.trim() ? c.title : 'Nuevo chat',
          createdAt: typeof c.createdAt === 'string' ? c.createdAt : new Date().toISOString(),
          updatedAt: typeof c.updatedAt === 'string' ? c.updatedAt : new Date().toISOString(),
          messages: Array.isArray(c.messages) ? c.messages : [],
        }));
      setConversations(sanitized);
      if (sanitized.length) {
        const last = sanitized
          .slice()
          .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
        if (last?.id) {
          setActiveConversationId(last.id);
          setMessages(Array.isArray(last.messages) ? last.messages : []);
        }
      }
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch {
      return;
    }
  }, [conversations]);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    scrollToBottom(messages.length <= 1 ? 'auto' : 'smooth');
  }, [messages]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!openConversationMenuId) return;
      const el = menuRef.current;
      if (!el) return;
      if (e.target instanceof Node && el.contains(e.target)) return;
      setOpenConversationMenuId(null);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [openConversationMenuId]);

  const systemPrompt =
    "Eres un asistente de IA profesional. Responde siempre en español neutro. Usa el contexto de toda la conversación (mensajes anteriores) para mantener continuidad. No inventes datos como fechas actuales; si no sabes algo, dilo. No digas que eres de Google, Meta, Moonshot, Kimi, etc.; solo di que eres un asistente de IA.";

  const groupForIso = (iso: string): ChatItemGroup => {
    const ts = Date.parse(iso);
    if (!Number.isFinite(ts)) return 'Last Week';
    const now = new Date();
    const d = new Date(ts);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfD = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.floor((startOfToday - startOfD) / (24 * 60 * 60 * 1000));
    if (diffDays <= 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return 'Last Week';
  };

  const filteredConversations = useMemo(() => {
    const q = chatSearch.trim().toLowerCase();
    const list = Array.isArray(conversations) ? conversations : [];
    if (!q) return list;
    return list.filter((c) => (c.title || '').toLowerCase().includes(q));
  }, [conversations, chatSearch]);

  const byGroup = useMemo(() => {
    const groups: Record<ChatItemGroup, Conversation[]> = {
      Today: [],
      Yesterday: [],
      "Last Week": [],
    };
    const list = filteredConversations
      .slice()
      .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
    for (const c of list) {
      const g = groupForIso(c.updatedAt);
      groups[g].push(c);
    }
    return groups;
  }, [filteredConversations]);

  const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token");

  const getConversationTitle = (list: ChatMessage[]) => {
    const firstUser = list.find((m) => m.role === 'user' && String(m.content || '').trim());
    const raw = String(firstUser?.content || '').trim();
    if (!raw) return 'Nuevo chat';
    return raw.length > 44 ? `${raw.slice(0, 44)}…` : raw;
  };

  const generateConversationId = () => `c_${Date.now()}_${Math.random().toString(16).slice(2)}`;

  const upsertActiveConversation = (nextMessages: ChatMessage[]) => {
    const nowIso = new Date().toISOString();
    const id = activeConversationIdRef.current;
    setConversations((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const title = getConversationTitle(nextMessages);
      if (!id) {
        const newId = generateConversationId();
        activeConversationIdRef.current = newId;
        setActiveConversationId(newId);
        return [{ id: newId, title, createdAt: nowIso, updatedAt: nowIso, messages: nextMessages }, ...list];
      }
      const idx = list.findIndex((c) => c.id === id);
      if (idx < 0) {
        return [{ id, title, createdAt: nowIso, updatedAt: nowIso, messages: nextMessages }, ...list];
      }
      const copy = list.slice();
      const existing = copy[idx];
      copy[idx] = {
        ...existing,
        title: title || existing.title,
        updatedAt: nowIso,
        messages: nextMessages,
      };
      return copy;
    });
  };

  const handleNewChat = () => {
    const nowIso = new Date().toISOString();
    const id = generateConversationId();
    const convo: Conversation = { id, title: 'Nuevo chat', createdAt: nowIso, updatedAt: nowIso, messages: [] };
    setConversations((prev) => [convo, ...(Array.isArray(prev) ? prev : [])]);
    activeConversationIdRef.current = id;
    setActiveConversationId(id);
    setMessages([]);
    setError(null);
    setLastErrorKind(null);
    setLastErrorStatus(null);
    setCopiedId(null);
    setPrompt('');
    setIsSidebarOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    const convo = (conversations || []).find((c) => c.id === id) || null;
    activeConversationIdRef.current = id;
    setActiveConversationId(id);
    setMessages(Array.isArray(convo?.messages) ? convo!.messages : []);
    setError(null);
    setLastErrorKind(null);
    setLastErrorStatus(null);
    setCopiedId(null);
    setIsSidebarOpen(false);
    setOpenConversationMenuId(null);
  };

  const handleRenameConversation = (id: string) => {
    const convo = (conversations || []).find((c) => c.id === id) || null;
    setRenameConversationId(id);
    setRenameTitle(String(convo?.title || '').trim() || 'Nuevo chat');
    setOpenConversationMenuId(null);
  };

  const saveRename = () => {
    const id = renameConversationId;
    if (!id) return;
    const nextTitle = renameTitle.trim();
    if (!nextTitle) return;

    setConversations((prev) =>
      (Array.isArray(prev) ? prev : []).map((c) => (c.id === id ? { ...c, title: nextTitle, updatedAt: new Date().toISOString() } : c))
    );
    setRenameConversationId(null);
    setRenameTitle('');
  };

  const confirmDeleteConversation = (id: string) => {
    setDeleteConversationId(id);
    setOpenConversationMenuId(null);
  };

  const deleteConversation = () => {
    const id = deleteConversationId;
    if (!id) return;

    setConversations((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const nextList = list.filter((c) => c.id !== id);

      if (activeConversationIdRef.current === id) {
        const next = nextList
          .slice()
          .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
        const nextId = next?.id || null;
        activeConversationIdRef.current = nextId;
        setActiveConversationId(nextId);
        setMessages(Array.isArray(next?.messages) ? next!.messages : []);
      }

      return nextList;
    });

    setDeleteConversationId(null);
  };

  const toApiMessages = (list: ChatMessage[]): ApiMessage[] => {
    const msgs: ApiMessage[] = [
      {
        role: "system",
        content: systemPrompt,
      },
    ];

    msgs.push(
      ...list
        .filter((m) => String(m.content || "").trim().length > 0)
        .map((m) => ({ role: m.role, content: m.content }))
    );

    return msgs;
  };

  const appendAssistantDelta = (assistantId: string, delta: string) => {
    if (!delta) return;
    setMessages((prev) => {
      const next = prev.map((m) => (m.id === assistantId ? { ...m, content: (m.content || "") + delta } : m));
      upsertActiveConversation(next);
      return next;
    });
  };

  const parseSseChunk = (raw: string) => {
    const lines = raw.split(/\r?\n/);
    const deltas: string[] = [];

    for (const line of lines) {
      if (!line) continue;
      const l = line;
      const ltrim = l.trimStart();
      if (!ltrim) continue;
      if (ltrim.startsWith(":")) continue;

      let payload = ltrim;
      if (payload.startsWith("data:")) {
        payload = payload.slice(5);
        if (payload.startsWith(" ")) payload = payload.slice(1);
      }
      if (!payload) continue;
      if (payload === "[DONE]") continue;

      try {
        const obj = JSON.parse(payload);
        const delta =
          (typeof obj === "string" && obj) ||
          obj?.delta ||
          obj?.text ||
          obj?.content ||
          obj?.message ||
          obj?.choices?.[0]?.delta?.content ||
          obj?.choices?.[0]?.message?.content;
        if (typeof delta === "string" && delta) deltas.push(delta);
      } catch {
        deltas.push(payload);
      }
    }

    return deltas.join("");
  };

  const handleSend = async () => {
    const text = prompt.trim();
    if (!text || sending) return;

    const token = getToken();
    if (!token) {
      setError("No hay sesión activa (token).");
      return;
    }

    setError(null);
    setLastErrorStatus(null);
    setLastErrorKind(null);
    setPrompt("");

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: "user",
      content: text,
    };
    const assistantId = `a_${Date.now()}`;
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    if (!activeConversationIdRef.current) {
      const nowIso = new Date().toISOString();
      const id = generateConversationId();
      activeConversationIdRef.current = id;
      setActiveConversationId(id);
      setConversations((prev) => {
        const list = Array.isArray(prev) ? prev : [];
        const initialTitle = text.length > 44 ? `${text.slice(0, 44)}…` : text;
        return [{ id, title: initialTitle || 'Nuevo chat', createdAt: nowIso, updatedAt: nowIso, messages: [] }, ...list];
      });
    }

    const nextConversation = [...messages, userMsg, assistantMsg];
    setMessages(nextConversation);
    upsertActiveConversation(nextConversation);
    setSending(true);
    scrollToBottom('auto');

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const resp = await fetch(apiUrl("/api/ai/chat/"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: toApiMessages(nextConversation) }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        setLastErrorStatus(resp.status);
        const txt = await resp.text().catch(() => "");
        if (resp.status === 502) {
          setLastErrorKind('upstream_502');
          setError("El servicio de IA está temporalmente no disponible (502). Intenta de nuevo en unos segundos.");
        } else {
          setLastErrorKind('http');
          setError(txt || `Error al consultar IA (${resp.status}).`);
        }
        return;
      }

      if (!resp.body) {
        setError("Respuesta inválida de IA (sin body).");
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let pending = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        pending += decoder.decode(value, { stream: true });

        const parts = pending.split(/\n\n/);
        pending = parts.pop() || "";
        for (const part of parts) {
          const delta = parseSseChunk(part);
          appendAssistantDelta(assistantId, delta);
        }
      }

      if (pending.trim()) {
        const delta = parseSseChunk(pending);
        appendAssistantDelta(assistantId, delta);
      }
    } catch (e: any) {
      if (String(e?.name) === "AbortError") return;
      const msg = String(e || "Error inesperado");
      const isCors = msg.toLowerCase().includes('failed to fetch') || msg.toLowerCase().includes('cors');
      if (isCors) {
        setLastErrorKind('cors');
        setError('No se pudo conectar por CORS. Si estás en producción, revisa la configuración del backend para permitir este dominio.');
      } else {
        setLastErrorKind('network');
        setError(msg);
      }
    } finally {
      setSending(false);
    }
  };

  const handleCopy = async (msg: ChatMessage) => {
    try {
      await navigator.clipboard.writeText(msg.content);
      setCopiedId(msg.id);
      window.setTimeout(() => setCopiedId((cur) => (cur === msg.id ? null : cur)), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="min-h-screen">
      <PageMeta title="IA | Sistema" description="Vista de chat para IA" />

      <div className="relative flex w-full flex-wrap items-center justify-between gap-3 border-b border-gray-200 bg-white px-6 py-5 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">{pageName}</h2>
        <nav>
          <ol className="flex items-center gap-1.5">
            <li>
              <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                Home
                <svg className="stroke-current" width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </li>
            <li className="text-sm text-gray-800 dark:text-white/90">{pageName}</li>
          </ol>
        </nav>
      </div>

      <main>
        <div className="relative h-[calc(100vh-146px)] px-4 xl:flex xl:px-0">
          <div className="my-6 flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-3 xl:hidden dark:border-gray-800 dark:bg-gray-900">
            <h4 className="pl-2 text-lg font-medium text-gray-800 dark:text-white/90">Chats History</h4>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-400"
              aria-label="Abrir historial"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M4 6L20 6M4 18L20 18M4 12L20 12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <div className="flex-1 xl:py-10">
            <div className="relative mx-auto flex max-w-[720px] flex-col">
              <div className="custom-scrollbar relative z-20 max-h-[50vh] flex-1 space-y-7 overflow-y-auto pb-10 lg:pb-7">
                {error && (
                  <div className="rounded-2xl border border-error-200 bg-error-50 px-4 py-4 text-sm text-error-800 shadow-theme-xs dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-200">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[12px] font-semibold uppercase tracking-wide opacity-80">
                          {lastErrorKind === 'upstream_502' ? 'Servicio no disponible' : lastErrorKind === 'cors' ? 'Conexión bloqueada' : 'Error'}
                        </div>
                        <div className="mt-1 text-sm leading-5">{error}</div>
                        {typeof lastErrorStatus === 'number' && (
                          <div className="mt-2 text-[12px] opacity-70">HTTP {lastErrorStatus}</div>
                        )}
                      </div>
                      {lastErrorKind === 'upstream_502' && (
                        <button
                          type="button"
                          onClick={() => {
                            setError(null);
                            setLastErrorKind(null);
                            setLastErrorStatus(null);
                            handleSend();
                          }}
                          disabled={sending || !prompt.trim()}
                          className="shrink-0 inline-flex items-center justify-center rounded-xl border border-error-300 bg-white px-3 py-2 text-xs font-semibold text-error-700 hover:bg-error-50 disabled:opacity-60 disabled:cursor-not-allowed dark:border-error-500/30 dark:bg-gray-900 dark:text-error-200 dark:hover:bg-white/5"
                        >
                          Reintentar
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {messages.map((m) => {
                  if (m.role === "user") {
                    return (
                      <div key={m.id} className="flex justify-end">
                        <div className="max-w-[560px] rounded-2xl rounded-tr-sm bg-gray-900 px-4 py-3 shadow-theme-xs dark:bg-white/90">
                          <p className="text-left text-sm font-normal leading-6 text-white dark:text-gray-900">{m.content}</p>
                        </div>
                      </div>
                    );
                  }

                  const isCopied = copiedId === m.id;
                  return (
                    <div key={m.id} className="flex justify-start">
                      <div>
                        <div className="shadow-theme-xs max-w-[560px] rounded-2xl rounded-tl-sm border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
                          {m.content.split("\n\n").map((p, idx) => (
                            <p
                              key={idx}
                              className={
                                idx === 0
                                  ? "text-sm leading-6 text-gray-800 dark:text-white/90"
                                  : "mb-0 mt-5 text-sm leading-6 text-gray-800 dark:text-white/90"
                              }
                            >
                              {p}
                            </p>
                          ))}
                        </div>
                        <div className="mt-3">
                          <button
                            type="button"
                            onClick={() => handleCopy(m)}
                            className="flex h-8 items-center gap-1 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/5"
                          >
                            {!isCopied ? (
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none">
                                <path
                                  d="M14.4194 17.249L15.4506 10.7367C17.1591 9.02811 17.1591 6.25802 15.4506 4.54947C13.742 2.84093 10.9719 2.84093 9.2634 4.54947L8.2322 5.58067M11.77 14.4172L10.7365 15.4507C9.02799 17.1592 6.2579 17.1592 4.54935 15.4507C2.84081 13.7422 2.84081 10.9721 4.54935 9.26352L5.58285 8.23002M11.7677 8.23232L8.2322 11.7679"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none">
                                <path
                                  d="M16.6663 5L7.49967 14.1667L3.33301 10"
                                  stroke="currentColor"
                                  strokeWidth="1.5"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            )}
                            <span>{isCopied ? "Copied" : "Copy"}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="fixed bottom-4 left-1/2 z-20 w-full -translate-x-1/2 transform px-4 sm:px-6 lg:bottom-8 lg:px-8">
                <div className="mx-auto w-full max-w-[820px] rounded-3xl border border-gray-200 bg-white/90 p-4 shadow-theme-xs backdrop-blur dark:border-gray-800 dark:bg-gray-900/80">
                  <textarea
                    placeholder="Escribe tu prompt aquí…"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="h-20 w-full resize-none border-none bg-transparent p-0 text-sm font-normal leading-6 text-gray-900 outline-none placeholder:text-gray-400 focus:ring-0 dark:text-white"
                  />

                  <div className="flex items-center justify-between pt-3">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none">
                        <path
                          d="M14.1567 17.249L15.4506 10.7367C17.1591 9.02811 17.1591 6.25802 15.4506 4.54947C13.742 2.84093 10.9719 2.84093 9.2634 4.54947L8.2322 5.58067M11.77 14.4172L10.7365 15.4507C9.02799 17.1592 6.2579 17.1592 4.54935 15.4507C2.84081 13.7422 2.84081 10.9721 4.54935 9.26352L5.58285 8.23002M11.7677 8.23232L8.2322 11.7679"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Enter para enviar • Shift+Enter nueva línea
                    </button>

                    <button
                      type="button"
                      onClick={handleSend}
                      disabled={sending || !prompt.trim()}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-gray-900 px-3 text-white transition hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white/90 dark:text-gray-800 dark:hover:bg-gray-900 dark:hover:text-white/90"
                      aria-label="Enviar"
                    >
                      {sending && (
                        <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                          <path d="M22 12a10 10 0 0 1-10 10" strokeLinecap="round" />
                        </svg>
                      )}
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none">
                        <path
                          d="M9.99674 3.33252L9.99675 16.667M5 8.32918L9.99984 3.33252L15 8.32918"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {isSidebarOpen && (
            <div
              className="fixed inset-0 z-99999 bg-black/50 xl:hidden dark:bg-black/80"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden="true"
            >
              <div className="absolute top-4 right-[300px]" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-gray-800 transition hover:bg-gray-100 dark:bg-gray-800 dark:text-white/90 dark:hover:bg-white/3"
                  aria-label="Cerrar"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M6.75104 17.249L17.249 6.75111M6.75104 6.75098L17.249 17.2489"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          <aside
            className={
              (isSidebarOpen
                ? "flex fixed xl:static top-0 right-0 z-100000 h-screen bg-white dark:bg-gray-900"
                : "hidden xl:flex") +
              " z-50 w-[280px] flex-col border-l border-gray-200 bg-white p-6 ease-in-out dark:border-gray-800 dark:bg-gray-900"
            }
          >
            <button
              type="button"
              onClick={handleNewChat}
              className="bg-brand-500 hover:bg-brand-600 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-medium text-white transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M5 10.0002H15.0006M10.0002 5V15.0006"
                  stroke="white"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              New Chat
            </button>

            <div className="mt-5">
              <form onSubmit={(e) => e.preventDefault()}>
                <div className="relative">
                  <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2">
                    <svg className="fill-gray-500 dark:fill-gray-400" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M3.04199 9.37381C3.04199 5.87712 5.87735 3.04218 9.37533 3.04218C12.8733 3.04218 15.7087 5.87712 15.7087 9.37381C15.7087 12.8705 12.8733 15.7055 9.37533 15.7055C5.87735 15.7055 3.04199 12.8705 3.04199 9.37381ZM9.37533 1.54218C5.04926 1.54218 1.54199 5.04835 1.54199 9.37381C1.54199 13.6993 5.04926 17.2055 9.37533 17.2055C11.2676 17.2055 13.0032 16.5346 14.3572 15.4178L17.1773 18.2381C17.4702 18.531 17.945 18.5311 18.2379 18.2382C18.5308 17.9453 18.5309 17.4704 18.238 17.1775L15.4182 14.3575C16.5367 13.0035 17.2087 11.2671 17.2087 9.37381C17.2087 5.04835 13.7014 1.54218 9.37533 1.54218Z"
                        fill=""
                      />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={chatSearch}
                    onChange={(e) => setChatSearch(e.target.value)}
                    placeholder="Search..."
                    className="shadow-theme-xs h-11 w-full rounded-lg border border-gray-300 bg-transparent py-2.5 pr-3.5 pl-[42px] text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                </div>
              </form>
            </div>

            <div className="custom-scrollbar max-h-full flex-1 space-y-6 overflow-y-auto px-4 py-6 sm:px-6">
              {filteredConversations.length === 0 && (
                <div className="rounded-2xl border border-gray-200 bg-white p-4 text-xs text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
                  No hay chats todavía.
                </div>
              )}
              {(Object.keys(byGroup) as ChatItemGroup[]).map((g) => {
                const list = byGroup[g];
                if (!list.length) return null;
                return (
                  <div key={g}>
                    <p className="mb-3 pl-3 text-xs text-gray-400 uppercase">{g}</p>
                    <ul className="space-y-1">
                      {list.map((item) => (
                        <li
                          key={item.id}
                          className={
                            "group relative rounded-full px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-950 " +
                            (activeConversationId === item.id ? "bg-gray-50 dark:bg-gray-950" : "")
                          }
                        >
                          <div className="flex cursor-pointer items-center justify-between" onClick={() => handleSelectConversation(item.id)}>
                            <span className="block truncate text-sm text-gray-700 dark:text-gray-400">
                              {item.title}
                            </span>
                            <button
                              type="button"
                              className="invisible ml-2 rounded-full p-1 text-gray-700 group-hover:visible hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                              aria-label="Menu"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenConversationMenuId((cur) => (cur === item.id ? null : item.id));
                              }}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 18 18" fill="none">
                                <path
                                  d="M4.5 9.00384L4.5 8.99634M13.5 9.00384V8.99634M9 9.00384V8.99634"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                            </button>
                          </div>

                          {openConversationMenuId === item.id && (
                            <div
                              ref={menuRef}
                              className="absolute right-2 top-[38px] z-50 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
                              onClick={(e) => e.stopPropagation()}
                              role="menu"
                              aria-label="Acciones del chat"
                            >
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/5"
                                onClick={() => handleRenameConversation(item.id)}
                                role="menuitem"
                              >
                                Renombrar
                              </button>
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-sm text-error-700 hover:bg-error-50 dark:text-error-200 dark:hover:bg-error-500/10"
                                onClick={() => confirmDeleteConversation(item.id)}
                                role="menuitem"
                              >
                                Eliminar
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      </main>

      {renameConversationId && (
        <div
          className="fixed inset-0 z-100001 flex items-center justify-center bg-black/50 px-4 dark:bg-black/80"
          onClick={() => {
            setRenameConversationId(null);
            setRenameTitle('');
          }}
          aria-hidden="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Renombrar chat"
          >
            <div className="text-sm font-semibold text-gray-800 dark:text-white/90">Renombrar chat</div>
            <div className="mt-3">
              <input
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    saveRename();
                  }
                }}
                className="shadow-theme-xs h-11 w-full rounded-xl border border-gray-300 bg-transparent px-3 text-sm text-gray-800 placeholder:text-gray-400 focus:ring-3 focus:outline-hidden dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                autoFocus
              />
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/5"
                onClick={() => {
                  setRenameConversationId(null);
                  setRenameTitle('');
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!renameTitle.trim()}
                className="rounded-xl bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white/90 dark:text-gray-800 dark:hover:bg-white"
                onClick={saveRename}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConversationId && (
        <div
          className="fixed inset-0 z-100001 flex items-center justify-center bg-black/50 px-4 dark:bg-black/80"
          onClick={() => setDeleteConversationId(null)}
          aria-hidden="true"
        >
          <div
            className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Eliminar chat"
          >
            <div className="text-sm font-semibold text-gray-800 dark:text-white/90">Eliminar chat</div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-300">Esta acción no se puede deshacer.</div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-white/5"
                onClick={() => setDeleteConversationId(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-xl bg-error-600 px-3 py-2 text-sm font-semibold text-white hover:bg-error-700"
                onClick={deleteConversation}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
