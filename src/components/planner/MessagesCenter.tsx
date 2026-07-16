"use client";

import { useState, useMemo } from "react";
import {
  Bell,
  Send,
  CheckCheck,
  Users,
  UserPlus,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMessagesStore, sendMessage, Message } from "@/hooks/use-messages-store";
import { USERS_LIST } from "@/hooks/use-auth-store";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const TYPE_BADGE: Record<Message["type"], { label: string; cls: string; Icon: any }> = {
  info: { label: "INFO", cls: "bg-blue-100 text-blue-700 border-blue-200", Icon: Info },
  warning: { label: "AVISO", cls: "bg-amber-100 text-amber-700 border-amber-200", Icon: AlertTriangle },
  success: { label: "OK", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", Icon: CheckCircle2 },
  error: { label: "ERROR", cls: "bg-red-100 text-red-700 border-red-200", Icon: XCircle },
};

interface MessagesCenterProps {
  user: { id: string; name: string } | null;
  isAdmin: boolean;
}

export function MessagesCenter({ user, isAdmin }: MessagesCenterProps) {
  const userId = user?.id;
  const { messages, unreadCount, markAllAsRead, reload } = useMessagesStore(userId);
  const { toast } = useToast();

  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [type, setType] = useState<Message["type"]>("info");
  const [recipientMode, setRecipientMode] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const recipients = useMemo(() => {
    if (recipientMode === "all") {
      return USERS_LIST.map((u) => u.id).filter((id) => id !== userId);
    }
    return selected.filter((id) => id !== userId);
  }, [recipientMode, selected, userId]);

  const recipientsLabel = useMemo(() => {
    if (recipientMode === "all") return "Todos los usuarios";
    if (recipients.length === 0) return "Ningún destinatario";
    if (recipients.length <= 2) {
      return recipients
        .map((id) => USERS_LIST.find((u) => u.id === id)?.name ?? id)
        .join(", ");
    }
    return `${recipients.length} destinatarios`;
  }, [recipientMode, recipients]);

  const handleSend = async () => {
    if (!user) return;
    if (!title.trim() || !text.trim()) {
      toast({ title: "Completa el título y el mensaje" });
      return;
    }
    if (recipients.length === 0) {
      toast({ title: "Selecciona al menos un destinatario" });
      return;
    }
    setSending(true);
    const ok = await sendMessage({
      title: title.trim(),
      message: text.trim(),
      type,
      senderId: user.id,
      senderName: user.name,
      recipients,
    });
    setSending(false);
    if (ok) {
      toast({ title: "Mensaje enviado" });
      setTitle("");
      setText("");
      setType("info");
      setRecipientMode("all");
      setSelected([]);
      setComposing(false);
      reload();
    } else {
      toast({ title: "Error al enviar el mensaje" });
    }
  };

  const toggleRecipient = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const others = USERS_LIST.filter((u) => u.id !== userId);

  return (
    <Popover onOpenChange={(open) => { if (open) reload(); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-none active:scale-95 no-print"
          aria-label="Mensajes"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0 overflow-hidden">
        <div className="flex items-center justify-between px-3 h-11 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-slate-500" />
            <span className="font-black text-[11px] uppercase tracking-widest text-slate-700">Mensajes</span>
          </div>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={() => void markAllAsRead()}
              className="flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
            >
              <CheckCheck className="h-3.5 w-3.5" /> Marcar leídos
            </button>
          )}
        </div>

        {isAdmin && !composing && (
          <button
            type="button"
            onClick={() => setComposing(true)}
            className="w-full flex items-center justify-center gap-2 h-10 text-[11px] font-black uppercase tracking-widest text-primary border-b border-slate-100 hover:bg-primary/5 transition-none"
          >
            <UserPlus className="h-4 w-4" /> Nuevo mensaje
          </button>
        )}

        {isAdmin && composing && (
          <div className="p-3 space-y-2 border-b border-slate-100">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título del mensaje"
              className="h-9 text-[12px] font-bold"
            />
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Escribe el mensaje..."
              className="min-h-[70px] text-[12px] resize-none"
            />
            <div className="flex items-center gap-2">
              <Select value={type} onValueChange={(v) => setType(v as Message["type"])}>
                <SelectTrigger className="h-9 w-[110px] text-[11px] font-bold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info" className="text-[11px]">Info</SelectItem>
                  <SelectItem value="warning" className="text-[11px]">Aviso</SelectItem>
                  <SelectItem value="success" className="text-[11px]">Éxito</SelectItem>
                  <SelectItem value="error" className="text-[11px]">Error</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={recipientMode}
                onValueChange={(v) => setRecipientMode(v as "all" | "selected")}
              >
                <SelectTrigger className="h-9 flex-1 text-[11px] font-bold">
                  <SelectValue placeholder="Destinatarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-[11px]">Todos</SelectItem>
                  <SelectItem value="selected" className="text-[11px]">Seleccionar...</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {recipientMode === "selected" && (
              <div className="max-h-[140px] overflow-y-auto border border-slate-200 rounded-lg p-1.5 space-y-0.5">
                {others.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => toggleRecipient(u.id)}
                    className={cn(
                      "w-full flex items-center justify-between px-2 py-1.5 rounded-md text-left text-[11px] font-bold transition-none",
                      selected.includes(u.id) ? "bg-primary/10 text-primary" : "hover:bg-slate-100 text-slate-700"
                    )}
                  >
                    <span className="truncate">{u.name}</span>
                    <span className="text-[9px] text-slate-400 uppercase">{u.id}</span>
                  </button>
                ))}
              </div>
            )}
            <p className="text-[10px] font-bold text-slate-400 truncate">Para: {recipientsLabel}</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => void handleSend()}
                disabled={sending}
                className="flex-1 gap-2 h-9 text-[11px] font-black"
              >
                <Send className="h-3.5 w-3.5" /> {sending ? "Enviando..." : "Enviar"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setComposing(false)}
                className="h-9 px-3 text-[11px] font-bold text-slate-500"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}

        <div className="max-h-[320px] overflow-y-auto">
          {messages.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <Users className="h-8 w-8 mx-auto text-slate-300 mb-2" />
              <p className="text-[11px] font-bold text-slate-400">Sin mensajes</p>
            </div>
          ) : (
            messages.map((m) => {
              const badge = TYPE_BADGE[m.type];
              const Icon = badge.Icon;
              return (
                <div
                  key={m.id}
                  className={cn(
                    "px-3 py-2.5 border-b border-slate-100 last:border-0",
                    m.read ? "bg-white" : "bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-black text-slate-900 leading-tight">{m.title}</p>
                    <Badge variant="outline" className={cn("shrink-0 text-[8px] font-black border px-1.5 py-0", badge.cls)}>
                      <Icon className="h-2.5 w-2.5 mr-0.5" /> {badge.label}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 whitespace-pre-wrap leading-snug">{m.message}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[9px] font-bold text-slate-400 truncate">
                      de {m.senderName}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 shrink-0">
                      {formatDistanceToNow(new Date(m.createdAt), { addSuffix: true, locale: es })}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
