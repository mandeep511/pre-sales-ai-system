'use client';

import CallInterface from "@/components/call-interface";
import { AuthGuard } from "@/components/auth-guard";

export default function Page() {
  return (
    <AuthGuard>
      <CallInterface />
    </AuthGuard>
  );
}
