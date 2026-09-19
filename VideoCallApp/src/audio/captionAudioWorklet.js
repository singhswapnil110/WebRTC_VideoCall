const CHUNK_SIZE = 2048;

class CaptionAudioWorkletProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.buffer = new Float32Array(CHUNK_SIZE);
    this.offset = 0;
    this.scratch = null;
    this.port.onmessage = (event) => {
      if (event.data?.type === "flush") {
        this.flush();
      }
    };
  }

  flush() {
    if (this.offset === 0) return;
    const audio = this.buffer.slice(0, this.offset);
    this.port.postMessage({ type: "audio", audio, sampleRate }, [audio.buffer]);
    this.offset = 0;
  }

  append(samples) {
    let cursor = 0;
    while (cursor < samples.length) {
      const available = this.buffer.length - this.offset;
      const size = Math.min(available, samples.length - cursor);
      this.buffer.set(samples.subarray(cursor, cursor + size), this.offset);
      this.offset += size;
      cursor += size;

      if (this.offset === this.buffer.length) {
        this.flush();
      }
    }
  }

  process(inputs, outputs) {
    const input = inputs[0];
    const output = outputs[0];

    if (output?.length) {
      output.forEach((channel) => channel.fill(0));
    }

    if (!input?.length || !input[0]?.length) {
      return true;
    }

    // Already mono (the common case): append copies into the ring buffer, so
    // there is no need to allocate a scratch frame on the audio thread.
    if (input.length === 1) {
      this.append(input[0]);
      return true;
    }

    const frameCount = input[0].length;
    if (!this.scratch || this.scratch.length !== frameCount) {
      this.scratch = new Float32Array(frameCount);
    }
    const mono = this.scratch;

    for (let i = 0; i < frameCount; i += 1) {
      let sample = 0;
      for (let channel = 0; channel < input.length; channel += 1) {
        sample += input[channel][i] || 0;
      }
      mono[i] = sample / input.length;
    }

    this.append(mono);
    return true;
  }
}

registerProcessor("caption-audio-processor", CaptionAudioWorkletProcessor);
