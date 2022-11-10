import DatabaseHelper from './database-helper.ts';
import DatabaseLogic from './database-logic.ts';
import DatabaseState from './database-state.ts';

describe('DatabaseHelper', () => {
  const databaseLogic = new DatabaseLogic({});
  const effectiveId = 'effective-user-id';

  databaseLogic.userId = effectiveId;

  describe('getLocationKey', () => {
    test('returns the correct key', () => {
      expect(DatabaseHelper.getLocationKey('general location', 'detailed location')).toEqual('general location#detailed location');
    });
  });

  describe('getMaxCount', () => {
    test('returns 0 when userId is effectiveId', () => {
      const databaseState = new DatabaseState();
      databaseState.items = {
        bombs: {
          [effectiveId]: {
            count: 100,
          },
        },
        leaf: {
          [effectiveId]: {
            count: 100,
          },
          user1: {
            count: 50,
          },
        },
      };

      expect(DatabaseHelper.getMaxCount(databaseLogic, databaseState, 'bombs')).toEqual(0);
    });

    test('returns 0 when item not found', () => {
      const databaseState = new DatabaseState();
      databaseState.items = {
        fake: {
          [effectiveId]: {
            count: 100,
          },
        },
      };

      expect(DatabaseHelper.getMaxCount(databaseLogic, databaseState, 'bombs')).toEqual(0);
    });

    test('returns maxCount when userId is not effectiveId', () => {
      const databaseState = new DatabaseState();
      databaseState.items = {
        bombs: {
          [effectiveId]: {
            count: 100,
          },
          user1: {
            count: 50,
          },
          user2: {
            count: 200,
          },
          user3: {
            count: 2,
          },
        },
        leaf: {
          [effectiveId]: {
            count: 100,
          },
          user1: {
            count: 50,
          },
        },
      };

      expect(DatabaseHelper.getMaxCount(databaseLogic, databaseState, 'bombs')).toEqual(200);
    });
  });

  describe('getLocationsForItem', () => {
    test('returns empty array when same effectiveId', () => {
      const databaseState = new DatabaseState();
      databaseState.itemsForLocations = {
        'generalLocation#detailedLocation': {
          [effectiveId]: {
            itemName: 'bombs',
          },
        },
        'newGeneral#newDetailed': {
          [effectiveId]: {
            itemName: 'leaf',
          },
          user1: {
            itemName: 'leaf',
          },
        },
      };

      expect(DatabaseHelper.getLocationsForItem(databaseLogic, databaseState, 'bombs'))
        .toEqual([]);
    });

    test('returns location array correctly', () => {
      const databaseState = new DatabaseState();
      databaseState.itemsForLocations = {
        'generalLocation#detailedLocation': {
          [effectiveId]: {
            itemName: 'bombs',
          },
          user1: {
            itemName: 'bombs',
          },
        },
        'newGeneral#newDetailed': {
          [effectiveId]: {
            itemName: 'leaf',
          },
          user1: {
            itemName: 'leaf',
          },
        },
      };

      expect(DatabaseHelper.getLocationsForItem(databaseLogic, databaseState, 'bombs'))
        .toEqual([{ generalLocation: 'generalLocation', detailedLocation: 'detailedLocation' }]);
    });
  });

  describe('getItemForLocation', () => {
    test('returns empty array when same effectiveId', () => {
      const databaseState = new DatabaseState();
      databaseState.itemsForLocations = {
        'generalLocation#detailedLocation': {
          [effectiveId]: {
            itemName: 'bombs',
          },
        },
        'newGeneral#newDetailed': {
          [effectiveId]: {
            itemName: 'leaf',
          },
          user1: {
            itemName: 'leaf',
          },
        },
      };

      expect(DatabaseHelper.getItemForLocation(
        databaseLogic,
        databaseState,
        'generalLocation',
        'detailedLocation',
      ))
        .toEqual([]);
    });

    test('returns empty array when location not found', () => {
      const databaseState = new DatabaseState();
      databaseState.itemsForLocations = {
        'generalLocation#detailedLocation': {
          [effectiveId]: {
            itemName: 'bombs',
          },
        },
        'newGeneral#newDetailed': {
          [effectiveId]: {
            itemName: 'leaf',
          },
          user1: {
            itemName: 'leaf',
          },
        },
      };

      expect(DatabaseHelper.getItemForLocation(
        databaseLogic,
        databaseState,
        'random1',
        'random2',
      ))
        .toEqual([]);
    });

    test('returns correct item for location', () => {
      const databaseState = new DatabaseState();
      databaseState.itemsForLocations = {
        'generalLocation#detailedLocation': {
          [effectiveId]: {
            itemName: 'bombs',
          },
        },
        'newGeneral#newDetailed': {
          [effectiveId]: {
            itemName: 'leaf',
          },
          user1: {
            itemName: 'leaf',
          },
          user2: {
            itemName: 'bottle',
          },
          user3: {
            itemName: 'leaf',
          },
        },
      };

      expect(DatabaseHelper.getItemForLocation(
        databaseLogic,
        databaseState,
        'newGeneral',
        'newDetailed',
      ))
        .toEqual(['leaf', 'bottle']);
    });
  });

  describe('isLocationCoopChecked', () => {
    test('returns true if not same effectiveId', () => {
      const databaseState = new DatabaseState();
      databaseState.locationsChecked = {
        'generalLocation#detailedLocation': {
          [effectiveId]: {
            isChecked: true,
          },
        },
        'newGeneral#newDetailed': {
          [effectiveId]: {
            isChecked: true,
          },
          user1: {
            isChecked: true,
          },
          user2: {
            isChecked: true,
          },
          user3: {
            isChecked: true,
          },
        },
      };

      expect(DatabaseHelper.isLocationCoopChecked(
        databaseState,
        'newGeneral',
        'newDetailed',
      ))
        .toEqual(true);
    });
  });
});
