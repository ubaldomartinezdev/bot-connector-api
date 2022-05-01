export class Timer {
  private create: () => NodeJS.Timer;
  private timer: NodeJS.Timer | null = null;

  constructor(callback: () => void, ms = 31_000) {
    this.create = () => setInterval(callback, ms);
  }

  start() {
    this.timer = this.create();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }
}
