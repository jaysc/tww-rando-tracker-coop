import DatabaseHelper from './database-helper.ts';
import DatabaseLogic from './database-logic.ts';
import DatabaseState from './database-state.ts';
import Permalink from './permalink';
import Settings from './settings';

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

  describe('hasCoopItem', () => {
    describe('with logic', () => {
      test('returns true when you do not have the item', () => {
        const databaseState = new DatabaseState();
        databaseState.itemsForLocations = {
          'newGeneral#doNotHaveItem': {
            user1: {
              itemName: 'bombs',
            },
          },
        };

        expect(DatabaseHelper.hasCoopItem(
          databaseLogic,
          databaseState,
          'newGeneral',
          'doNotHaveItem',
        ))
          .toEqual(true);
      });

      test('returns false when only you have the item', () => {
        const databaseState = new DatabaseState();
        databaseState.itemsForLocations = {
          'generalLocation#detailedLocation': {
            [effectiveId]: {
              itemName: 'bombs',
            },
          },
        };

        expect(DatabaseHelper.hasCoopItem(
          databaseLogic,
          databaseState,
          'generalLocation',
          'detailedLocation',
        ))
          .toEqual(false);
      });

      test('returns false when treasure charts are off and item is treasure chart', () => {
        Settings.initializeRaw({});

        const databaseState = new DatabaseState();
        databaseState.itemsForLocations = {
          'newGeneral#doNotHaveItem': {
            user1: {
              itemName: 'Treasure Chart 5',
            },
          },
        };

        expect(DatabaseHelper.hasCoopItem(
          databaseLogic,
          databaseState,
          'newGeneral',
          'doNotHaveItem',
        ))
          .toEqual(false);
      });

      test('returns false when triforce charts are off and item is triforce chart', () => {
        Settings.initializeRaw({});
        const databaseState = new DatabaseState();
        databaseState.itemsForLocations = {
          'newGeneral#doNotHaveItem': {
            user1: {
              itemName: 'Treasure Chart 5',
            },
          },
        };

        expect(DatabaseHelper.hasCoopItem(
          databaseLogic,
          databaseState,
          'newGeneral',
          'doNotHaveItem',
        ))
          .toEqual(false);
      });

      test('returns false when misc settings are off and item is tingle statue', () => {
        Settings.initializeRaw({});

        const databaseState = new DatabaseState();
        databaseState.itemsForLocations = {
          'newGeneral#doNotHaveItem': {
            user1: {
              itemName: 'Tingle Statue',
            },
          },
        };

        expect(DatabaseHelper.hasCoopItem(
          databaseLogic,
          databaseState,
          'newGeneral',
          'doNotHaveItem',
        ))
          .toEqual(false);
      });

      describe('and treasure charts are on', () => {
        test('returns true when item is treasure Chart', () => {
          Settings.initializeRaw({
            options: {
              [Permalink.OPTIONS.PROGRESSION_TREASURE_CHARTS]: true,
            },
          });

          const databaseState = new DatabaseState();
          databaseState.itemsForLocations = {
            'newGeneral#doNotHaveItem': {
              user1: {
                itemName: 'Treasure Chart 5',
              },
            },
          };

          expect(DatabaseHelper.hasCoopItem(
            databaseLogic,
            databaseState,
            'newGeneral',
            'doNotHaveItem',
          ))
            .toEqual(true);
        });
      });

      describe('and triforce charts are on', () => {
        test('returns true when item is triforce Chart', () => {
          Settings.initializeRaw({
            options: {
              [Permalink.OPTIONS.PROGRESSION_TRIFORCE_CHARTS]: true,
            },
          });

          const databaseState = new DatabaseState();
          databaseState.itemsForLocations = {
            'newGeneral#doNotHaveItem': {
              user1: {
                itemName: 'Triforce Chart 5',
              },
            },
          };

          expect(DatabaseHelper.hasCoopItem(
            databaseLogic,
            databaseState,
            'newGeneral',
            'doNotHaveItem',
          ))
            .toEqual(true);
        });
      });

      describe('and misc settings are on', () => {
        test('returns true when item is tingle statue', () => {
          Settings.initializeRaw({
            options: {
              [Permalink.OPTIONS.PROGRESSION_MISC]: true,
            },
          });

          const databaseState = new DatabaseState();
          databaseState.itemsForLocations = {
            'newGeneral#doNotHaveItem': {
              user1: {
                itemName: 'Tingle Statue',
              },
            },
          };

          expect(DatabaseHelper.hasCoopItem(
            databaseLogic,
            databaseState,
            'newGeneral',
            'doNotHaveItem',
          ))
            .toEqual(true);
        });
      });
    });

    describe('without logic', () => {
      test('return true for treasure chart', () => {
        Settings.initializeRaw({});

        const databaseState = new DatabaseState();
        databaseState.itemsForLocations = {
          'newGeneral#doNotHaveItem': {
            user1: {
              itemName: 'Treasure Chart 2',
            },
          },
        };

        expect(DatabaseHelper.hasCoopItem(
          databaseLogic,
          databaseState,
          'newGeneral',
          'doNotHaveItem',
          true,
        ))
          .toEqual(true);
      });

      test('return true for triforce chart', () => {
        Settings.initializeRaw({});

        const databaseState = new DatabaseState();
        databaseState.itemsForLocations = {
          'newGeneral#doNotHaveItem': {
            user1: {
              itemName: 'Triforce Chart 2',
            },
          },
        };

        expect(DatabaseHelper.hasCoopItem(
          databaseLogic,
          databaseState,
          'newGeneral',
          'doNotHaveItem',
          true,
        ))
          .toEqual(true);
      });

      test('return true for tingle statue', () => {
        Settings.initializeRaw({});

        const databaseState = new DatabaseState();
        databaseState.itemsForLocations = {
          'newGeneral#doNotHaveItem': {
            user1: {
              itemName: 'Tingle Statue',
            },
          },
        };

        expect(DatabaseHelper.hasCoopItem(
          databaseLogic,
          databaseState,
          'newGeneral',
          'doNotHaveItem',
          true,
        ))
          .toEqual(true);
      });
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