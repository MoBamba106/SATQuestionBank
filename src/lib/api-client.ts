"use client";

import { useCallback, useEffect, useRef, useState } from "react";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export const apiGet = <T>(url: string) => request<T>(url);
export const apiPost = <T>(url: string, body?: unknown) =>
  request<T>(url, { method: "POST", body: JSON.stringify(body ?? {}) });
export const apiPatch = <T>(url: string, body?: unknown) =>
  request<T>(url, { method: "PATCH", body: JSON.stringify(body ?? {}) });
export const apiDelete = <T>(url: string) => request<T>(url, { method: "DELETE" });

// ------- tiny cross-component revalidation bus -------
const BUS_EVENT = "sat-api-mutate";
export function mutateKey(key: string) {
  if (typeof window !== "undefined")
    window.dispatchEvent(new CustomEvent(BUS_EVENT, { detail: key }));
}

/**
 * Simple SWR-lite hook. `key` doubles as the cache-invalidation channel:
 * calling mutateKey("favorites") revalidates any hook whose url contains it.
 */
export function useApi<T>(url: string | null, key?: string) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!url);
  const seq = useRef(0);

  const load = useCallback(async () => {
    if (!url) return;
    const mySeq = ++seq.current;
    setLoading(true);
    try {
      const d = await apiGet<T>(url);
      if (seq.current === mySeq) {
        setData(d);
        setError(null);
      }
    } catch (e) {
      if (seq.current === mySeq) setError(e instanceof Error ? e.message : "Load failed");
    } finally {
      if (seq.current === mySeq) setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!key) return;
    const onMutate = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail === key) load();
    };
    window.addEventListener(BUS_EVENT, onMutate);
    return () => window.removeEventListener(BUS_EVENT, onMutate);
  }, [key, load]);

  return { data, error, loading, reload: load };
}
