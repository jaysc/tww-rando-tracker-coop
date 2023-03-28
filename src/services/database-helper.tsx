import _ from "lodash";
import React from "react";

import DatabaseLogic from "./database-logic";
import DatabaseState from "./database-state";
import LogicHelper from "./logic-helper";
import Permalink from "./permalink";
import Settings from "./settings";
import Spheres from "./spheres";
import TrackerState from "./tracker-state";

type CoopItemSettings = {
  charts: boolean;
};

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

  /* istanbul ignore next */
  public static coopLocationTooltip(
    databaseLocations: { generalLocation: string; detailedLocation: string }[],
    existingLocation: string[],
    spheres?: Spheres
  ) {
    let databaseContent: JSX.Element | null;
    const databaseList: JSX.Element[] = _.reduce(
      databaseLocations,
      (acc, { generalLocation, detailedLocation }) => {
        const sphere = spheres?.sphereForLocation(
          generalLocation,
          detailedLocation
        );
        const sphereText = _.isNil(sphere) ? "?" : sphere;
        const locationName = `${generalLocation} | ${detailedLocation}`;

        if (!existingLocation.includes(locationName)) {
          existingLocation.push(locationName);
          acc.push(
            <li key={locationName}>{`[${sphereText}] ${locationName}`}</li>
          );
        }

        return acc;
      },
      []
    );

    if (databaseList.length > 0) {
      databaseContent = (
        <>
          <div className="tooltip-title">Coop Found At</div>
          <ul>{databaseList}</ul>
        </>
      );
    }

    return databaseContent;
  }

  /* istanbul ignore next */
  public static locationTooltip(
    locations: { generalLocation: string; detailedLocation: string }[],
    existingLocation: string[],
    spheres?: Spheres
  ) {
    let locationContent: JSX.Element;
    const locationsList = _.map(
      locations,
      ({ generalLocation, detailedLocation }) => {
        const sphere = spheres.sphereForLocation(
          generalLocation,
          detailedLocation
        );
        const sphereText = _.isNil(sphere) ? "?" : sphere;
        const locationName = `${generalLocation} | ${detailedLocation}`;
        existingLocation.push(locationName);

        return <li key={locationName}>{`[${sphereText}] ${locationName}`}</li>;
      }
    );

    if (locationsList.length > 0) {
      locationContent = (
        <>
          <div className="tooltip-title">Locations Found At</div>
          <ul>{locationsList}</ul>
        </>
      );
    }

    return locationContent;
  }

  /* istanbul ignore next */
  public static tooltipManager({
    chartItem,
    databaseChartItems,
    databaseItems,
    databaseLocations,
    itemForLocation,
    locations,
    mappedIslandForChart,
    requirements,
    spheres,
    trackerState,
  }: tooltipManagerSettings) {
    let chartLeadsToContent;
    let chartItemContent;
    let databaseChartItemContent;
    let databaseItemForLocationContent;
    let databaseLocationContent;
    let existingLocation = [];
    let itemForLocationContent;
    let locationContent;
    let mappedIslandForChartContent;
    let prettyItemName;
    let requirementsContent;
    let tooltipContent;

    if (requirements) {
      const requirementsList = _.map(requirements, (elements, rowIndex) => (
        <li key={rowIndex}>
          {_.map(elements, ({ color, text }, elementIndex) => (
            <span className={color} key={elementIndex}>
              {text}
            </span>
          ))}
        </li>
      ));

      requirementsContent = (
        <>
          <div className="tooltip-title">Items Required</div>
          <ul>{requirementsList}</ul>
        </>
      );
    }

    if (locations) {
      locationContent = this.locationTooltip(
        locations,
        existingLocation,
        spheres
      );
    }

    if (itemForLocation) {
      prettyItemName = LogicHelper.prettyNameForItem(itemForLocation, null);

      let chartLeadsTo;
      if (LogicHelper.isRandomizedChart(itemForLocation)) {
        const mappedIslandForChart =
          trackerState.getIslandFromChartMapping(itemForLocation);
        chartLeadsTo = !_.isNil(mappedIslandForChart) ? (
          <>
            <div className="tooltip-title">Chart Leads To</div>
            <div>{mappedIslandForChart}</div>
          </>
        ) : null;
      }

      itemForLocationContent = (
        <>
          <div className="tooltip-title">Item at Location</div>
          <div>{prettyItemName}</div>
          {chartLeadsTo}
        </>
      );
    }

    if (mappedIslandForChart) {
      mappedIslandForChartContent = (
        <>
          <div className="tooltip-title">Chart Leads To</div>
          <div>{mappedIslandForChart}</div>
        </>
      );
    }

    if (chartItem) {
      prettyItemName = LogicHelper.prettyNameForItem(chartItem, null);

      chartItemContent = (
        <>
          <div className="tooltip-title">Item at chart</div>
          <div>{prettyItemName}</div>
        </>
      );
    }

    if (databaseChartItems) {
      let databaseItemContent: JSX.Element[] = [];
      _.forEach(databaseChartItems, (itemName) => {
        const databasePrettyItemName = LogicHelper.prettyNameForItem(
          itemName,
          null
        );
        if (prettyItemName !== databasePrettyItemName) {
          let chartLeadsTo;
          if (LogicHelper.isRandomizedChart(itemName)) {
            const mappedIslandForChart =
              trackerState.getIslandFromChartMapping(itemName);
            chartLeadsTo = !_.isNil(mappedIslandForChart) ? (
              <>
                <div className="tooltip-title">Chart Leads To</div>
                <div>{mappedIslandForChart}</div>
              </>
            ) : null;
          }

          databaseItemContent.push(
            <div key={itemName}>
              <div>{databasePrettyItemName}</div>
            </div>
          );
        }
      });

      if (databaseItemContent.length > 0) {
        databaseChartItemContent = (
          <>
            <div className="tooltip-title">Coop item at chart</div>
            <div>{databaseItemContent}</div>
          </>
        );
      }
    }

    if (databaseItems) {
      let databaseItemContent: JSX.Element[] = [];
      _.forEach(databaseItems, (itemName) => {
        const databasePrettyItemName = LogicHelper.prettyNameForItem(
          itemName,
          null
        );
        if (prettyItemName !== databasePrettyItemName) {
          let chartLeadsTo;
          if (LogicHelper.isRandomizedChart(itemName)) {
            const mappedIslandForChart =
              trackerState.getIslandFromChartMapping(itemName);
            chartLeadsTo = !_.isNil(mappedIslandForChart) ? (
              <>
                <div className="tooltip-title">Chart Leads To</div>
                <div>{mappedIslandForChart}</div>
              </>
            ) : null;
          }

          databaseItemContent.push(
            <div key={itemName}>
              <div>{databasePrettyItemName}</div>
              {chartLeadsTo}
            </div>
          );
        }
      });

      if (databaseItemContent.length > 0) {
        databaseItemForLocationContent = (
          <>
            <div className="tooltip-title">Coop Item at Location</div>
            {databaseItemContent}
          </>
        );
      }
    }

    if (databaseLocations) {
      databaseLocationContent = this.coopLocationTooltip(
        databaseLocations,
        existingLocation,
        spheres
      );
    }

    if (
      chartItemContent ||
      chartLeadsToContent ||
      databaseChartItemContent ||
      databaseItemForLocationContent ||
      databaseLocationContent ||
      itemForLocationContent ||
      locationContent ||
      mappedIslandForChartContent ||
      requirementsContent
    ) {
      tooltipContent = (
        <div className="tooltip">
          {requirementsContent}
          {locationContent}
          {itemForLocationContent}
          {mappedIslandForChartContent}
          {chartLeadsToContent}
          {chartItemContent}
          {databaseChartItemContent}
          {databaseLocationContent}
          {databaseItemForLocationContent}
        </div>
      );
    }

    return tooltipContent;
  }

  /* istanbul ignore next */
  static isCoopChecked(
    databaseLocations: { generalLocation: string; detailedLocation: string }[],
    databaseState: DatabaseState,
    locations: { generalLocation: string; detailedLocation: string }[],
    itemName: string,
    itemCount: number
  ) {
    const databaseMaxCount = this.getMaxCount(databaseState, itemName);
    const itemMaxCount = LogicHelper.maxItemCount(itemName);

    const checkDatabaseLocations = _.every(databaseLocations, (databaseLocation) => {
        return !!_.find(locations, (location) => _.isMatch(location,databaseLocation))
    });

    return databaseMaxCount > itemCount || (itemCount != itemMaxCount && databaseLocations.length > 0 && !checkDatabaseLocations);
  }
}

type tooltipManagerSettings = {
  chartItem?: string;
  databaseChartItems?: string[];
  databaseItems?: string[];
  databaseLocations?: { generalLocation: string; detailedLocation: string }[];
  itemForLocation?: string;
  locations?: { generalLocation: string; detailedLocation: string }[];
  mappedIslandForChart: string;
  requirements?: any;
  spheres?: Spheres;
  trackerState?: TrackerState;
};
