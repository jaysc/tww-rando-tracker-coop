/* istanbul ignore file */
import { v4 } from "uuid";
import _ from "lodash";
import { Id, toast } from "react-toastify";
import DatabaseState, { Entrances, IslandsForCharts, Items, ItemsForLocations, LocationsChecked } from "./database-state";
import DatabaseQueue from "./database-queue";

export interface IDatabaseLogic {
  userId?: string;
  permaId: string;
  gameId: string;
  mode?: string;
  initialData?: InitialData;
  onConnectedStatusChanged: (status: boolean) => void;
  onJoinedRoom: (data: OnJoinedRoom) => void;
  onDataSaved: (data: OnDataSaved) => void;
  onRoomUpdate: (data: RoomUpdateEvent) => void;
}

type InitialData = {
  trackerState: {
    items: {};
    itemsForLocations: {};
    locationsChecked: {};
  };
};

interface MessageEvent {
  data?: object
  error?: string
  event: string
  message?: string
  messageId?: string
}

interface OnConnect {
  userId: string;
}

export interface OnJoinedRoom {
  users: Record<string, string>;
  entrances: Entrances;
  id: string;
  islandsForCharts: IslandsForCharts;
  items: Items;
  itemsForLocation: ItemsForLocations;
  locationsChecked: LocationsChecked;
  mode: Mode;
}

export enum Mode {
  ITEMSYNC = "ITEMSYNC",
  COOP = "COOP",
}

export enum SaveDataType {
  ENTRANCE = 'ENTRANCE',
  ISLANDS_FOR_CHARTS = 'ISLANDS_FOR_CHARTS',
  ITEMS_FOR_LOCATIONS = 'ITEMS_FOR_LOCATIONS',
  ITEM = 'ITEM',
  LOCATION = 'LOCATION',
  RS_SETTINGS = 'RS_SETTINGS'
}

export type OnDataSaved = {
  count?: number;
  itemName?: string;
  type: SaveDataType;
  userId: string;
  generalLocation?: string;
  detailedLocation?: string;
  isChecked?: boolean;
};

export interface EntrancePayload {
  entranceName: string
  exitName: string
  useRoomId?: boolean
}

export interface IslandsForChartPayload {
  chart: string
  island: string
  useRoomId?: boolean
}

export interface ItemPayload {
  itemName: string
  count?: number
  generalLocation?: string
  detailedLocation?: string
  sphere?: number
  useRoomId?: boolean
}

export interface ItemsForLocationsPayload {
  itemName: string
  generalLocation: string
  detailedLocation: string
  useRoomId?: boolean
}

export interface LocationPayload {
  generalLocation: string
  detailedLocation: string
  isChecked?: boolean
  itemName?: string
  sphere?: number
  useRoomId?: boolean
}

export interface RoomUpdateEvent {
  users: Record<string, string>
}

function getCookie(n) {
  let a = `; ${document.cookie}`.match(`;\\s*${n}=([^;]+)`);
  return a ? a[1] : '';
}

class DatabaseLogic {
  static connected: boolean;
  static connectingToast: Id;
  static disconnectedToast: Id;
  static gameId: string;
  static initialData: InitialData;
  static mode: Mode;
  static permaId: string;
  static queue: DatabaseQueue = new DatabaseQueue();
  static roomId: string;
  static successToast: Id;
  static userId: string;
  static users: Record<string, string>
  static websocket: WebSocket;

  static retryInterval?: NodeJS.Timeout;

  static onJoinedRoom: (data: OnJoinedRoom) => void;
  static onDataSaved: (data: OnDataSaved) => void;
  static onConnectedStatusChanged:(status: boolean) => void;
  static onRoomUpdate: (data: RoomUpdateEvent) => void;

  static get effectiveUserId() {
    return this.mode === Mode.ITEMSYNC ? this.roomId : this.userId;
  }

  static get globalUseRoom() {
    return this.mode === Mode.ITEMSYNC;
  }

  public static initialize(options: IDatabaseLogic) {
    this.gameId = options.gameId;
    this.permaId = options.permaId;
    this.onConnectedStatusChanged = options.onConnectedStatusChanged;
    this.onJoinedRoom = options.onJoinedRoom;
    this.onDataSaved = options.onDataSaved;
    this.onRoomUpdate = options.onRoomUpdate;
    this.mode = options.mode?.toUpperCase() as Mode ?? Mode.COOP;

    //This all needs to be reviewed. isn't used
    if (options.initialData) {
      const initialData: InitialData = {
        trackerState: {
          items: {},
          itemsForLocations: {},
          locationsChecked: {},
        },
      };

      initialData.trackerState.items = _.reduce(
        options.initialData.trackerState.items,
        (result, value, key) => {
          if (!!value) {
            result[key] = value;
          }

          return result;
        },
        {}
      );

      initialData.trackerState.itemsForLocations = _.reduce(
        options.initialData.trackerState.itemsForLocations,
        (result, detailedLocations, generalLocation) => {
          const reduceResult = _.reduce(
            detailedLocations,
            (generalLocationResult, value, key) => {
              if (!!value) {
                generalLocationResult[key] = value;
              }

              return generalLocationResult;
            },
            {}
          );

          if (Object.keys(reduceResult).length) {
            result[generalLocation] = reduceResult;
          }

          return result;
        },
        {}
      );

      initialData.trackerState.locationsChecked = _.reduce(
        options.initialData.trackerState.locationsChecked,
        (result, detailedLocations, generalLocation) => {
          const reduceResult = _.reduce(
            detailedLocations,
            (generalLocationResult, value, key) => {
              if (!!value) {
                generalLocationResult[key] = value;
              }

              return generalLocationResult;
            },
            {}
          );
          if (Object.keys(reduceResult).length) {
            result[generalLocation] = reduceResult;
          }

          return result;
        },
        {}
      );

      this.initialData = initialData;
    }
  }

