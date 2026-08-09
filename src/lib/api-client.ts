"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { guestIdHeader, readStoredAuth } from "@/lib/auth/client";
import { handleGuestApi } from "@/lib/guest-mock";

const IMPERSONATE_KEY = "sat-nexus-impersonate";

export function getImpersonatedUser(): { id: string; label: string } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(IMPERSONATE_KEY);
    return raw ? (JSON.parse(raw) as { id: string; label: string }) : null;
  } catch {
    return null;
  }
}

export function setImpersonatedUser(target: { id: string; label: string } | null) {
  try {
    if (target) window.sessionStorage.setItem(IMPERSONATE_KEY, JSON.stringify(target));
    else window.sessionStorage.removeItem(IMPERSONATE_KEY);
  } catch {
    /* session storage unavailable */
  }
  clearGetCache();
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("sat-impersonation-changed"));
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const guestResult = await handleGuestApi(url, init);
  if (guestResult !== null) return guestResult as T;

  const { accessToken } = readStoredAuth();
  const impersonated = getImpersonatedUser();
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(!accessToken ? guestIdHeader() : {}),
      ...(impersonated ? { "x-admin-impersonate": impersonated.id } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  // 204 / empty
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const GET_CACHE = new Map<string, { value: unknown; expires: number }>();
const GET_IN_FLIGHT = new Map<string, Promise<unknown>>();
const GET_TTL_MS = 12_000;

function clearGetCache() {
  GET_CACHE.clear();
  GET_IN_FLIGHT.clear();
}

export function apiGet<T>(url: string): Promise<T> {
  const cached = GET_CACHE.get(url);
  if (cached && cached.expires > Date.now()) return Promise.resolve(cached.value as T);
  const running = GET_IN_FLIGHT.get(url);
  if (running) return running as Promise<T>;
  const promise = request<T>(url)
    .then((value) => {
      GET_CACHE.set(url, { value, expires: Date.now() + GET_TTL_MS });
      return value;
    })
    .finally(() => GET_IN_FLIGHT.delete(url));
  GET_IN_FLIGHT.set(url, promise);
  return promise;
}

export async function apiPost<T>(url: string, body?: unknown): Promise<T> {
  const value = await request<T>(url, { method: "POST", body: JSON.stringify(body ?? {}) });
  clearGetCache();
  return value;
}
export async function apiPatch<T>(url: string, body?: unknown): Promise<T> {
  const value = await request<T>(url, { method: "PATCH", body: JSON.stringify(body ?? {}) });
  clearGetCache();
  return value;
}
export async function apiDelete<T>(url: string): Promise<T> {
  const value = await request<T>(url, { method: "DELETE" });
  clearGetCache();
  return value;
}
export async function apiDeleteJson<T>(url: string, body?: unknown): Promise<T> {
  const value = await request<T>(url, { method: "DELETE", body: JSON.stringify(body ?? {}) });
  clearGetCache();
  return value;
}

const BUS_EVENT = "sat-api-mutate";
export function mutateKey(key: string) {
  clearGetCache();
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(BUS_EVENT, { detail: key }));
}

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
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
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
