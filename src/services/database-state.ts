import _ from "lodash";
import DatabaseHelper from "./database-helper";
import { ItemPayload, LocationPayload, OnJoinedRoom, UserItem } from "./database-logic";

export interface IDatabaseState {
  items: Record<string, Record<string, UserItem>>;
  locations: object;
};

export default class DatabaseState {
  entrances: object
  islandsForCharts: object
  items: object
  locationsChecked: object
  itemsForLocations: object

  constructor() {
    this.entrances = {};
    this.islandsForCharts = {};
    this.items = {};
    this.locationsChecked = {};
    this.itemsForLocations = {};
  }

  public setState(data: OnJoinedRoom) {
    const newState = this._clone({
      entrances: true,
      islandsForCharts: true,
      items: true,
      itemsForLocations: true,
      locationsChecked: true,
    });

    newState.entrances = data.entrances;
    newState.islandsForCharts = data.islandsForCharts;
    newState.items = data.items;
    newState.locationsChecked = data.locationsChecked;
    newState.itemsForLocations = data.itemsForLocation;

    return newState;
  }

  public setItem(userId: string, {
    itemName,
    count,
    generalLocation,
    detailedLocation,
  }: ItemPayload) {
    const newState = this._clone({
      items: true,
      itemsForLocations: true,
    });

    _.set(newState.items, [itemName, userId], { count })
    if (generalLocation && detailedLocation) {
      _.set(newState.itemsForLocations, [DatabaseHelper.getLocationKey(generalLocation, detailedLocation)
        , userId], { itemName })
    }

    return newState;
  }

  public setLocation(userId: string, {
    generalLocation,
    detailedLocation,
    isChecked
  }: LocationPayload) {
    const newState = this._clone({
      locationsChecked: true,
    });

    _.set(this.locationsChecked, [DatabaseHelper.getLocationKey(generalLocation, detailedLocation), userId], { isChecked })
  
    return newState;
  }

  _clone({
    entrances: cloneEntrances,
    islandsForCharts: cloneIslandsForCharts,
    items: cloneItems,
    locationsChecked: cloneLocationsChecked,
    itemsForLocations: cloneItemsForLocations,
  }: {
    entrances?: boolean,
    islandsForCharts?: boolean,
    items?: boolean,
    locationsChecked?: boolean,
    itemsForLocations?: boolean,
  }) {
    const newState = new DatabaseState();

    newState.entrances = cloneEntrances
      ? _.clone(this.entrances)
      : this.entrances;
    newState.islandsForCharts = cloneIslandsForCharts
      ? _.clone(this.islandsForCharts)
      : this.islandsForCharts;
    newState.items = cloneItems
      ? _.clone(this.items)
      : this.items;
    newState.locationsChecked = cloneLocationsChecked
      ? _.cloneDeep(this.locationsChecked)
      : this.locationsChecked;
    newState.itemsForLocations = cloneItemsForLocations
      ? _.cloneDeep(this.itemsForLocations)
      : this.itemsForLocations;

    return newState;
  }
}