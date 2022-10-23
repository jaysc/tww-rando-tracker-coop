import { v4 } from "uuid";
import _ from "lodash";
import { Id, toast } from "react-toastify";
import DatabaseHelper from "./database-helper";
import DatabaseState from "./database-state";

export interface IDatabaseLogic {
  userId?: string;
  permaId: string;
  gameId: string;
  mode?: Mode;
  initialData?: InitialData;
  databaseInitialLoad: () => void;
  databaseUpdate: (data: OnDataSaved) => void;
}

type InitialData = {
  trackerState: {
    items: {};
    itemsForLocations: {};
    locationsChecked: {};
  };
};

interface MessageEvent {
  event?: string;
  data?: object;
  message?: string;
  err?: string;
}

interface OnConnect {
  userId: string;
}

export interface OnJoinedRoom {
  id: string;
  entrances: object;
  islandsForCharts: object;
  //(itemname -> (User -> useritem))
  items: Record<string, Record<string, UserItem>>;

  itemsForLocation: object;

  // Key: generalLocation#detailedLocation
  //(key -> (User -> useritem))
  locationsChecked: Record<string, Record<string, UserLocation>>;
}

export type UserItem = {
  count: number;
  generalLocation?: string;
  detailedLocation?: string;
};

type UserLocation = {
  generalLocation: string;
  detailedLocation: string;
};

export enum Mode {
  ITEMSYNC = "ITEMSYNC",
  COOP = "COOP",
}

export enum SaveDataType {
  ENTRANCE = 'ENTRANCE',
  ISLANDS_FOR_CHARTS = 'ISLANDS_FOR_CHARTS',
  ITEM = "ITEM",
  LOCATION = "LOCATION",
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
}

export interface IslandsForChartPayload {
  chart: string
  island: string
}

export interface ItemPayload {
  itemName: string
  count?: number
  generalLocation?: string
  detailedLocation?: string
  sphere?: number
}

export interface LocationPayload {
  generalLocation: string
  detailedLocation: string
  isChecked?: boolean
  itemName?: string
  sphere?: number
}

export default class DatabaseLogic {
  websocket: WebSocket;
  permaId: string;
  gameId: string;
  userId: string;
  mode: Mode;
  roomId: string;
  initialData: InitialData;
  connectingToast: Id;
  successToast: Id;
  disconnectedToast: Id;

  retryInterval?: NodeJS.Timeout;

  databaseInitialLoad: (data: OnJoinedRoom) => void;
  databaseUpdate: (data: OnDataSaved) => void;

  get effectiveUserId () {
    return this.mode === Mode.ITEMSYNC ? this.roomId : this.userId;
  }

