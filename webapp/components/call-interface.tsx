"use client";

import React, { useEffect, useState } from "react";
import SessionConfigurationPanel from "@/components/session-configuration-panel";
import Transcript from "@/components/transcript";
import FunctionCallsPanel from "@/components/function-calls-panel";
import { Item } from "@/components/types";
import handleRealtimeEvent from "@/lib/handle-realtime-event";
import PhoneNumberChecklist from "@/components/phone-number-checklist";
import { buildBackendWsUrl } from "@/lib/backend-config";
import { useCallReadiness } from "@/app/context/call-readiness-context";

const LOGS_WS_URL = buildBackendWsUrl("/logs");

function CallInterface() {
  const [items, setItems] = useState<Array<Item>>([]);
  const [callStatus, setCallStatus] = useState("disconnected");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const { isReady, autoOpenIfNeeded } = useCallReadiness();

  useEffect(() => {
    autoOpenIfNeeded();
  }, [autoOpenIfNeeded]);

  useEffect(() => {
    if (!isReady && ws) {
      ws.close();
      return;
    }

    if (isReady && !ws) {
      const newWs = new WebSocket(LOGS_WS_URL);

      newWs.onopen = () => {
        console.log("Connected to logs websocket");
        setCallStatus("connected");
      };

      newWs.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("Received logs event:", data);
        handleRealtimeEvent(data, setItems);
      };

      newWs.onclose = () => {
        console.log("Logs websocket disconnected");
        setWs(null);
        setCallStatus("disconnected");
      };

      setWs(newWs);
    }
  }, [isReady, ws]);

  useEffect(
    () => () => {
      if (ws) {
        ws.close();
      }
    },
    [ws]
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-12 gap-4 min-h-[600px]">
        <div className="col-span-3 flex flex-col overflow-hidden">
          <SessionConfigurationPanel
            callStatus={callStatus}
            onSave={(config) => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                const updateEvent = {
                  type: "session.update",
                  session: {
                    ...config,
                  },
                };
                console.log("Sending update event:", updateEvent);
                ws.send(JSON.stringify(updateEvent));
              }
            }}
          />
        </div>

        <div className="col-span-6 flex flex-col gap-4 overflow-hidden">
          <PhoneNumberChecklist />
          <Transcript items={items} />
        </div>

        <div className="col-span-3 flex flex-col overflow-hidden">
          <FunctionCallsPanel items={items} ws={ws} />
        </div>
      </div>
    </div>
  );
}

export default CallInterface;
