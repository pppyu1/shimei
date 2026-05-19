import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MixerChannel } from '../shared/types';

const AudioContextCtor =
  typeof window !== 'undefined' ? window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext : undefined;

type ChannelGraph = {
  kind: 'buffer' | 'media';
  source: AudioNode;
  gain: GainNode;
  master: GainNode;
  filter?: BiquadFilterNode;
  lfo?: OscillatorNode;
  lfoDepth?: GainNode;
  audioEl?: HTMLAudioElement;
  warning?: string;
};

const createNoiseBuffer = (context: AudioContext, channelId: string) => {
  const duration = 2.5;
  const frameCount = Math.floor(context.sampleRate * duration);
  const buffer = context.createBuffer(1, frameCount, context.sampleRate);
  const data = buffer.getChannelData(0);
  let brown = 0;

  for (let i = 0; i < frameCount; i += 1) {
    const white = Math.random() * 2 - 1;
    brown = (brown + 0.02 * white) / 1.02;

    if (channelId === 'rain') {
      data[i] = white * (0.25 + Math.random() * 0.35);
      continue;
    }

    if (channelId === 'ocean') {
      data[i] = brown * 2.8;
      continue;
    }

    data[i] = (brown * 0.9 + white * 0.3) * 1.2;
  }

  return buffer;
};

const loadAudioBuffer = async (
  context: AudioContext,
  audioUrl: string,
  signal: AbortSignal,
  cache: Map<string, Promise<AudioBuffer>>,
) => {
  const cached = cache.get(audioUrl);
  if (cached) return cached;

  const promise = (async () => {
    const response = await fetch(audioUrl, { signal });
    if (!response.ok) {
      throw new Error(`音频加载失败: ${response.status}`);
    }

    const data = await response.arrayBuffer();
    if (signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }

    return await context.decodeAudioData(data.slice(0));
  })();

  cache.set(audioUrl, promise);
  try {
    return await promise;
  } catch (error) {
    cache.delete(audioUrl);
    throw error;
  }
};

const createChannelGraph = async (
  context: AudioContext,
  channel: MixerChannel,
  signal: AbortSignal,
  bufferCache: Map<string, Promise<AudioBuffer>>,
): Promise<ChannelGraph> => {
  const gain = context.createGain();
  const master = context.createGain();
  let warning: string | undefined;

  if (channel.audioUrl) {
    try {
      const source = context.createBufferSource();
      const buffer = await loadAudioBuffer(context, channel.audioUrl, signal, bufferCache);
      source.buffer = buffer;
      source.loop = true;
      gain.gain.value = channel.vol / 100;
      master.gain.value = 0.9;
      source.connect(gain);
      gain.connect(master);
      master.connect(context.destination);
      source.start();
      return { kind: 'buffer', source, gain, master };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      const message = error instanceof Error ? error.message : '未知错误';
      warning = `「${channel.title}」音频解码失败（${message}）`;
    }

    try {
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      const audioEl = new Audio(channel.audioUrl);
      audioEl.loop = true;
      audioEl.preload = 'auto';
      audioEl.crossOrigin = 'anonymous';

      const source = context.createMediaElementSource(audioEl);
      gain.gain.value = channel.vol / 100;
      master.gain.value = 0.9;
      source.connect(gain);
      gain.connect(master);
      master.connect(context.destination);

      await audioEl.play();
      if (signal.aborted) {
        audioEl.pause();
        audioEl.src = '';
        audioEl.load();
        throw new DOMException('Aborted', 'AbortError');
      }
      return { kind: 'media', source, gain, master, audioEl, warning };
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error;
      }
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        warning = `「${channel.title}」需要点击中间播放按钮解锁音频权限`;
      } else {
        const message = error instanceof Error ? error.message : '未知错误';
        warning = `${warning ?? `「${channel.title}」音频加载失败`}（${message}），已回退为合成白噪`;
      }
    }
  }

  const source = context.createBufferSource();
  source.buffer = createNoiseBuffer(context, channel.id);
  source.loop = true;

  const filter = context.createBiquadFilter();

  if (channel.id === 'rain') {
    filter.type = 'highpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.7;
    master.gain.value = 0.18;
  } else if (channel.id === 'ocean') {
    filter.type = 'lowpass';
    filter.frequency.value = 260;
    filter.Q.value = 0.35;
    master.gain.value = 0.36;
  } else {
    filter.type = 'bandpass';
    filter.frequency.value = 480;
    filter.Q.value = 0.8;
    master.gain.value = 0.16;
  }

  gain.gain.value = channel.vol / 100;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(master);
  master.connect(context.destination);

  let lfo: OscillatorNode | null = null;
  let lfoDepth: GainNode | null = null;

  if (channel.id === 'wind') {
    lfo = context.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.12;
    lfoDepth = context.createGain();
    lfoDepth.gain.value = 0.22;
    lfo.connect(lfoDepth);
    lfoDepth.connect(master.gain);
    lfo.start();
  }

  source.start();

  return { kind: 'buffer', source, gain, filter, master, lfo: lfo ?? undefined, lfoDepth: lfoDepth ?? undefined, warning };
};

