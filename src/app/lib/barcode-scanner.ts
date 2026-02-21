export type BarcodeScannerInstance = {
  start(
    cameraConfig: { facingMode: "environment" },
    config: { fps: number; qrbox: { width: number; height: number }; rememberLastUsedCamera: boolean },
    onSuccess: (decodedText: string) => void | Promise<void>,
    onError: (message: string) => void
  ): Promise<unknown>;
  stop(): Promise<unknown>;
  clear(): void;
  pause(shouldPauseVideo?: boolean): Promise<void> | void;
  resume(): Promise<void> | void;
  getRunningTrackCapabilities?: () => Promise<{ torch?: boolean }>;
  applyVideoConstraints?: (constraints: MediaTrackConstraints) => Promise<void>;
};

type Html5QrcodeModule = {
  Html5Qrcode: new (elementId: string) => BarcodeScannerInstance;
};

let audioCtx: AudioContext | null = null;

function getAudioContextCtor() {
  const w = window as Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export async function createHtml5Qrcode(elementId: string): Promise<BarcodeScannerInstance> {
  const mod = (await import("html5-qrcode")) as unknown as Html5QrcodeModule;
  return new mod.Html5Qrcode(elementId);
}

export async function playScanBeep() {
  try {
    const Ctor = getAudioContextCtor();
    if (!Ctor) return;

    if (!audioCtx || audioCtx.state === "closed") {
      audioCtx = new Ctor();
    }

    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.035;

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.085);
  } catch {
    // ignore audio failures (autoplay policy/device limitations)
  }
}
