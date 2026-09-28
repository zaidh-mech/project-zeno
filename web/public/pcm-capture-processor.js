class PcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.samples = new Float32Array(4096);
    this.used = 0;
    this.port.onmessage = (event) => {
      if (event.data === "flush" && this.used) {
        this.port.postMessage(this.samples.slice(0, this.used));
        this.used = 0;
      }
    };
  }

  process(inputs) {
    const channels = inputs[0];
    if (!channels || !channels[0]) return true;
    for (let i = 0; i < channels[0].length; i++) {
      let mono = 0;
      for (const channel of channels) mono += channel[i];
      this.samples[this.used++] = mono / channels.length;
      if (this.used === this.samples.length) {
        this.port.postMessage(this.samples);
        this.samples = new Float32Array(4096);
        this.used = 0;
      }
    }
    return true;
  }
}

registerProcessor("pcm-capture-processor", PcmCaptureProcessor);
