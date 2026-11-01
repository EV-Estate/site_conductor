"use client";

import { useEffect } from "react";
import { config } from "@/config";

const version = config.public.buildVersion ?? "unknown";

// Renders nothing: surfaces the running build in the browser console for
// deploy debugging.
export function BuildVersionLog() {
  useEffect(() => {
    console.log(`EV Investment — build ${version}`);
  }, []);
  return null;
}
