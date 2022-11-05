import _ from "lodash";
import DatabaseLogic from "./database-logic";
import DatabaseState from "./database-state";

export default class DatabaseHelper {
  public static getLocationKey(generalLocation, detailedLocation) {
    return `${generalLocation}#${detailedLocation}`;
  }

  public static getMaxCount(databaseLogic: DatabaseLogic, databaseState: DatabaseState, itemName: string) {
    return _.reduce(
      _.get(databaseState.items, itemName),
      (acc, value, userId) => {
        if (databaseLogic.effectiveUserId !== userId) {
          return value.count > acc ? value.count : acc;
        }
        return acc;
      },
      0,
    );
  }

  public static getDatabaseLocations(databaseLogic: DatabaseLogic, databaseState: DatabaseState, itemName: string) {
    return _.reduce(
      databaseState.itemsForLocations,
      (acc, data, location) => {
        const [generalLocation, detailedLocation] = location.split('#');
        _.forEach(data, (itemData: {itemName: string}, userId: string) => {
          if (databaseLogic.effectiveUserId !== userId) {
            const { itemName: databaseItemName } = itemData;
            if (itemName === databaseItemName) {
              acc.push({
                generalLocation,
                detailedLocation,
              });
            }
          }
        });

        return acc;
      },
      [],
    );
  }

  public static isLocationCoopChecked(databaseState: DatabaseState
    , generalLocation: string
    , detailedLocation: string
    ) {
    return _.some(_.get(databaseState
      , ['locationsChecked', DatabaseHelper.getLocationKey(generalLocation, detailedLocation)]), (locationData) => {
      return !!locationData.isChecked;
    })
  }
}