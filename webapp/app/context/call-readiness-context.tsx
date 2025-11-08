"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { backendFetch } from "@/lib/backend-config";
import { PhoneNumber } from "@/components/types";

type CallReadinessCheck =
  | "credentials"
  | "number"
  | "local-server"
  | "public-url"
  | "webhook";

interface ReadinessCheck {
  id: CallReadinessCheck;
  label: string;
  done: boolean;
  description?: string;
}

interface CallReadinessContextValue {
  isReady: boolean;
  isDialogOpen: boolean;
  openDialog: () => void;
  closeDialog: () => void;
  ensureReady: () => Promise<boolean>;
  autoOpenIfNeeded: () => void;
  checks: ReadinessCheck[];
  selectedPhoneNumber: string;
  phoneNumbers: Array<PhoneNumber>;
  currentNumberSid: string;
  selectNumber: (sid: string) => void;
  hasCredentials: boolean;
  localServerUp: boolean;
  publicUrl: string;
  publicUrlAccessible: boolean;
  checkNgrok: () => Promise<void>;
  ngrokLoading: boolean;
  currentVoiceUrl: string;
  appendedTwimlUrl: string;
  isWebhookMismatch: boolean;
  updateWebhook: () => Promise<void>;
  webhookLoading: boolean;
}

const CallReadinessContext = createContext<CallReadinessContextValue | null>(null);

const normalizePublicUrl = (value: string) => {
  if (!value) return "";
  let result = value.trim();
  if (!/^https?:\/\//i.test(result)) {
    result = `https://${result}`;
  }
  try {
    const url = new URL(result);
    url.pathname = url.pathname.replace(/\/+$/, "");
    url.search = "";
    url.hash = "";
    return `${url.origin}${url.pathname}`;
  } catch {
    return result.replace(/\/+$/, "");
  }
};

const normalizeWebhookUrl = (value: string) => {
  if (!value) return "";
  const normalized = normalizePublicUrl(value);
  return normalized.endsWith("/twiml") ? normalized : `${normalized}/twiml`;
};

type ProviderProps = { children: ReactNode };

export function CallReadinessProvider({ children }: ProviderProps) {
  const value = useCallReadinessProvider();
  return (
    <CallReadinessContext.Provider value={value}>
      {children}
    </CallReadinessContext.Provider>
  );
}

