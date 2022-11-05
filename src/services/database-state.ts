import _ from "lodash";
import DatabaseHelper from "./database-helper";
import DatabaseLogic, { EntrancePayload, IslandsForChartPayload, ItemPayload, LocationPayload, OnJoinedRoom } from "./database-logic";

export type IslandsForCharts = Record<string, Record<string, IslandsForChartsValue>>;
export type IslandsForChartsValue = {
  island: string
}

export type Entrances = Record<string, Record<string, EntrancesValue>>;
export type EntrancesValue = {
  entranceName: string
}
export type Items = Record<string, Record<string, ItemsValue>>;
export type ItemsValue = {
  count: number
}

export type LocationsChecked = Record<string, Record<string, LocationsCheckedValue>>;
export type LocationsCheckedValue = {
  isChecked: boolean
}

export type ItemsForLocations = Record<string, Record<string, ItemsForLocationsValue>>;
export type ItemsForLocationsValue = {
  itemName: string
}

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
  }: ItemPayload) {
    const newState = this._clone({
      items: true,
    });

    _.set(newState.items, [itemName, userId], { count })

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

    _.set(newState.locationsChecked, [DatabaseHelper.getLocationKey(generalLocation, detailedLocation), userId], { isChecked })

    return newState;
  }

  public setItemsForLocations(userId: string, {
    itemName,
    generalLocation,
    detailedLocation,
  }: ItemPayload) {
    const newState = this._clone({
      itemsForLocations: true,
    });

    _.set(newState.itemsForLocations, [DatabaseHelper.getLocationKey(generalLocation, detailedLocation), userId], { itemName: itemName ?? "" })

    return newState;
  }

  public setEntrance(userId: string,
    {
      entranceName,
      exitName
    }: EntrancePayload) {
    const newState = this._clone({
      entrances: true,
    });

    if (entranceName) {
      _.set(newState.entrances, [exitName, userId], { entranceName })
    } else {
      _.unset(newState.entrances, [exitName, userId]);
    }

    return newState;
  }

  public setIslandsForCharts(userId: string,
    {
      island,
      chart
    }: IslandsForChartPayload) {
    const newState = this._clone({
      islandsForCharts: true,
    });

    if (island) {
      _.set(newState.islandsForCharts, [chart, userId], { island });
    } else {
      _.unset(newState.islandsForCharts, [chart, userId]);
    }

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