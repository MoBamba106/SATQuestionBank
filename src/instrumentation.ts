export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { ensureSeeded } = await import("@/lib/seed");
      ensureSeeded().catch((e) => console.error("[seed] failed:", e));
    } catch (e) {
      console.error("[seed] import failed:", e);
    }
  }
}
