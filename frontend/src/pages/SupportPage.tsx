import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router";
import type { FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Headphones, LifeBuoy, Loader2, MessageSquareText, Send, ShieldCheck } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { useOrgStore } from "@/stores/orgStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shared/PageHeader";
import {
  createPersonalThread,
  getPersonalThread,
  listPersonalThreads,
  sendPersonalMessage,
  type SupportPriority,
  type SupportThread,
  type SupportThreadStatus,
  updatePersonalThread,
} from "@/api/support";

const STATUS_OPTIONS: SupportThreadStatus[] = ["open", "in_progress", "answered", "closed"];
const PRIORITY_OPTIONS: SupportPriority[] = ["low", "normal", "high", "critical"];

function statusLabel(value: SupportThreadStatus) {
  if (value === "open") return "Открыт";
  if (value === "in_progress") return "В работе";
  if (value === "answered") return "Ответ дан";
  return "Закрыт";
}

function priorityLabel(value: SupportPriority) {
  if (value === "low") return "Низкий";
  if (value === "normal") return "Обычный";
  if (value === "high") return "Высокий";
  return "Критический";
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export default function SupportPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const isSuperAdmin = useAuthStore((s) => s.isSuperAdmin);
  const platformRole = useAuthStore((s) => s.platformRole);
  const userId = useAuthStore((s) => s.userId);
  const activeOrgId = useOrgStore((s) => s.activeOrgId);
  const activeOrg = useOrgStore((s) => s.activeOrg());
  const canManageQueue = isSuperAdmin || platformRole === "tech_support";

  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selected, setSelected] = useState<SupportThread | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | SupportThreadStatus>("all");
  const [priorityFilter, setPriorityFilter] = useState<"all" | SupportPriority>("all");
  const [queueScope, setQueueScope] = useState<"all" | "open" | "my">("all");
  const [assignToId, setAssignToId] = useState("");

  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newPriority, setNewPriority] = useState<SupportPriority>("normal");

  const [messageBody, setMessageBody] = useState("");

  async function refreshThreads(selectThreadId?: number) {
    const { data } = await listPersonalThreads();
    setThreads(data);
    const targetId = selectThreadId ?? selectedId ?? data[0]?.id ?? null;
    setSelectedId(targetId);
    if (targetId == null) {
      setSelected(null);
      return;
    }
    const { data: thread } = await getPersonalThread(targetId);
    setSelected(thread);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await refreshThreads();
      } catch {
        if (mounted) toast.error("Не удалось загрузить обращения");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const currentAccountId = Number(useAuthStore.getState().userId || 0);

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      if (canManageQueue) {
        if (queueScope === "open" && thread.status === "closed") return false;
        if (queueScope === "my" && thread.assigned_to_account_id !== currentAccountId) return false;
      }
      if (statusFilter !== "all" && thread.status !== statusFilter) return false;
      if (priorityFilter !== "all" && thread.priority !== priorityFilter) return false;
      if (!search.trim()) return true;
      const needle = search.trim().toLowerCase();
      return (
        thread.subject.toLowerCase().includes(needle) ||
        thread.request_type.toLowerCase().includes(needle)
      );
    });
  }, [threads, statusFilter, priorityFilter, search, canManageQueue, queueScope, currentAccountId]);

  async function handleSelectThread(threadId: number) {
    setSelectedId(threadId);
    try {
      const { data } = await getPersonalThread(threadId);
      setSelected(data);
    } catch {
      toast.error("Не удалось открыть обращение");
    }
  }

  async function handleCreateThread(event: FormEvent) {
    event.preventDefault();
    if (!newSubject.trim() || !newBody.trim()) {
      toast.error("Заполните тему и сообщение");
      return;
    }
    setSaving(true);
    try {
      const supportContext = {
        url: `${window.location.origin}${location.pathname}${location.search}`,
        path: location.pathname,
        browser: window.navigator.userAgent,
        user_id: userId,
        role: activeOrg?.role ?? platformRole ?? (isSuperAdmin ? "superadmin" : "user"),
        clinic_id: activeOrgId,
        clinic_name: activeOrg?.orgName ?? null,
        created_from: "support_page",
        captured_at: new Date().toISOString(),
      };
      const { data } = await createPersonalThread({
        clinic_id: activeOrgId ? Number(activeOrgId) || null : null,
        subject: newSubject.trim(),
        body: newBody.trim(),
        priority: newPriority,
        request_type: "product_support",
        request_meta: supportContext,
      });
      setNewSubject("");
      setNewBody("");
      await refreshThreads(data.id);
      toast.success("Обращение создано");
    } catch {
      toast.error("Не удалось создать обращение");
    } finally {
      setSaving(false);
    }
  }

  async function handleSendMessage(event: FormEvent) {
    event.preventDefault();
    if (!selected || !messageBody.trim()) return;
    setSending(true);
    try {
      await sendPersonalMessage(selected.id, { body: messageBody.trim() });
      setMessageBody("");
      const { data } = await getPersonalThread(selected.id);
      setSelected(data);
      await refreshThreads(selected.id);
    } catch {
      toast.error("Не удалось отправить сообщение");
    } finally {
      setSending(false);
    }
  }

  async function handleManageThread(patch: {
    status?: SupportThreadStatus;
    priority?: SupportPriority;
    assigned_to_account_id?: number | null;
  }) {
    if (!selected) return;
    try {
      await updatePersonalThread(selected.id, patch);
      const { data } = await getPersonalThread(selected.id);
      setSelected(data);
      await refreshThreads(selected.id);
      toast.success("Обращение обновлено");
    } catch {
      toast.error("Не удалось обновить обращение");
    }
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mis-workspace support-workspace space-y-4">
      <section className="mis-command-panel support-command-panel">
        <div>
          <p className="mis-kicker">Служба поддержки</p>
          <h1>{t("support.title", "Поддержка")}</h1>
          <p>{t("support.startDialog", "Создавайте обращения и общайтесь с техподдержкой")}. Очередь, приоритеты и история диалога собраны в одном рабочем окне.</p>
        </div>
        <div className="mis-command-actions">
          <div className="mis-mini-signal"><Headphones className="h-4 w-4" /> {threads.length} обращений</div>
          <div className="mis-mini-signal"><ShieldCheck className="h-4 w-4" /> Приоритизация SLA</div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[380px_1fr]">
        <section className="mis-card support-inbox space-y-3 p-3">
          <form onSubmit={handleCreateThread} className="space-y-2 border-b border-border pb-3">
            <Input
              value={newSubject}
              onChange={(e) => setNewSubject(e.target.value)}
              placeholder="Тема обращения"
              maxLength={160}
            />
            <Textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              placeholder="Опишите проблему"
              rows={3}
            />
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Приоритет</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as SupportPriority)}
                className="h-8 rounded-md border border-border bg-background px-2 text-sm"
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {priorityLabel(option)}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Создать"}
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск"
            />
            {canManageQueue ? (
              <select
                value={queueScope}
                onChange={(e) => setQueueScope(e.target.value as "all" | "open" | "my")}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="all">Вся очередь</option>
                <option value="open">Открытые</option>
                <option value="my">Назначенные мне</option>
              </select>
            ) : null}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as "all" | SupportThreadStatus)}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="all">Все статусы</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {statusLabel(option)}
                  </option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as "all" | SupportPriority)}
                className="h-8 w-full rounded-md border border-border bg-background px-2 text-sm"
              >
                <option value="all">Все приоритеты</option>
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {priorityLabel(option)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="max-h-[52vh] space-y-2 overflow-y-auto pr-1">
            {filteredThreads.map((thread) => (
              <button
                type="button"
                key={thread.id}
                onClick={() => handleSelectThread(thread.id)}
                className={`w-full rounded-md border px-3 py-2 text-left transition ${
                  selectedId === thread.id ? "border-primary bg-primary/10 shadow-sm" : "border-border hover:bg-muted/60"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="line-clamp-1 text-sm font-medium">{thread.subject}</p>
                  <Badge variant="secondary" className="text-[10px]">
                    {priorityLabel(thread.priority)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {statusLabel(thread.status)} • {formatDate(thread.last_message_at || thread.created_at)}
                </p>
              </button>
            ))}
            {filteredThreads.length === 0 && (
              <div className="rounded-md border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                Обращения не найдены
              </div>
            )}
          </div>
        </section>

        <section className="mis-card support-thread p-4">
          {!selected ? (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-2 text-muted-foreground">
              <MessageSquareText className="h-8 w-8" />
              <p>Выберите обращение слева</p>
              <span className="text-xs">История, статус и ответ появятся здесь.</span>
            </div>
          ) : (
            <div className="flex h-[70vh] flex-col">
              <div className="space-y-2 border-b border-border pb-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">{selected.subject}</h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{statusLabel(selected.status)}</Badge>
                    <Badge variant="secondary">{priorityLabel(selected.priority)}</Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Тип: {selected.request_type} • Создано: {formatDate(selected.created_at)}
                </p>
                {selected.request_meta ? (
                  <div className="grid gap-2 rounded-md border border-border bg-muted/40 p-3 text-xs text-muted-foreground sm:grid-cols-2">
                    <span>URL: {String(selected.request_meta.path ?? selected.request_meta.url ?? "-")}</span>
                    <span>Роль: {String(selected.request_meta.role ?? "-")}</span>
                    <span>Клиника: {String(selected.request_meta.clinic_name ?? selected.request_meta.clinic_id ?? "-")}</span>
                    <span>Время: {formatDate(String(selected.request_meta.captured_at ?? selected.created_at))}</span>
                  </div>
                ) : null}
                {canManageQueue && (
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={selected.status}
                      onChange={(e) =>
                        handleManageThread({ status: e.target.value as SupportThreadStatus })
                      }
                      className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                    >
                      {STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {statusLabel(option)}
                        </option>
                      ))}
                    </select>
                    <select
                      value={selected.priority}
                      onChange={(e) =>
                        handleManageThread({ priority: e.target.value as SupportPriority })
                      }
                      className="h-8 rounded-md border border-border bg-background px-2 text-sm"
                    >
                      {PRIORITY_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {priorityLabel(option)}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2">
                      <Input
                        value={assignToId}
                        onChange={(e) => setAssignToId(e.target.value.replace(/\D/g, ""))}
                        placeholder="ID агента"
                        className="h-8 w-28"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const parsed = Number(assignToId);
                          if (!parsed) {
                            toast.error("Укажите корректный ID агента");
                            return;
                          }
                          void handleManageThread({ assigned_to_account_id: parsed });
                        }}
                      >
                        Назначить
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageThread({ assigned_to_account_id: null })}
                      >
                        Снять
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto py-3">
                {(selected.messages ?? []).map((msg) => {
                  const mine = msg.author_account_id === selected.requester_account_id;
                  return (
                    <div
                      key={msg.id}
                      className={`max-w-[85%] rounded-2xl border p-3 ${
                        mine
                          ? "ml-0 border-primary/20 bg-primary/8 text-foreground"
                          : "ml-auto border-border bg-surface-2 text-foreground"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                      <p className="mt-1 text-[11px] text-text-tertiary">{formatDate(msg.created_at)}</p>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSendMessage} className="mt-2 flex items-end gap-2 border-t border-border pt-3">
                <Textarea
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                  placeholder="Введите сообщение"
                  rows={2}
                  className="min-h-[64px]"
                />
                <Button type="submit" disabled={sending || !messageBody.trim()}>
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
