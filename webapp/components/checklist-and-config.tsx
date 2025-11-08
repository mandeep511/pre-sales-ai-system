"use client";

import { useEffect } from "react";
import { useCallReadiness } from "@/app/context/call-readiness-context";

interface ChecklistAndConfigProps {
  ready: boolean;
  setReady: (val: boolean) => void;
  selectedPhoneNumber: string;
  setSelectedPhoneNumber: (val: string) => void;
}

export default function ChecklistAndConfig({
  setReady,
  setSelectedPhoneNumber,
}: ChecklistAndConfigProps) {
  const { isReady, selectedPhoneNumber: contextPhoneNumber, autoOpenIfNeeded } =
    useCallReadiness();

  useEffect(() => {
    setReady(isReady);
  }, [isReady, setReady]);

  useEffect(() => {
    if (contextPhoneNumber) {
      setSelectedPhoneNumber(contextPhoneNumber);
    }
  }, [contextPhoneNumber, setSelectedPhoneNumber]);

  useEffect(() => {
    autoOpenIfNeeded();
  }, [autoOpenIfNeeded]);

  return null;
}
