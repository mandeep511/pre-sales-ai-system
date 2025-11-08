"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Circle, CheckCircle, Loader2 } from "lucide-react";
import { useCallReadiness } from "@/app/context/call-readiness-context";

export function CallReadinessDialog() {
  const {
    isDialogOpen,
    closeDialog,
    hasCredentials,
    phoneNumbers,
    currentNumberSid,
    selectNumber,
    selectedPhoneNumber,
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
  } = useCallReadiness();

  const checklist = useMemo(
    () => [
      {
        key: "credentials",
        label: "Set up Twilio account",
        done: hasCredentials,
        description: "Then update account details in webapp/.env",
        field: (
          <Button
            className="w-full"
            onClick={() => window.open("https://console.twilio.com/", "_blank")}
          >
            Open Twilio Console
          </Button>
        ),
      },
      {
        key: "number",
        label: "Set up Twilio phone number",
        done: phoneNumbers.length > 0,
        description: "Costs around $1.15/month",
        field:
          phoneNumbers.length > 0 ? (
            phoneNumbers.length === 1 ? (
              <Input value={selectedPhoneNumber || ""} disabled />
            ) : (
              <Select value={currentNumberSid} onValueChange={selectNumber}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a phone number" />
                </SelectTrigger>
                <SelectContent>
                  {phoneNumbers.map((phone) => (
                    <SelectItem key={phone.sid} value={phone.sid}>
                      {phone.friendlyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )
          ) : (
            <Button
              className="w-full"
              onClick={() =>
                window.open(
                  "https://console.twilio.com/us1/develop/phone-numbers/manage/incoming",
                  "_blank"
                )
              }
            >
              Set up Twilio phone number
            </Button>
          ),
      },
      {
        key: "local-server",
        label: "Start local WebSocket server",
        done: localServerUp,
        description: "cd websocket-server && npm run dev",
        field: null,
      },
      {
        key: "public-url",
        label: "Start ngrok",
        done: publicUrlAccessible,
        description: "Then set ngrok URL in websocket-server/.env",
        field: (
          <div className="flex items-center gap-2 w-full">
            <Input value={publicUrl} disabled className="flex-1" />
            <Button
              variant="outline"
              onClick={checkNgrok}
              disabled={ngrokLoading || !localServerUp || !publicUrl}
              className="flex-1"
            >
              {ngrokLoading ? (
                <Loader2 className="mr-2 h-4 animate-spin" />
              ) : (
                "Check ngrok"
              )}
            </Button>
          </div>
        ),
      },
      {
        key: "webhook",
        label: "Update Twilio webhook URL",
        done: Boolean(publicUrl) && !isWebhookMismatch,
        description: "Can also be done manually in Twilio console",
        field: (
          <div className="flex items-center gap-2 w-full">
            <Input value={currentVoiceUrl} disabled className="flex-1" />
            <Button
              onClick={updateWebhook}
              disabled={webhookLoading || !appendedTwimlUrl}
              className="flex-1"
            >
              {webhookLoading ? (
                <Loader2 className="mr-2 h-4 animate-spin" />
              ) : (
                "Update Webhook"
              )}
            </Button>
          </div>
        ),
      },
    ],
    [
      hasCredentials,
      phoneNumbers,
      selectedPhoneNumber,
      currentNumberSid,
      selectNumber,
      localServerUp,
      publicUrl,
      publicUrlAccessible,
      checkNgrok,
      ngrokLoading,
      currentVoiceUrl,
      updateWebhook,
      webhookLoading,
      appendedTwimlUrl,
      isWebhookMismatch,
    ]
  );

  const pending = checklist.some((item) => !item.done);

  const handleOpenChange = (open: boolean) => {
    if (!open && !pending) {
      closeDialog();
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="w-full max-w-[800px]">
        <DialogHeader>
          <DialogTitle>Setup Checklist</DialogTitle>
          <DialogDescription>
            This sample app requires a few steps before you get started
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-0">
          {checklist.map((item) => (
            <div
              key={item.key}
              className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 py-2"
            >
              <div className="flex flex-col">
                <div className="flex items-center gap-2 mb-1">
                  {item.done ? (
                    <CheckCircle className="text-green-500" />
                  ) : (
                    <Circle className="text-gray-400" />
                  )}
                  <span className="font-medium">{item.label}</span>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-500 ml-8">{item.description}</p>
                )}
                {item.key === "webhook" && isWebhookMismatch && (
                  <p className="text-sm text-yellow-600 ml-8">
                    The Twilio webhook does not match the current public URL.
                  </p>
                )}
              </div>
              <div className="flex items-center mt-2 sm:mt-0">{item.field}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={closeDialog} disabled={pending}>
            Let&apos;s go!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