const stopChannelGraph = (graph?: ChannelGraph) => {
  if (!graph) return;
  if (graph.kind === 'buffer' && graph.source instanceof AudioBufferSourceNode) {
    try {
      graph.source.stop();
    } catch {
    }
  }

  if (graph.kind === 'media' && graph.audioEl) {
    try {
      graph.audioEl.pause();
      graph.audioEl.src = '';
      graph.audioEl.load();
    } catch {
    }
  }
  graph.source.disconnect();
  graph.gain.disconnect();
  graph.filter?.disconnect();
  graph.master.disconnect();
  graph.lfo?.stop();
  graph.lfo?.disconnect();
  graph.lfoDepth?.disconnect();
};

export function useNatureMixer(initialChannels: MixerChannel[]) {
  const [channels, setChannels] = useState(initialChannels);
  const [isMixerPlaying, setIsMixerPlaying] = useState(false);
  const [mixerError, setMixerError] = useState<string | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const graphsRef = useRef<Map<string, ChannelGraph>>(new Map());
  const pendingRef = useRef<Map<string, AbortController>>(new Map());
  const bufferCacheRef = useRef<Map<string, Promise<AudioBuffer>>>(new Map());

  const ensureContext = useCallback(async () => {
    if (!AudioContextCtor) {
      throw new Error('当前浏览器不支持网页音频');
    }

    if (!contextRef.current) {
      contextRef.current = new AudioContextCtor();
    }

    if (contextRef.current.state === 'suspended') {
      await contextRef.current.resume();
    }

    return contextRef.current;
  }, []);

  const teardownGraphs = useCallback(() => {
    pendingRef.current.forEach((controller) => controller.abort());
    pendingRef.current.clear();
    graphsRef.current.forEach((graph) => stopChannelGraph(graph));
    graphsRef.current.clear();
  }, []);

  const syncGraphs = useCallback(
    async (nextChannels: MixerChannel[], playing: boolean) => {
      if (!playing) {
        teardownGraphs();
        return;
      }

      const activeChannels = nextChannels.filter((channel) => channel.active);
      if (!activeChannels.length) {
        teardownGraphs();
        setIsMixerPlaying(false);
        return;
      }

      const context = await ensureContext();

      for (const channel of nextChannels) {
        const graph = graphsRef.current.get(channel.id);
        if (!channel.active) {
          const pending = pendingRef.current.get(channel.id);
          if (pending) {
            pending.abort();
            pendingRef.current.delete(channel.id);
          }
          if (graph) {
            stopChannelGraph(graph);
            graphsRef.current.delete(channel.id);
          }
          continue;
        }

        if (!graph) {
          const pending = pendingRef.current.get(channel.id);
          if (pending) {
            continue;
          }
          const controller = new AbortController();
          pendingRef.current.set(channel.id, controller);
          try {
            const created = await createChannelGraph(context, channel, controller.signal, bufferCacheRef.current);
            if (controller.signal.aborted) {
              stopChannelGraph(created);
              continue;
            }
            graphsRef.current.set(channel.id, created);
            if (created.warning) {
              setMixerError(created.warning);
            }
          } finally {
            pendingRef.current.delete(channel.id);
          }
          continue;
        }

        graph.gain.gain.setTargetAtTime(channel.vol / 100, context.currentTime, 0.08);
      }
    },
    [ensureContext, teardownGraphs],
  );

  const toggleChannel = useCallback(
    (id: string) => {
      setChannels((prev) => {
        const next = prev.map((channel) => (channel.id === id ? { ...channel, active: !channel.active } : channel));
        if (isMixerPlaying) {
          void syncGraphs(next, true);
        }
        return next;
      });
    },
    [isMixerPlaying, syncGraphs],
  );

  const setVolume = useCallback(
    (id: string, vol: number) => {
      setChannels((prev) => {
        const next = prev.map((channel) => (channel.id === id ? { ...channel, vol } : channel));
        if (isMixerPlaying) {
          void syncGraphs(next, true);
        }
        return next;
      });
    },
    [isMixerPlaying, syncGraphs],
  );

  const toggleMixer = useCallback(async () => {
    try {
      if (isMixerPlaying) {
        teardownGraphs();
        setIsMixerPlaying(false);
        return;
      }

      setMixerError(null);
      await syncGraphs(channels, true);
      setIsMixerPlaying(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : '网页音频启动失败';
      setMixerError(message);
      setIsMixerPlaying(false);
    }
  }, [channels, isMixerPlaying, syncGraphs, teardownGraphs]);

  useEffect(() => {
    void syncGraphs(channels, isMixerPlaying);
  }, [channels, isMixerPlaying, syncGraphs]);

  useEffect(() => {
    return () => {
      teardownGraphs();
      void contextRef.current?.close();
    };
  }, [teardownGraphs]);

  const activeCount = useMemo(() => channels.filter((channel) => channel.active).length, [channels]);

  const statusLabel = mixerError
    ? mixerError
    : isMixerPlaying
      ? `已混入 ${activeCount} 路环境音`
      : activeCount
        ? `已准备 ${activeCount} 路环境音`
        : '请先开启至少 1 路环境音';

  return {
    channels,
    isMixerPlaying,
    mixerError,
    statusLabel,
    toggleChannel,
    setVolume,
    toggleMixer,
  };
}
