import _ from "lodash";
import DatabaseLogic from "./database-logic";
import DatabaseState from "./database-state";
import Permalink from "./permalink";
import Settings from "./settings";

interface CoopItemSettings {
  charts: boolean;
}

export default class DatabaseHelper {
  public static getLocationKey(generalLocation, detailedLocation) {
    return `${generalLocation}#${detailedLocation}`;
  }

  public static getMaxCount(databaseState: DatabaseState, itemName: string) {
    return _.reduce(
      _.get(databaseState.items, itemName),
      (acc, value, userId) => {
        if (DatabaseLogic.effectiveUserId !== userId) {
          return value.count > acc ? value.count : acc;
        }
        return acc;
      },
      0
    );
  }

  public static getLocationsForItem(
    databaseState: DatabaseState,
    itemName: string
  ) {
    return _.reduce(
      databaseState.itemsForLocations,
      (acc, data, location) => {
        const [generalLocation, detailedLocation] = location.split("#");
        _.forEach(data, (itemData: { itemName: string }, userId: string) => {
          if (DatabaseLogic.effectiveUserId !== userId) {
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
      []
    );
  }

  public static getItemForLocation = (
    databaseState: DatabaseState,
    generalLocation: string,
    detailedLocation: string
  ) => {
    return _.reduce(
      _.get(databaseState, [
        "itemsForLocations",
        DatabaseHelper.getLocationKey(generalLocation, detailedLocation),
      ]),
      (acc, itemData, userId) => {
        if (DatabaseLogic.effectiveUserId !== userId) {
          const { itemName } = itemData;
          if (!acc.includes(itemName)) {
            acc.push(itemName);
          }
        }

        return acc;
      },
      []
    );
  };

  private static isIgnoredItem(item: string): boolean {
    return /Compass|(Dungeon Map)/.test(item);
  }

  // to be expanded with other items
  private static checkCoopItemSettings(
    coopItemSettings: CoopItemSettings,
    itemName: string
  ): boolean {
    if (
      !coopItemSettings.charts &&
      /(Treasure|Triforce) Chart/.test(itemName)
    ) {
      return false;
    }

    return true;
  }

  public static hasCoopItem(
    databaseState: DatabaseState,
    generalLocation: string,
    detailedLocation: string,
    {
      disableLogic,
      showCoopItemSettings,
    }: { disableLogic: boolean; showCoopItemSettings: CoopItemSettings }
  ): boolean {
    const isCharts = Settings.getOptionValue(
      Permalink.OPTIONS.PROGRESSION_TREASURE_CHARTS
    );
    const isTriforceCharts = Settings.getOptionValue(
      Permalink.OPTIONS.PROGRESSION_TRIFORCE_CHARTS
    );
    const isMisc = Settings.getOptionValue(Permalink.OPTIONS.PROGRESSION_MISC);

    const result = this.getItemForLocation(
      databaseState,
      generalLocation,
      detailedLocation
    );

    if (disableLogic) {
      return result.length > 0;
    } else {
      return (
        _.reduce(
          result,
          (acc, itemName) => {
            if (this.checkCoopItemSettings(showCoopItemSettings, itemName)) {
              if (/Treasure Chart/.test(itemName)) {
                if (isCharts) {
                  acc += 1;
                }
              } else if (/Triforce Chart/.test(itemName)) {
                if (isTriforceCharts) {
                  acc += 1;
                }
              } else if (itemName.includes("Tingle Statue")) {
                if (isMisc) {
                  acc += 1;
                }
              } else if (!this.isIgnoredItem(itemName)) {
                acc += 1;
              }
            }

            return acc;
          },
          0
        ) > 0
      );
    }
  }

  public static isLocationCoopChecked(
    databaseState: DatabaseState,
    generalLocation: string,
    detailedLocation: string
  ) {
    return _.some(
      _.get(databaseState, [
        "locationsChecked",
        DatabaseHelper.getLocationKey(generalLocation, detailedLocation),
      ]),
      (locationData) => {
        return !!locationData.isChecked;
      }
    );
  }

  public static numOfCheckedLocations(databaseState: DatabaseState) {
    return _.reduce(
      databaseState.locationsChecked,
      (acc, locationData, location) => {
        if (_.some(locationData, (userData) => userData.isChecked)) {
          acc += 1;
        }
        return acc;
      },
      0
    );
  }
}
