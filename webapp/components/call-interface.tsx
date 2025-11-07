"use client";

import React, { useState, useEffect } from "react";
import TopBar from "@/components/top-bar";
import ChecklistAndConfig from "@/components/checklist-and-config";
import SessionConfigurationPanel from "@/components/session-configuration-panel";
import Transcript from "@/components/transcript";
import FunctionCallsPanel from "@/components/function-calls-panel";
import { Item } from "@/components/types";
import handleRealtimeEvent from "@/lib/handle-realtime-event";
import PhoneNumberChecklist from "@/components/phone-number-checklist";

const CallInterface = () => {
  const [selectedPhoneNumber, setSelectedPhoneNumber] = useState("");
  const [allConfigsReady, setAllConfigsReady] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [callStatus, setCallStatus] = useState("disconnected");
  const [ws, setWs] = useState<WebSocket | null>(null);

  useEffect(() => {
    if (allConfigsReady && !ws) {
      const newWs = new WebSocket("ws://localhost:8081/logs");

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
  }, [allConfigsReady, ws]);

  return (
    <div className="flex flex-col gap-4">
      <ChecklistAndConfig
        ready={allConfigsReady}
        setReady={setAllConfigsReady}
        selectedPhoneNumber={selectedPhoneNumber}
        setSelectedPhoneNumber={setSelectedPhoneNumber}
      />
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
          <PhoneNumberChecklist
            selectedPhoneNumber={selectedPhoneNumber}
            allConfigsReady={allConfigsReady}
            setAllConfigsReady={setAllConfigsReady}
          />
          <Transcript items={items} />
        </div>

        <div className="col-span-3 flex flex-col overflow-hidden">
          <FunctionCallsPanel items={items} ws={ws} />
        </div>
      </div>
    </div>
  );
};

export default CallInterface;