const useCallReadinessProvider = (): CallReadinessContextValue => {
  const [hasCredentials, setHasCredentials] = useState(false);
  const [phoneNumbers, setPhoneNumbers] = useState<Array<PhoneNumber>>([]);
  const [currentNumberSid, setCurrentNumberSid] = useState("");
  const [currentVoiceUrl, setCurrentVoiceUrl] = useState("");
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState("");
  const [publicUrl, setPublicUrl] = useState("");
  const [localServerUp, setLocalServerUp] = useState(false);
  const [publicUrlAccessible, setPublicUrlAccessible] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [ngrokLoading, setNgrokLoading] = useState(false);

  const appendedTwimlUrl = useMemo(
    () => (publicUrl ? normalizeWebhookUrl(publicUrl) : ""),
    [publicUrl]
  );
  const normalizedCurrentVoiceUrl = useMemo(
    () => normalizeWebhookUrl(currentVoiceUrl),
    [currentVoiceUrl]
  );
  const isWebhookMismatch = useMemo(
    () =>
      Boolean(
        appendedTwimlUrl &&
          normalizedCurrentVoiceUrl &&
          appendedTwimlUrl !== normalizedCurrentVoiceUrl
      ),
    [appendedTwimlUrl, normalizedCurrentVoiceUrl]
  );

  const checks: ReadinessCheck[] = useMemo(
    () => [
      {
        id: "credentials",
        label: "Twilio credentials configured",
        done: hasCredentials,
      },
      {
        id: "number",
        label: "Twilio phone number available",
        done: phoneNumbers.length > 0,
      },
      {
        id: "local-server",
        label: "Local WebSocket server online",
        done: localServerUp,
      },
      {
        id: "public-url",
        label: "Public URL accessible",
        done: publicUrlAccessible,
      },
      {
        id: "webhook",
        label: "Twilio webhook updated",
        done: Boolean(publicUrl) && !isWebhookMismatch,
      },
    ],
    [
      hasCredentials,
      phoneNumbers.length,
      localServerUp,
      publicUrlAccessible,
      publicUrl,
      isWebhookMismatch,
    ]
  );

  const isReady = useMemo(() => checks.every((item) => item.done), [checks]);

  const pollChecks = useCallback(async () => {
    try {
      const credentialsRes = await fetch("/api/twilio");
      if (!credentialsRes.ok) throw new Error("Failed credentials check");
      const credentials = await credentialsRes.json();
      setHasCredentials(Boolean(credentials?.credentialsSet));
    } catch (err) {
      console.error(err);
      setHasCredentials(false);
    }

    try {
      const numbersRes = await fetch("/api/twilio/numbers");
      if (!numbersRes.ok) throw new Error("Failed to fetch phone numbers");
      const numbers = await numbersRes.json();
      if (Array.isArray(numbers)) {
        setPhoneNumbers(numbers);
        if (numbers.length > 0) {
          const existing =
            numbers.find((phone: PhoneNumber) => phone.sid === currentNumberSid) ??
            numbers[0];
          setCurrentNumberSid(existing.sid);
          setCurrentVoiceUrl(normalizeWebhookUrl(existing.voiceUrl || ""));
          setSelectedPhoneNumber(existing.friendlyName || "");
        } else {
          setCurrentNumberSid("");
          setCurrentVoiceUrl("");
          setSelectedPhoneNumber("");
        }
      }
    } catch (err) {
      console.error(err);
      setPhoneNumbers([]);
    }

    let foundPublicUrl = "";
    try {
      const localRes = await backendFetch("/public-url");
      if (!localRes.ok) throw new Error("Local server not responding");
      const data = await localRes.json();
      foundPublicUrl = normalizePublicUrl(data?.publicUrl || "");
      setLocalServerUp(true);
      setPublicUrl(foundPublicUrl);
    } catch (err) {
      console.error(err);
      setLocalServerUp(false);
      setPublicUrl("");
      setPublicUrlAccessible(false);
    }
  }, [currentNumberSid]);

  useEffect(() => {
    let mounted = true;
    const tick = async () => mounted && (await pollChecks());
    tick();
    const interval = setInterval(tick, 1000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [pollChecks]);

  const checkNgrok = useCallback(async () => {
    if (!localServerUp || !publicUrl) return;
    setNgrokLoading(true);
    let success = false;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      try {
        const res = await fetch(`${publicUrl}/public-url`);
        if (res.ok) {
          setPublicUrlAccessible(true);
          success = true;
          break;
        }
      } catch {
        // retry
      }
      if (attempt < 4) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
    if (!success) setPublicUrlAccessible(false);
    setNgrokLoading(false);
  }, [localServerUp, publicUrl]);

  const updateWebhook = useCallback(async () => {
    if (!currentNumberSid || !appendedTwimlUrl) return;
    setWebhookLoading(true);
    try {
      const res = await fetch("/api/twilio/numbers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberSid: currentNumberSid,
          voiceUrl: appendedTwimlUrl,
        }),
      });
      if (!res.ok) throw new Error("Failed to update webhook");
      setCurrentVoiceUrl(appendedTwimlUrl);
    } catch (err) {
      console.error(err);
    } finally {
      setWebhookLoading(false);
    }
  }, [currentNumberSid, appendedTwimlUrl]);

  const selectNumber = useCallback(
    (sid: string) => {
      setCurrentNumberSid(sid);
      const selected = phoneNumbers.find((phone) => phone.sid === sid);
      if (selected) {
        setSelectedPhoneNumber(selected.friendlyName || "");
        setCurrentVoiceUrl(normalizeWebhookUrl(selected.voiceUrl || ""));
      }
    },
    [phoneNumbers]
  );

  const openDialog = useCallback(() => setIsDialogOpen(true), []);
  const closeDialog = useCallback(() => setIsDialogOpen(false), []);

  const ensureReady = useCallback(async () => {
    if (isReady) return true;
    openDialog();
    return false;
  }, [isReady, openDialog]);

  const autoOpenIfNeeded = useCallback(() => {
    if (!isReady) openDialog();
  }, [isReady, openDialog]);

  return {
    isReady,
    isDialogOpen,
    openDialog,
    closeDialog,
    ensureReady,
    autoOpenIfNeeded,
    checks,
    selectedPhoneNumber,
    phoneNumbers,
    currentNumberSid,
    selectNumber,
    hasCredentials,
    localServerUp,
    publicUrl,
    publicUrlAccessible,
    checkNgrok,
    ngrokLoading,
    currentVoiceUrl,
    appendedTwimlUrl,
    isWebhookMismatch,
    updateWebhook,
    webhookLoading,
  };
};

export const useCallReadiness = () => {
  const context = useContext(CallReadinessContext);
  if (!context) {
    throw new Error("useCallReadiness must be used within CallReadinessProvider");
  }
  return context;
};