  constructor(options: IDatabaseLogic) {
    console.log("connecting to server");
    this.gameId = options.gameId;
    this.permaId = options.permaId;
    this.databaseInitialLoad = options.databaseInitialLoad;
    this.databaseUpdate = options.databaseUpdate;
    this.mode = options.mode ?? Mode.COOP;
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

  public connect() {
    if (!this.connectingToast) {
      this.connectingToast = toast("Connecting to server", {
        autoClose: false,
        closeButton: false,
        hideProgressBar: true,
      });
    }
    this.websocket = new WebSocket(process.env.WEBSOCKET_SERVER, "protocolOne");

    this.websocket.onmessage = this.handleOnMessage.bind(this);

    this.websocket.onopen = function (event) {
      this.clearConnectRetry();
      toast.dismiss(this.disconnectedToast);
      toast.dismiss(this.connectingToast);
      this.displaySuccessToast();
    }.bind(this);

    this.websocket.onclose = function (event) {
      console.warn(event);
      this.displayDisconnectToast();
      this.retryConnect();
    }.bind(this);

    this.websocket.onerror = function (event) {
      console.error(event);
      this.displayDisconnectToast();
      this.retryConnect();
    }.bind(this);
  }

  private displayDisconnectToast() {
    if (!this.disconnectedToast) {
      this.disconnectedToast = toast.error("Disconnected from server", {
        closeButton: false,
        hideProgressBar: true,
      });
    }
  }

  private displaySuccessToast() {
    if (!this.successToast) {
      this.successToast = toast.success("Connected to server", {
        hideProgressBar: true,
      });
    }
  }

  private retryConnect() {
    if (!this.retryInterval) {
      this.retryInterval = setInterval(this.connect.bind(this), 2000);
    }
  }

  private clearConnectRetry() {
    clearInterval(this.retryInterval);
    this.retryInterval = null;
  }

  private joinroom() {
    const message = {
      method: "joinRoom",
      payload: {
        name: this.gameId,
        perma: this.permaId,
        mode: this.mode,
        initialData: this.initialData,
      },
    };
    this.send(message);
  }

  private getItem(itemName?: string) {
    const message = {
      method: "get",
      payload: {
        type: "ITEM",
        itemName,
      },
    };
    this.send(message);
  }

  public setEntrance(exitName: string, entranceName: string) {
    const message = {
      method: "set",
      payload: {
        type: SaveDataType.ENTRANCE,
        entranceName,
        exitName
      }
    }

    this.send(message);
  }

  public setIslandForChart(island: string, chart: string) {
    const message = {
      method: "set",
      payload: {
        type: SaveDataType.ISLANDS_FOR_CHARTS,
        island,
        chart
      }
    }

    this.send(message);
  }

  public setItem(
    databaseState: DatabaseState,
    itemPayload: ItemPayload
  ) {
    const {
      itemName,
      count,
      generalLocation,
      detailedLocation,
      sphere,
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
      },
    };

    this.send(message);

    return databaseState.setItem(this.effectiveUserId, itemPayload)
  }

  private getLocation(generalLocation: string, detailedLocation: string) {
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

  public setLocation(databaseState: DatabaseState, locationPayload: LocationPayload) {
    const {
      generalLocation,
      detailedLocation,
      isChecked
    } = locationPayload;

    const message = {
      method: "set",
      payload: {
        type: SaveDataType.LOCATION,
        generalLocation,
        detailedLocation,
        isChecked,
      },
    };

    this.send(message);
    return databaseState.setLocation(this.effectiveUserId, locationPayload)
  }

  private send(message: object): string {
    const messageId = v4();
    _.set(message, "messageId", messageId);

    this.websocket.send(JSON.stringify(message));

    return messageId;
  }

  private handleOnMessage(response) {
    if (response?.data === "PING") {
      this.websocket.send("PONG");
      return;
    }

    let responseData;
    try {
      responseData = JSON.parse(response.data) as MessageEvent;
    } catch (e) {
      console.warn("Invalid json");
      return;
    }

    console.log("Recieved message:", responseData);

    if (responseData.err) {
      console.warn(responseData.err);
    }

    if (responseData.message) {
      console.log(responseData.message);
    }

    const event = responseData.event;

    switch (event) {
      case "onConnect":
        this.setUserId(responseData.data as OnConnect);
        this.joinroom();
        break;
      case "joinedRoom":
        this.onJoinedRoom(responseData.data as OnJoinedRoom);
        break;
      case "dataSaved":
        this.onDataSaved(responseData.data as OnDataSaved);
        break;
    }
  }

  private setUserId(data: OnConnect) {
    this.userId = data.userId;
    document.cookie = `userId=${this.userId}; Secure`;
    console.log(`userId set to '${this.userId}'`);
  }
  private onJoinedRoom(data: OnJoinedRoom) {
    //Initial load
    this.roomId = data.id;
    this.databaseInitialLoad(data);
  }



  private onDataSaved(data: OnDataSaved) {
    // if (data.type === SaveDataType.LOCATION) {
    //   _.set(this.state, ['locations', DatabaseHelper.getLocationKey(data.generalLocation, data.detailedLocation), data.userId, 'isChecked'], data.isChecked)
    // } else if (data.type === SaveDataType.ITEM) {
    //   _.set(this.state, ['items', data.itemName, data.userId, 'count'], data.count)
    //   _.set(this.state, ['itemsForLocation', DatabaseHelper.getLocationKey(data.generalLocation, data.detailedLocation), data.userId, 'itemName'], data.itemName)
    // }
    this.databaseUpdate(data);
  }
}