  public static connect() {
    if (!this.connectingToast) {
      this.connectingToast = toast("Connecting to server", {
        autoClose: false,
        closeButton: false,
        hideProgressBar: true,
        onClose: () => {
          this.connectingToast = null
        }
      });
      this.updateConnectedStatus(false)
    }

    const cookieUserId = getCookie('userId');
    this.websocket = new WebSocket(process.env.WEBSOCKET_SERVER + (cookieUserId ? `?userId=${cookieUserId}` : ''), "protocolOne");

    this.websocket.onmessage = this.handleOnMessage.bind(this);

    this.websocket.onopen = (event) => {
      this.clearConnectRetry();
      toast.dismiss(this.disconnectedToast);
      this.disconnectedToast = null;
      toast.dismiss(this.connectingToast);
      this.connectingToast = null;
      this.displaySuccessToast();
      this.updateConnectedStatus(true)
    };

    this.websocket.onclose = (event) =>{
      console.warn(event);
      this.displayDisconnectToast();
      this.retryConnect();
      this.updateConnectedStatus(false)
    };

    this.websocket.onerror = (event) => {
      console.error(event);
      this.displayDisconnectToast();
      this.retryConnect();
      this.updateConnectedStatus(false)
    }
  }

  public static updateConnectedStatus(newStatus: boolean) {
    this.connected = newStatus;
    this.onConnectedStatusChanged(this.connected);
  }

  private static displayDisconnectToast() {
    if (this.successToast) {
      toast.dismiss(this.successToast);
    }
    if (!this.disconnectedToast) {
      this.disconnectedToast = toast.error("Disconnected from server", {
        closeButton: false,
        hideProgressBar: true,
        onClose: () => {
          this.disconnectedToast = null
        }
      });
    }
  }

  private static displaySuccessToast() {
    if (!this.successToast) {
      this.successToast = toast.success("Connected to server", {
        hideProgressBar: true,
        onClose: () => {
          this.successToast = null
        }
      });
    }
  }

  private static retryConnect() {
    if (!this.retryInterval) {
      this.retryInterval = setInterval(this.connect.bind(this), 2000);
    }
  }

  private static clearConnectRetry() {
    clearInterval(this.retryInterval);
    this.retryInterval = null;
  }

  private static joinroom() {
    const message = {
      method: "joinRoom",
      payload: {
        name: this.gameId,
        username: getCookie('username'),
        perma: this.permaId,
        mode: this.mode,
        initialData: this.initialData,
      },
    };
    this.send(message);
  }

  private static getItem(itemName?: string) {
    const message = {
      method: "get",
      payload: {
        type: "ITEM",
        itemName,
      },
    };
    this.send(message);
  }

  public static setEntrance(databaseState: DatabaseState,
    entrancePayload: EntrancePayload) {
    const { entranceName, exitName, useRoomId } = entrancePayload;

    const message = {
      method: "set",
      payload: {
        type: SaveDataType.ENTRANCE,
        entranceName,
        exitName,
        useRoomId: useRoomId || this.globalUseRoom
      }
    }

    this.send(message);

    return databaseState.setEntrance(useRoomId ? this.roomId :this.effectiveUserId, entrancePayload)
  }

  public static setIslandsForCharts(
    databaseState: DatabaseState
    , islandsForChartsPayload: IslandsForChartPayload
  ) {
    const { island, chart, useRoomId } = islandsForChartsPayload;
    const message = {
      method: "set",
      payload: {
        type: SaveDataType.ISLANDS_FOR_CHARTS,
        island,
        chart,
        useRoomId: useRoomId || this.globalUseRoom
      }
    }

    this.send(message);

    return databaseState.setIslandsForCharts(useRoomId ? this.roomId :this.effectiveUserId, islandsForChartsPayload)
  }

  public static setItem(
    databaseState: DatabaseState,
    itemPayload: ItemPayload
  ) {
    const {
      itemName,
      count,
      generalLocation,
      detailedLocation,
      sphere,
      useRoomId
    } = itemPayload;

    const message = {
      method: "set",
      payload: {
        type: SaveDataType.ITEM,
        itemName,
        count,
        generalLocation,
        detailedLocation,
        sphere,
        useRoomId: useRoomId || this.globalUseRoom,
      },
    };

    this.send(message);

    let newDatabaseState = databaseState.setItem(useRoomId ? this.roomId : this.effectiveUserId, itemPayload)

    if (generalLocation && detailedLocation) {
      newDatabaseState = newDatabaseState.setItemsForLocations(useRoomId ? this.roomId :this.effectiveUserId, itemPayload);
    }

    return newDatabaseState;
  }

