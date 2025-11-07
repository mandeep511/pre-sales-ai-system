import { RawData, WebSocket } from "ws";
import twilio from "twilio";
import functions from "./functionHandlers";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";
import { queueManager } from "./services/queueManager";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

export interface CallContext {
  callSessionId: string;
  leadId: string;
  campaignId: string;
}

export interface Session {
  twilioConn?: WebSocket;
  frontendConn?: WebSocket;
  modelConn?: WebSocket;
  streamSid?: string;
  saved_config?: any;
  lastAssistantItem?: string;
  responseStartTimestamp?: number;
  latestMediaTimestamp?: number;
  openAIApiKey?: string;
  callContext?: CallContext;
  transcriptItems?: any[];
}

let session: Session = {};

export async function initiateOutboundCall(
  callSessionId: string,
  leadId: string,
  campaignId: string
): Promise<void> {
  try {
    const callSession = await prisma.callSession.findUnique({
      where: { id: callSessionId },
      include: {
        lead: true,
        campaign: true,
      },
    });

    if (!callSession) {
      throw new Error("Call session not found");
    }

    const { lead, campaign } = callSession;

    const fromNumber =
      process.env.TWILIO_FROM_NUMBER || (await getDefaultTwilioNumber());

    await prisma.callSession.update({
      where: { id: callSessionId },
      data: {
        status: "dialing",
        dialedAt: new Date(),
        fromNumber,
        toNumber: lead.phone,
      },
    });

    const callContext: CallContext = {
      callSessionId,
      leadId,
      campaignId,
    };

    await redis.set(
      `call:context:${callSessionId}`,
      JSON.stringify(callContext),
      "EX",
      3600
    );

    const call = await twilioClient.calls.create({
      from: fromNumber,
      to: lead.phone,
      url: `${process.env.PUBLIC_URL}/twiml?callSessionId=${callSessionId}`,
      statusCallback: `${process.env.PUBLIC_URL}/api/call-status`,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      statusCallbackMethod: "POST",
    });

    await prisma.callSession.update({
      where: { id: callSessionId },
      data: { twilioCallSid: call.sid },
    });

    console.log(`Outbound call initiated: ${call.sid} for lead ${lead.name}`);
  } catch (error) {
    console.error("Failed to initiate outbound call:", error);

    try {
      await prisma.callSession.update({
        where: { id: callSessionId },
        data: {
          status: "failed",
          outcome: "failed",
          endedAt: new Date(),
        },
      });
    } catch (updateError) {
      console.error(
        "Failed to mark call session as failed:",
        (updateError as Error).message
      );
    }

    throw error;
  }
}

async function getDefaultTwilioNumber(): Promise<string> {
  const numbers = await twilioClient.incomingPhoneNumbers.list({ limit: 1 });
  if (numbers.length === 0) {
    throw new Error("No Twilio phone numbers available");
  }
  return numbers[0].phoneNumber;
}

export function handleCallConnection(
  ws: WebSocket,
  openAIApiKey: string,
  callContext?: CallContext
) {
  cleanupConnection(session.twilioConn);
  session.twilioConn = ws;
  session.openAIApiKey = openAIApiKey;
  session.callContext = callContext;
  session.transcriptItems = [];

  ws.on("message", (data: RawData) => {
    const message = parseMessage(data);
    if (!message) return;

    handleTwilioMessage(message).catch((error) => {
      console.error("Error handling Twilio message:", error);
    });
  });
  ws.on("error", ws.close);
  ws.on("close", async () => {
    console.log("Twilio connection closed");

    if (session.callContext && session.transcriptItems) {
      try {
        await prisma.transcript.create({
          data: {
            callSessionId: session.callContext.callSessionId,
            items: session.transcriptItems,
          },
        });

        const callSession = await prisma.callSession.findUnique({
          where: { id: session.callContext.callSessionId },
        });

        if (callSession?.answeredAt) {
          const duration = Math.floor(
            (Date.now() - callSession.answeredAt.getTime()) / 1000
          );

          await prisma.callSession.update({
            where: { id: session.callContext.callSessionId },
            data: {
              status: "completed",
              endedAt: new Date(),
              duration,
              outcome: "completed",
            },
          });

          await queueManager.handleCallComplete(
            session.callContext.callSessionId,
            "completed"
          );
        }

        console.log(
          "Transcript saved for call:",
          session.callContext.callSessionId
        );
      } catch (error) {
        console.error("Failed to save transcript:", error);
      }
    }

    cleanupConnection(session.modelConn);
    cleanupConnection(session.twilioConn);
    session.twilioConn = undefined;
    session.modelConn = undefined;
    session.streamSid = undefined;
    session.lastAssistantItem = undefined;
    session.responseStartTimestamp = undefined;
    session.latestMediaTimestamp = undefined;
    session.callContext = undefined;
    session.transcriptItems = [];
    if (!session.frontendConn) session = {};
  });
}

