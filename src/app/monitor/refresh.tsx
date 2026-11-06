"use client";
import { useEffect } from "react";
export default function Refresh() {
  useEffect(() => { const timer = window.setTimeout(() => window.location.reload(), 10_000); return () => window.clearTimeout(timer); }, []);
  return null;
}