  public static setItemsForLocations(
    databaseState: DatabaseState,
    itemsForLocationsPayload: ItemsForLocationsPayload
  ) {
    const {
      itemName,
      generalLocation,
      detailedLocation,
      useRoomId
    } = itemsForLocationsPayload;

    const message = {
      method: "set",
      payload: {
        type: SaveDataType.ITEMS_FOR_LOCATIONS,
        itemName,
        generalLocation,
        detailedLocation,
        useRoomId: useRoomId || this.globalUseRoom,
      },
    };

    this.send(message);

    let newDatabaseState = databaseState.setItemsForLocations(useRoomId ? this.roomId :this.effectiveUserId, itemsForLocationsPayload);

    return newDatabaseState;
  }

  private static getLocation(generalLocation: string, detailedLocation: string) {
    const message = {
      method: "get",
      data: {
        type: SaveDataType.LOCATION,
        generalLocation,
        detailedLocation,
      },
    };

    this.send(message);
  }

  public static setLocation(databaseState: DatabaseState, locationPayload: LocationPayload) {
    const {
      generalLocation,
      detailedLocation,
      isChecked,
      useRoomId
    } = locationPayload;

    const message = {
      method: "set",
      payload: {
        type: SaveDataType.LOCATION,
        generalLocation,
        detailedLocation,
        isChecked,
        useRoomId: useRoomId || this.globalUseRoom,
      },
    };

    this.send(message);

    let newDatabaseState = databaseState.setLocation(useRoomId ? this.roomId : this.effectiveUserId, locationPayload);

    return newDatabaseState;
  }

  private static send(message: object): string {
    const messageId = v4();
    _.set(message, "messageId", messageId);

    this.websocket.send(JSON.stringify(message));

    console.log("Sent message:", message);

    return messageId;
  }

  private static handleOnMessage(response) {
    if (response?.data === "PING") {
      this.websocket.send("PONG");
      return;
    }

    let responseData: MessageEvent;
    try {
      responseData = JSON.parse(response.data) as MessageEvent;
    } catch (e) {
      console.warn("Invalid json");
      return;
    }

    console.log("Recieved message:", responseData);

    if (responseData.error) {
      console.warn(responseData.error);

      toast.error(`Error: ${responseData.error}`, {
        closeButton: false,
        autoClose: false,
        hideProgressBar: true,
      });

      return;
    }

    const event = responseData.event;

    switch (event) {
      case "onConnect":
        this.setUserId(responseData.data as OnConnect);
        this.joinroom();
        break;
      case "joinedRoom":
        this.onJoinedRoomHandle(responseData.data as OnJoinedRoom);
        break;
      case "dataSaved":
        this.onDataSavedHandle(responseData.data as OnDataSaved);
        break;
      case "roomUpdate":
        this.onRoomUpdateHandle(responseData.data as RoomUpdateEvent);
        break;
    }
  }

  private static onRoomUpdateHandle(data: RoomUpdateEvent) {
    let userChange = 0;
    if (_.size(this.users) < _.size(data.users)) {
      const connectedUser = _.find(data.users, (username, userId) => {
        return _.isNil(_.get(this.users, userId, null));
      });
      if (connectedUser) {
        toast(`${connectedUser} connected`);
      }
    } else if (_.size(this.users) > _.size(data.users)) {
      const disconnectedUser = _.find(this.users, (username, userId) => {
        return _.isNil(_.get(data.users, userId, null));
      });
      if (disconnectedUser) {
        toast(`${disconnectedUser} disconnected`);
      }
    }

    this.users = data.users;
    document.cookie = `username=${_.get(this.users, this.userId)}; Secure; SameSite=None`;

    this.queue.add({
      data,
      action: this.onRoomUpdate
    });
  }

  private static setUserId(data: OnConnect) {
    this.userId = data.userId;
    document.cookie = `userId=${this.userId}; Secure; SameSite=None`;
  }

  private static onJoinedRoomHandle(data: OnJoinedRoom) {
    //Initial load
    this.roomId = data.id;
    this.users = data.users;
    document.cookie = `username=${_.get(this.users, this.userId)}; Secure; SameSite=None`;
    this.queue.add({
      data,
      action: this.onJoinedRoom
    });
  }

  private static async onDataSavedHandle(data: OnDataSaved) {
    this.queue.add({
      data,
      action: this.onDataSaved
    });
  }

  public static getValue(data: IslandsForCharts | LocationsChecked | Items | ItemsForLocations | Entrances) {
    let result;

    result = _.get(data, this.effectiveUserId)

    if (_.isNil(result)) {
      result = _.get(data, this.roomId)
    }

    return result ?? {};
  }

  public static updateUsername(newName) {
    const message = {
      method: "setName",
      payload: {
        name: newName
      },
    };

    this.send(message);
  }
}

export default DatabaseLogic;