export function handleFrontendConnection(ws: WebSocket) {
  cleanupConnection(session.frontendConn);
  session.frontendConn = ws;

  ws.on("message", handleFrontendMessage);
  ws.on("close", () => {
    cleanupConnection(session.frontendConn);
    session.frontendConn = undefined;
    if (!session.twilioConn && !session.modelConn) session = {};
  });
}

async function handleFunctionCall(item: { name: string; arguments: string }) {
  console.log("Handling function call:", item);
  const fnDef = functions.find((f) => f.schema.name === item.name);
  if (!fnDef) {
    throw new Error(`No handler found for function: ${item.name}`);
  }

  let args: unknown;
  try {
    args = JSON.parse(item.arguments);
  } catch {
    return JSON.stringify({
      error: "Invalid JSON arguments for function call.",
    });
  }

  try {
    console.log("Calling function:", fnDef.schema.name, args);
    const result = await fnDef.handler(args as any);
    return result;
  } catch (err: any) {
    console.error("Error running function:", err);
    return JSON.stringify({
      error: `Error running function ${item.name}: ${err.message}`,
    });
  }
}

async function handleTwilioMessage(message: any) {
  switch (message.event) {
    case "start":
      session.streamSid = message.start.streamSid;
      session.latestMediaTimestamp = 0;
      session.lastAssistantItem = undefined;
      session.responseStartTimestamp = undefined;
      console.log("Twilio stream started:", session.streamSid);

      if (session.callContext) {
        await prisma.callSession.update({
          where: { id: session.callContext.callSessionId },
          data: {
            status: "active",
            answeredAt: new Date(),
            twilioStreamSid: session.streamSid,
          },
        });

        await prisma.lead.update({
          where: { id: session.callContext.leadId },
          data: { status: "calling" },
        });
      }

      tryConnectModel();
      break;
    case "media":
      session.latestMediaTimestamp = message.media.timestamp;
      if (isOpen(session.modelConn)) {
        jsonSend(session.modelConn, {
          type: "input_audio_buffer.append",
          audio: message.media.payload,
        });
      }
      break;
    case "close":
      closeAllConnections();
      break;
  }
}

function handleFrontendMessage(data: RawData) {
  const msg = parseMessage(data);
  if (!msg) return;

  if (isOpen(session.modelConn)) {
    jsonSend(session.modelConn, msg);
  }

  if (msg.type === "session.update") {
    session.saved_config = msg.session;
  }
}

function tryConnectModel() {
  if (!session.twilioConn || !session.streamSid || !session.openAIApiKey)
    return;
  if (isOpen(session.modelConn)) return;

  session.modelConn = new WebSocket(
    "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
    {
      headers: {
        Authorization: `Bearer ${session.openAIApiKey}`,
        "OpenAI-Beta": "realtime=v1",
      },
    }
  );

  session.modelConn.on("open", () => {
    const config = session.saved_config || {};
    jsonSend(session.modelConn, {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
        turn_detection: { type: "server_vad" },
        voice: "ash",
        input_audio_transcription: { model: "whisper-1" },
        input_audio_format: "g711_ulaw",
        output_audio_format: "g711_ulaw",
        ...config,
      },
    });
  });

  session.modelConn.on("message", handleModelMessage);
  session.modelConn.on("error", closeModel);
  session.modelConn.on("close", closeModel);
}

