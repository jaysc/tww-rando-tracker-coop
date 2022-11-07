import { OnDataSaved } from "./database-logic";

class DatabaseQueue {
    queue: [any?] = []
    action: (data: OnDataSaved) => Promise<any>
    processing: boolean;

    constructor(action) {
        this.action = action;
    }

    public Add(item: any) {
        this.queue.push(item);

        this.Start();
    }

    private async Start() {
        if (!this.processing && this.queue.length > 0) {
            this.processing = true;
            while (this.queue.length > 0) {
                await this.Process();
            }
            this.processing = false;
        }
    }

    private async Process() {
        const work = this.queue.shift()
        if (work){
            await this.action(work);
        }
    }
}

export default DatabaseQueue;