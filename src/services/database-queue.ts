import { OnDataSaved } from "./database-logic";

export type work = {
  data: any;
  action: (data: any) => void | Promise<any>;
};

class DatabaseQueue {
  queue: [work?] = [];
  processing: boolean;

  public add(item: work) {
    this.queue.push(item);

    this.start();
  }

  private async start() {
    if (!this.processing && this.queue.length > 0) {
      this.processing = true;
      while (this.queue.length > 0) {
        await this.process();
      }
      this.processing = false;
    }
  }

  private async process() {
    const work = this.queue.shift();
    if (work) {
      await work.action(work.data);
    }
  }
}

export default DatabaseQueue;
