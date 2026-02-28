export async function register() {
  // Auto-start scanner during game hours on server boot
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { isGameHours, startScanner } = await import('@/lib/scanner/scanner');

    if (isGameHours()) {
      console.log('[Scanner] Game hours detected — auto-starting scanner');
      startScanner();
    } else {
      console.log('[Scanner] Outside game hours — scanner idle. Start manually via /api/scanner/start');
    }
  }
}
