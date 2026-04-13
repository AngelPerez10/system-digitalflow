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

const GROUP_LABEL: Record<ChatItemGroup, string> = {
  Today: "Hoy",
  Yesterday: "Ayer",
  "Last Week": "Anteriores",
};

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-950/50 transition-colors duration-300">
      <PageMeta title="IA | Sistema" description="Asistente de IA del sistema" />

      {/* ===== Sticky Header ===== */}
      <header className="sticky top-0 z-40 border-b border-slate-200/50 bg-white/80 backdrop-blur-xl dark:border-slate-700/30 dark:bg-slate-900/80">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white sm:text-xl">{pageName}</h1>
              <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">Asistente inteligente con memoria local</p>
            </div>
          </div>
          <nav aria-label="Breadcrumb" className="hidden sm:block">
            <ol className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <li><Link to="/" className="rounded-lg px-2 py-1 transition hover:bg-slate-100 dark:hover:bg-slate-800">Inicio</Link></li>
              <li className="text-slate-300 dark:text-slate-600">/</li>
              <li className="font-medium text-slate-700 dark:text-slate-300">{pageName}</li>
            </ol>
          </nav>
        </div>
      </header>

      {/* ===== Main Content ===== */}
      <main className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex gap-4 lg:gap-6">

          {/* ===== Chat Area (Left) ===== */}
          <div className="min-w-0 flex-1">
            <div className="relative flex h-[calc(100vh-8rem)] flex-col overflow-hidden rounded-2xl border border-slate-200/50 bg-white/70 shadow-sm backdrop-blur-xl dark:border-slate-700/30 dark:bg-slate-900/70 dark:shadow-sm">

              {/* Messages */}
              <div className="custom-scrollbar relative flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">

                {/* Error Banner */}
                {error && (
                  <div className="mx-auto max-w-3xl rounded-xl border border-red-200/60 bg-red-50/80 p-4 backdrop-blur-sm dark:border-red-500/20 dark:bg-red-950/40">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/50">
                        <svg className="h-4 w-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19H19a2 2 0 001.75-2.95l-6.93-12a2 2 0 00-3.5 0l-6.93 12A2 2 0 005.07 19z" />
                        </svg>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
                          {lastErrorKind === 'upstream_502' ? 'Servicio no disponible' : lastErrorKind === 'cors' ? 'Conexión bloqueada' : 'Error'}
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-red-600 dark:text-red-200">{error}</p>
                        {typeof lastErrorStatus === 'number' && (
                          <p className="mt-1.5 text-xs font-medium text-red-500 dark:text-red-400">HTTP {lastErrorStatus}</p>
                        )}
                      </div>
                      {lastErrorKind === 'upstream_502' && (
                        <button
                          type="button"
                          onClick={() => { setError(null); setLastErrorKind(null); setLastErrorStatus(null); }}
                          className="shrink-0 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50 dark:border-red-500/20 dark:bg-slate-900 dark:text-red-300 dark:hover:bg-white/5"
                        >
                          Cerrar
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Empty State */}
                {messages.length === 0 && !error && (
                  <div className="flex flex-col items-center justify-center gap-5 py-20 text-center sm:py-24">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm">
                      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                      </svg>
                    </div>
                    <div className="max-w-sm space-y-1.5">
                      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">¿En qué puedo ayudarte?</h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">Escribe abajo para comenzar una conversación.</p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-2">
                      {['Explicar un concepto', 'Resolver un problema', 'Generar ideas'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setPrompt(s)}
                          className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-600 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-750 dark:hover:text-slate-300"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Messages List */}
                {messages.map((m) => {
                  const isCopied = copiedId === m.id;
                  const isStreamingEmpty = sending && m.role === 'assistant' && !String(m.content || '').trim();

                  if (m.role === 'user') {
                    return (
                      <div key={m.id} className="flex justify-end">
                        <div className="max-w-[min(100%,640px)] rounded-2xl rounded-br-md bg-gradient-to-br from-blue-500 to-indigo-600 px-4 py-3 text-sm leading-relaxed text-white shadow-sm">
                          {m.content.split('\n\n').map((p, idx) => (
                            <p key={idx} className={idx === 0 ? '' : 'mt-4'}>{p}</p>
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // Assistant
                  return (
                    <div key={m.id} className="group flex justify-start">
                      <div className="w-full max-w-[min(100%,640px)]">
                        <div className="relative overflow-hidden rounded-2xl rounded-bl-md border border-slate-200/60 bg-slate-50/90 pl-4 pr-4 pt-4 shadow-sm dark:border-slate-700/40 dark:bg-slate-800/70 sm:pl-5 sm:pr-5 sm:pt-5">
                          <div className="absolute left-0 top-0 h-full w-1 bg-gradient-to-b from-blue-500 to-indigo-600" aria-hidden />
                          {isStreamingEmpty ? (
                            <div className="flex items-center gap-2 py-1" aria-live="polite">
                              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.2s]" />
                              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-500 [animation-delay:-0.1s]" />
                              <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-blue-500" />
                            </div>
                          ) : (
                            m.content.split('\n\n').map((p, idx) => (
                              <p key={idx} className={idx === 0 ? 'text-sm leading-relaxed text-slate-800 dark:text-slate-100' : 'mt-4 text-sm leading-relaxed text-slate-800 dark:text-slate-100'}>{p}</p>
                            ))
                          )}
                        </div>
                        {!isStreamingEmpty && String(m.content || '').trim() && (
                          <div className="mt-1.5 flex items-center gap-1 pl-1 opacity-0 transition-opacity group-hover:opacity-100 sm:pl-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(m)}
                              className="inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                            >
                              {isCopied ? (
                                <>
                                  <svg className="h-3.5 w-3.5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="text-green-600 dark:text-green-400">Copiado</span>
                                </>
                              ) : (
                                <>
                                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  <span>Copiar</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="shrink-0 border-t border-slate-200/50 bg-white/80 p-3 backdrop-blur-xl dark:border-slate-700/30 dark:bg-slate-900/80 sm:p-4">
                <div className="flex items-end gap-2 rounded-xl border border-slate-200/60 bg-slate-50/50 p-2 dark:border-slate-700/30 dark:bg-slate-800/40 sm:p-3">
                  <textarea
                    placeholder="Escribe tu mensaje…"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                    rows={2}
                    className="min-h-[2.5rem] flex-1 resize-none border-0 bg-transparent text-sm leading-relaxed text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0 dark:text-white dark:placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || !prompt.trim()}
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-sm transition-all hover:from-blue-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none sm:h-11 sm:w-11"
                    aria-label="Enviar mensaje"
                  >
                    {sending ? (
                      <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <circle cx="12" cy="12" r="9" strokeOpacity="0.25" />
                        <path d="M21 12a9 9 0 01-9 9" strokeLinecap="round" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                </div>
                <p className="mt-2 hidden text-center text-[11px] text-slate-400 sm:block">
                  <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] dark:border-slate-700 dark:bg-slate-800">Enter</kbd> enviar ·{' '}
                  <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] dark:border-slate-700 dark:bg-slate-800">Shift+Enter</kbd> nueva línea
                </p>
              </div>
            </div>
          </div>

          {/* ===== Mobile Overlay ===== */}
          {isSidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden dark:bg-black/60"
              onClick={() => setIsSidebarOpen(false)}
              aria-hidden
            />
          )}

          {/* ===== Sidebar (Right) ===== */}
          <aside
            className={`
              fixed inset-y-0 right-0 z-50 flex w-80 flex-col border-l border-slate-200/50 bg-white/90 shadow-sm backdrop-blur-xl transition-transform duration-300 ease-in-out dark:border-slate-700/30 dark:bg-slate-900/90 lg:static lg:z-auto lg:w-80 lg:shrink-0 lg:translate-x-0 lg:rounded-2xl lg:border lg:shadow-sm lg:dark:shadow-sm
              ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
            `}
          >
            {/* Sidebar Header */}
            <div className="flex items-center justify-between border-b border-slate-200/50 p-4 dark:border-slate-700/30">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Historial</h2>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 lg:hidden"
                aria-label="Cerrar historial"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* New Chat Button */}
            <div className="p-4">
              <button
                type="button"
                onClick={handleNewChat}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-600 hover:to-indigo-700"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
                Nuevo chat
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pb-2">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
                  <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="7" />
                    <path strokeLinecap="round" d="M16 16l5 5" />
                  </svg>
                </span>
                <input
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Buscar conversación…"
                  className="w-full rounded-xl border border-slate-200/70 bg-slate-50/60 py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700/40 dark:bg-slate-800/60 dark:text-white dark:placeholder:text-slate-500 dark:focus:border-blue-500"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="custom-scrollbar flex-1 space-y-4 overflow-y-auto px-4 pb-4">
              {filteredConversations.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center text-xs leading-relaxed text-slate-500 dark:border-slate-700/40 dark:bg-slate-800/40 dark:text-slate-400">
                  No hay conversaciones aún.
                </div>
              )}
              {(Object.keys(byGroup) as ChatItemGroup[]).map((g) => {
                const list = byGroup[g];
                if (!list.length) return null;
                return (
                  <div key={g}>
                    <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">{GROUP_LABEL[g]}</p>
                    <ul className="space-y-0.5">
                      {list.map((item) => {
                        const isActive = activeConversationId === item.id;
                        const isMenuOpen = openConversationMenuId === item.id;
                        return (
                          <li key={item.id} className="relative">
                            <div
                              className={`group flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-all ${
                                isActive
                                  ? 'bg-gradient-to-r from-blue-50 to-indigo-50 ring-1 ring-blue-200/60 dark:from-blue-950/30 dark:to-indigo-950/30 dark:ring-blue-500/30'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                              }`}
                              onClick={() => handleSelectConversation(item.id)}
                            >
                              <svg className={`h-4 w-4 shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                              </svg>
                              <span className={`min-w-0 flex-1 truncate font-medium ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-slate-700 dark:text-slate-300'}`}>
                                {item.title}
                              </span>
                              <button
                                type="button"
                                className={`rounded-md p-1 transition ${isMenuOpen ? 'visible bg-slate-100 dark:bg-slate-700' : 'invisible group-hover:visible group-hover:bg-slate-100 dark:group-hover:bg-slate-700'} text-slate-400 hover:text-slate-600 dark:hover:text-slate-200`}
                                onClick={(e) => { e.stopPropagation(); setOpenConversationMenuId((cur) => (cur === item.id ? null : item.id)); }}
                                aria-label="Menú"
                              >
                                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                  <path strokeLinecap="round" d="M12 5v.01M12 12v.01M12 19v.01" />
                                </svg>
                              </button>
                            </div>

                            {/* Context Menu */}
                            {isMenuOpen && (
                              <div
                                className="absolute right-2 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-slate-200/70 bg-white/95 py-1 shadow-lg backdrop-blur-xl dark:border-slate-700/40 dark:bg-slate-800/95"
                                onClick={(e) => e.stopPropagation()}
                                role="menu"
                              >
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700/50"
                                  onClick={() => handleRenameConversation(item.id)}
                                  role="menuitem"
                                >
                                  Renombrar
                                </button>
                                <button
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
                                  onClick={() => confirmDeleteConversation(item.id)}
                                  role="menuitem"
                                >
                                  Eliminar
                                </button>
                              </div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </aside>

          {/* ===== Mobile FAB to Open Sidebar ===== */}
          <button
            type="button"
            onClick={() => setIsSidebarOpen(true)}
            className="fixed bottom-6 right-6 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transition-all hover:from-blue-600 hover:to-indigo-700 lg:hidden"
            aria-label="Abrir historial"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </main>

      {/* ===== Rename Modal ===== */}
      {renameConversationId && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60"
          onClick={() => { setRenameConversationId(null); setRenameTitle(''); }}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200/50 bg-white shadow-xl dark:border-slate-700/30 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Renombrar chat"
          >
            <div className="border-b border-slate-200/50 px-6 py-4 dark:border-slate-700/30">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Renombrar chat</h3>
            </div>
            <div className="px-6 py-4">
              <input
                value={renameTitle}
                onChange={(e) => setRenameTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveRename(); } }}
                className="w-full rounded-lg border border-slate-200/60 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700/30 dark:bg-slate-800 dark:text-white dark:focus:border-blue-500"
                autoFocus
              />
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200/50 px-6 py-4 dark:border-slate-700/30">
              <button
                type="button"
                onClick={() => { setRenameConversationId(null); setRenameTitle(''); }}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!renameTitle.trim()}
                className="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:from-blue-600 hover:to-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={saveRename}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== Delete Confirmation Modal ===== */}
      {deleteConversationId && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm dark:bg-black/60"
          onClick={() => setDeleteConversationId(null)}
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-xl border border-slate-200/50 bg-white shadow-xl dark:border-slate-700/30 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Eliminar chat"
          >
            <div className="border-b border-slate-200/50 px-6 py-4 dark:border-slate-700/30">
              <h3 className="text-base font-semibold text-slate-900 dark:text-white">Eliminar chat</h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">¿Estás seguro de que quieres eliminar esta conversación? Esta acción no se puede deshacer.</p>
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-slate-200/50 px-6 py-4 dark:border-slate-700/30">
              <button
                type="button"
                onClick={() => setDeleteConversationId(null)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-red-700"
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
