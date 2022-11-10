import DatabaseQueue from './database-queue.ts';

describe('DatabaseHelper', () => {
  describe('add', () => {
    test('adds to queue', () => {
      const databaseQueue = new DatabaseQueue();
      databaseQueue.processing = true;

      databaseQueue.add({
        data: 'test',
        action: () => {},
      });

      expect(databaseQueue.queue.length).toBe(1);
    });
  });

  describe('start', () => {
    test('adds to queue', (done) => {
      const databaseQueue = new DatabaseQueue();
      databaseQueue.add({
        data: 'test',
        action: () => {
          done();
        },
      });
    });
  });
});