function handleModelMessage(data: RawData) {
  const event = parseMessage(data);
  if (!event) return;

  if (
    session.transcriptItems &&
    ["conversation.item.created", "response.output_item.done"].includes(
      event.type
    )
  ) {
    session.transcriptItems.push(event);
  }

  jsonSend(session.frontendConn, event);

  switch (event.type) {
    case "input_audio_buffer.speech_started":
      handleTruncation();
      break;

    case "response.audio.delta":
      if (session.twilioConn && session.streamSid) {
        if (session.responseStartTimestamp === undefined) {
          session.responseStartTimestamp = session.latestMediaTimestamp || 0;
        }
        if (event.item_id) session.lastAssistantItem = event.item_id;

        jsonSend(session.twilioConn, {
          event: "media",
          streamSid: session.streamSid,
          media: { payload: event.delta },
        });

        jsonSend(session.twilioConn, {
          event: "mark",
          streamSid: session.streamSid,
        });
      }
      break;

    case "response.output_item.done": {
      const { item } = event;
      if (item.type === "function_call") {
        handleFunctionCall(item)
          .then((output) => {
            if (session.modelConn) {
              jsonSend(session.modelConn, {
                type: "conversation.item.create",
                item: {
                  type: "function_call_output",
                  call_id: item.call_id,
                  output: JSON.stringify(output),
                },
              });
              jsonSend(session.modelConn, { type: "response.create" });
            }
          })
          .catch((err) => {
            console.error("Error handling function call:", err);
          });
      }
      break;
    }
  }
}

function handleTruncation() {
  if (
    !session.lastAssistantItem ||
    session.responseStartTimestamp === undefined
  )
    return;

  const elapsedMs =
    (session.latestMediaTimestamp || 0) - (session.responseStartTimestamp || 0);
  const audio_end_ms = elapsedMs > 0 ? elapsedMs : 0;

  if (isOpen(session.modelConn)) {
    jsonSend(session.modelConn, {
      type: "conversation.item.truncate",
      item_id: session.lastAssistantItem,
      content_index: 0,
      audio_end_ms,
    });
  }

  if (session.twilioConn && session.streamSid) {
    jsonSend(session.twilioConn, {
      event: "clear",
      streamSid: session.streamSid,
    });
  }

  session.lastAssistantItem = undefined;
  session.responseStartTimestamp = undefined;
}

function closeModel() {
  cleanupConnection(session.modelConn);
  session.modelConn = undefined;
  if (!session.twilioConn && !session.frontendConn) session = {};
}

function closeAllConnections() {
  if (session.twilioConn) {
    session.twilioConn.close();
    session.twilioConn = undefined;
  }
  if (session.modelConn) {
    session.modelConn.close();
    session.modelConn = undefined;
  }
  if (session.frontendConn) {
    session.frontendConn.close();
    session.frontendConn = undefined;
  }
  session.streamSid = undefined;
  session.lastAssistantItem = undefined;
  session.responseStartTimestamp = undefined;
  session.latestMediaTimestamp = undefined;
  session.saved_config = undefined;
  session.callContext = undefined;
  session.transcriptItems = [];
}

function cleanupConnection(ws?: WebSocket) {
  if (isOpen(ws)) ws.close();
}

function parseMessage(data: RawData): any {
  try {
    return JSON.parse(data.toString());
  } catch {
    return null;
  }
}

function jsonSend(ws: WebSocket | undefined, obj: unknown) {
  if (!isOpen(ws)) return;
  ws.send(JSON.stringify(obj));
}

function isOpen(ws?: WebSocket): ws is WebSocket {
  return !!ws && ws.readyState === WebSocket.OPEN;
}
