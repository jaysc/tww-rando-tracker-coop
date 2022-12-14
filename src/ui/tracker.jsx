import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { Oval } from 'react-loader-spinner';
import { ToastContainer, toast } from 'react-toastify';

import DatabaseLogic, { SaveDataType } from '../services/database-logic.ts';
import DatabaseState from '../services/database-state.ts';
import LogicHelper from '../services/logic-helper';
import TrackerController from '../services/tracker-controller';

import Buttons from './buttons';
import ColorPickerWindow from './color-picker-window';
import CoopStatus from './coop-status';
import Images from './images';
import ItemsTable from './items-table';
import LocationsTable from './locations-table';
import SphereTracking from './sphere-tracking';
import Statistics from './statistics';
import Storage from './storage';
import 'react-toastify/dist/ReactToastify.css';

class Tracker extends React.PureComponent {
  constructor(props) {
    super(props);

    this.state = {
      chartListOpen: false,
      colorPickerOpen: false,
      colors: {
        extraLocationsBackground: null,
        itemsTableBackground: null,
        sphereTrackingBackground: null,
        statisticsBackground: null,
      },
      databaseStats: {
        connected: false,
        users: {},
      },
      disableLogic: false,
      entrancesListOpen: false,
      isLoading: true,
      lastLocation: null,
      onlyProgressLocations: true,
      openedChartForIsland: null,
      openedExit: null,
      openedLocation: null,
      openedLocationIsDungeon: null,
      hideCoopItemLocations: false,
      showCoopItemSettings: {
        charts: true,
      },
      trackSpheres: true,
    };

    this.initialize();

    this.clearOpenedMenus = this.clearOpenedMenus.bind(this);
    this.clearRaceModeBannedLocations = this.clearRaceModeBannedLocations.bind(this);
    this.decrementItem = this.decrementItem.bind(this);
    this.incrementItem = this.incrementItem.bind(this);
    this.toggleChartList = this.toggleChartList.bind(this);
    this.toggleCoopItemLocations = this.toggleCoopItemLocations.bind(this);
    this.toggleCoopMiscItemLocations = this.toggleCoopMiscItemLocations.bind(this);
    this.toggleColorPicker = this.toggleColorPicker.bind(this);
    this.toggleDisableLogic = this.toggleDisableLogic.bind(this);
    this.toggleEntrancesList = this.toggleEntrancesList.bind(this);
    this.toggleLocationChecked = this.toggleLocationChecked.bind(this);
    this.toggleOnlyProgressLocations = this.toggleOnlyProgressLocations.bind(this);
    this.toggleTrackSpheres = this.toggleTrackSpheres.bind(this);
    this.unsetChartMapping = this.unsetChartMapping.bind(this);
    this.unsetExit = this.unsetExit.bind(this);
    this.unsetLastLocation = this.unsetLastLocation.bind(this);
    this.updateChartMapping = this.updateChartMapping.bind(this);
    this.updateColors = this.updateColors.bind(this);
    this.updateEntranceForExit = this.updateEntranceForExit.bind(this);
    this.updateOpenedChartForIsland = this.updateOpenedChartForIsland.bind(this);
    this.updateOpenedExit = this.updateOpenedExit.bind(this);
    this.updateOpenedLocation = this.updateOpenedLocation.bind(this);

    this.databaseUpdateUsername = this.databaseUpdateUsername.bind(this);
    this.databaseRoomUpdate = this.databaseRoomUpdate.bind(this);
    this.databaseConnectedStatusChanged = this.databaseConnectedStatusChanged.bind(this);
    this.databaseInitialLoad = this.databaseInitialLoad.bind(this);
    this.databaseUpdate = this.databaseUpdate.bind(this);
  }

  async initialize() {
    await Images.importImages();

    const preferences = Storage.loadPreferences();
    if (!_.isNil(preferences)) {
      this.updatePreferences(preferences);
    }

    const {
      gameId, loadProgress, mode, permalink,
    } = this.props;

    let initialData;

    if (loadProgress) {
      const saveData = Storage.loadFromStorage();

      if (!_.isNil(saveData)) {
        try {
          initialData = TrackerController.initializeFromSaveData(saveData);

          toast.success('Progress loaded!');
        } catch (err) {
          TrackerController.reset();
        }
      }

      if (_.isNil(initialData)) {
        toast.error('Could not load progress from save data!');
      }
    }

    if (gameId) {
      DatabaseLogic.initialize({
        gameId,
        initialData,
        mode,
        onRoomUpdate: this.databaseRoomUpdate.bind(this),
        onConnectedStatusChanged: this.databaseConnectedStatusChanged.bind(this),
        onDataSaved: this.databaseUpdate.bind(this),
        onJoinedRoom: this.databaseInitialLoad.bind(this),
        permaId: permalink,
      });
    }

    if (_.isNil(initialData) || gameId) {
      try {
        const decodedPermalink = decodeURIComponent(permalink);

        initialData = await TrackerController.initializeFromPermalink(decodedPermalink);
      } catch (err) {
        toast.error('Tracker could not be initialized!');

        throw err;
      }
    }

    const {
      logic,
      saveData,
      spheres,
      trackerState,
    } = initialData;

    this.setState({
      databaseState: new DatabaseState(),
      isLoading: false,
      logic,
      saveData,
      spheres,
      trackerState,
    });

    DatabaseLogic.connect();
  }

  databaseUpdateUsername(event) {
    const { databaseStats } = this.state;
    const newName = event.target.value;
    if (newName !== _.get(databaseStats.users, DatabaseLogic.userId)) {
      DatabaseLogic.updateUsername(event.target.value);
    }
  }

  databaseRoomUpdate(data) {
    const { databaseStats } = this.state;

    const newDatabaseStats = _.clone(databaseStats);
    _.set(newDatabaseStats, 'users', data.users, {});

    this.setState({
      databaseStats: newDatabaseStats,
    });
  }

  databaseConnectedStatusChanged(newConnectedState) {
    const { databaseStats } = this.state;

    const newDatabaseStats = _.merge({}, databaseStats, { connected: newConnectedState });

    this.setState({
      databaseStats: newDatabaseStats,
    });
  }

  databaseInitialLoad(data) {
    const {
      databaseStats, databaseState, trackerState,
    } = this.state;

    const newDatabaseState = databaseState.setState(data);

    let newTrackerState = trackerState._clone({
      entrances: true,
      islandsForCharts: true,
      items: true,
      locationsChecked: true,
      itemsForLocations: true,
    });

    _.forEach(newDatabaseState.entrances, (entranceData, exitName) => {
      const { entranceName } = DatabaseLogic.getValue(entranceData);

      if (entranceName) {
        _.set(newTrackerState.entrances, exitName, entranceName);
      }
    });

    _.forEach(newDatabaseState.islandsForCharts, (chartData, chart) => {
      const { island } = DatabaseLogic.getValue(chartData);

      if (island) {
        _.set(newTrackerState.islandsForCharts, chart, island);
      }
    });

    _.forEach(newDatabaseState.items, (itemData, itemName) => {
      const { count } = DatabaseLogic.getValue(itemData);

      if (count) {
        _.set(newTrackerState.items, itemName, count ?? 0);
      }
    });

    _.forEach(newDatabaseState.locationsChecked, (locationData, location) => {
      const [generalLocation, detailedLocation] = location.split('#');
      const { isChecked } = DatabaseLogic.getValue(locationData);
      if (isChecked) {
        _.set(
          newTrackerState.locationsChecked,
          [generalLocation, detailedLocation],
          isChecked ?? false,
        );
      }
    });

    _.forEach(newDatabaseState.itemsForLocations, (locationData, location) => {
      const [generalLocation, detailedLocation] = location.split('#');
      const { itemName } = DatabaseLogic.getValue(locationData);
      if (itemName) {
        newTrackerState = newTrackerState.setItemForLocation(
          itemName,
          generalLocation,
          detailedLocation,
        );
      }
    });

    this.updateTrackerState(newTrackerState, newDatabaseState);

    const newDatabaseStats = _.merge({}, databaseStats, { users: data.users });
    this.setState({
      databaseStats: newDatabaseStats,
    });
  }

  async databaseUpdate(data) {
    const { databaseState, trackerState } = this.state;

    const newTrackerState = trackerState._clone({
      entrances: true,
      islandsForCharts: true,
      items: true,
      itemsForLocations: true,
      locationsChecked: true,
    });

    let newDatabaseState = databaseState._clone({
      entrances: true,
      islandsForCharts: true,
      items: true,
      itemsForLocations: true,
      locationsChecked: true,
    });

    if (data.type === SaveDataType.ENTRANCE) {
      const { entranceName, exitName, userId } = data;
      newDatabaseState = newDatabaseState.setEntrance(userId, {
        entranceName,
        exitName,
      });

      _.set(newTrackerState.entrances, exitName, entranceName);
    }

    if (data.type === SaveDataType.ISLANDS_FOR_CHARTS) {
      const { chart, island, userId } = data;

      newDatabaseState = newDatabaseState.setIslandsForCharts(userId, {
        chart,
        island,
      });

      _.set(newTrackerState.islandsForCharts, chart, island);
    }

    if (data.type === SaveDataType.ITEM) {
      const {
        count, detailedLocation, generalLocation, itemName, userId,
      } = data;
      newDatabaseState = newDatabaseState.setItem(userId, {
        itemName, count,
      });

      if (generalLocation && detailedLocation) {
        newDatabaseState = newDatabaseState.setItemsForLocations(
          userId,
          { itemName, generalLocation, detailedLocation },
        );
      }
    }

    if (data.type === SaveDataType.ITEMS_FOR_LOCATIONS) {
      const {
        detailedLocation, generalLocation, itemName, userId,
      } = data;
      newDatabaseState = newDatabaseState.setItemsForLocations(
        userId,
        { itemName, generalLocation, detailedLocation },
      );
    }

    if (data.type === SaveDataType.LOCATION) {
      const {
        detailedLocation, generalLocation, isChecked, userId,
      } = data;
      newDatabaseState = newDatabaseState.setLocation(
        userId,
        {
          generalLocation, detailedLocation, isChecked,
        },
      );
    }

    if (data.userId === DatabaseLogic.userId || data.userId === DatabaseLogic.roomId) {
      if (data.type === SaveDataType.ENTRANCE) {
        const { entranceName, exitName } = data;

        _.set(newTrackerState.entrances, exitName, entranceName);
      } else if (data.type === SaveDataType.ISLANDS_FOR_CHARTS) {
        const { chart, island } = data;

        _.set(newTrackerState.islandsForCharts, chart, island);

        if (newTrackerState.getItemValue(chart) === 1) {
          const chartForIsland = LogicHelper.chartForIslandName(island);
          _.set(newTrackerState.items, chartForIsland, 1);
          newDatabaseState = DatabaseLogic.setItem(newDatabaseState, {
            itemName: chartForIsland,
            count: 1,
          });
        }
      } else if (data.type === SaveDataType.ITEM) {
        const {
          itemName, count, generalLocation, detailedLocation,
        } = data;

        _.set(newTrackerState.items, itemName, count ?? 0);
        if (generalLocation && detailedLocation) {
          _.set(newTrackerState.itemsForLocations, [generalLocation, detailedLocation], itemName);
        }
      } else if (data.type === SaveDataType.ITEMS_FOR_LOCATIONS) {
        const {
          itemName, generalLocation, detailedLocation,
        } = data;
        _.set(newTrackerState.itemsForLocations, [generalLocation, detailedLocation], itemName);
      } else if (data.type === SaveDataType.LOCATION) {
        const {
          generalLocation, detailedLocation, isChecked,
        } = data;
        _.set(
          newTrackerState.locationsChecked,
          [generalLocation, detailedLocation],
          isChecked,
        );
      }
    }

    await this.asyncUpdateTrackerState(newTrackerState, newDatabaseState);
  }

  incrementItem(itemName) {
    const {
      databaseState,
      lastLocation,
      trackerState,
    } = this.state;

    let newTrackerState = trackerState.incrementItem(itemName);

    if (!_.isNil(lastLocation)) {
      const {
        generalLocation,
        detailedLocation,
      } = lastLocation;

      newTrackerState = newTrackerState.setItemForLocation(
        itemName,
        generalLocation,
        detailedLocation,
      );
    }

    let newDatabaseState = databaseState;
    const { generalLocation, detailedLocation } = lastLocation ?? {};

    newDatabaseState = DatabaseLogic.setItem(newDatabaseState, {
      itemName,
      count: newTrackerState.getItemValue(itemName),
      generalLocation,
      detailedLocation,
    });

    this.updateTrackerState(newTrackerState, newDatabaseState);
  }

  decrementItem(itemName) {
    const { databaseState, trackerState } = this.state;

    const newTrackerState = trackerState.decrementItem(itemName);

    let newDatabaseState = databaseState;
    newDatabaseState = DatabaseLogic.setItem(newDatabaseState, {
      itemName,
      count: newTrackerState.getItemValue(itemName),
    });

    this.updateTrackerState(newTrackerState, newDatabaseState);
  }

  toggleLocationChecked(generalLocation, detailedLocation, databaseItems) {
    const { databaseState, trackerState } = this.state;

    let newTrackerState = trackerState.toggleLocationChecked(generalLocation, detailedLocation);
    let newDatabaseState = databaseState;

    newDatabaseState = DatabaseLogic.setLocation(
      newDatabaseState,
      {
        generalLocation,
        detailedLocation,
        isChecked: newTrackerState.isLocationChecked(generalLocation, detailedLocation),
      },
    );

    if (newTrackerState.isLocationChecked(generalLocation, detailedLocation)) {
      this.setState({
        lastLocation: {
          generalLocation,
          detailedLocation,
        },
      });

      if (databaseItems?.length === 1) {
        const itemName = databaseItems[0];
        if (newTrackerState.newIncrementItemValue(itemName)
         > newTrackerState.getItemValue(itemName)) {
          newTrackerState = newTrackerState.incrementItem(itemName);

          if (LogicHelper.isRandomizedChart(itemName)) {
            const island = newTrackerState.getIslandFromChartMapping(itemName);
            if (!_.isNil(island)) {
              const chartForIsland = LogicHelper.chartForIslandName(island);

              newTrackerState = newTrackerState.incrementItem(chartForIsland);
              newDatabaseState = DatabaseLogic.setItem(newDatabaseState, {
                itemName: chartForIsland,
                count: newTrackerState.getItemValue(itemName),
              });
            }
          }
        }

        newTrackerState = newTrackerState.setItemForLocation(
          itemName,
          generalLocation,
          detailedLocation,
        );

        newDatabaseState = DatabaseLogic.setItem(newDatabaseState, {
          itemName,
          count: newTrackerState.getItemValue(itemName),
          generalLocation,
          detailedLocation,
        });
      }
    } else {
      this.setState({ lastLocation: null });

      newTrackerState = newTrackerState.unsetItemForLocation(generalLocation, detailedLocation);

      newDatabaseState = DatabaseLogic.setItemsForLocations(newDatabaseState, {
        itemName: '',
        generalLocation,
        detailedLocation,
      });
    }

    this.updateTrackerState(newTrackerState, newDatabaseState);
  }

  clearRaceModeBannedLocations(dungeonName) {
    const { databaseState, trackerState } = this.state;

    let newTrackerState = trackerState;
    let newDatabaseState = databaseState;

    const raceModeBannedLocations = LogicHelper.raceModeBannedLocations(dungeonName);

    _.forEach(raceModeBannedLocations, ({ generalLocation, detailedLocation }) => {
      if (!newTrackerState.isLocationChecked(generalLocation, detailedLocation)) {
        newTrackerState = newTrackerState.toggleLocationChecked(generalLocation, detailedLocation);

        newDatabaseState = DatabaseLogic.setLocation(
          newDatabaseState,
          { generalLocation, detailedLocation, isChecked: true },
        );
      }
    });

    this.updateTrackerState(newTrackerState, newDatabaseState);
  }

  async asyncUpdateTrackerState(newTrackerState, newDatabaseState) {
    const {
      logic,
      saveData,
      spheres,
      trackerState,
    } = TrackerController.refreshState(newTrackerState);

    const {
      databaseState,
    } = this.state;

    Storage.saveToStorage(saveData);

    return new Promise((resolve) => {
      this.setState({
        databaseState: newDatabaseState ?? databaseState,
        logic,
        saveData,
        spheres,
        trackerState,
      }, resolve);
    });
  }

  updateTrackerState(newTrackerState, newDatabaseState) {
    const {
      logic,
      saveData,
      spheres,
      trackerState,
    } = TrackerController.refreshState(newTrackerState);

    const {
      databaseState,
    } = this.state;

    Storage.saveToStorage(saveData);

    this.setState({
      databaseState: newDatabaseState ?? databaseState,
      logic,
      saveData,
      spheres,
      trackerState,
    });
  }

  toggleDisableLogic() {
    const { disableLogic } = this.state;

    this.updatePreferences({ disableLogic: !disableLogic });
  }

  clearOpenedMenus() {
    this.setState({
      chartListOpen: false,
      entrancesListOpen: false,
      openedChartForIsland: null,
      openedExit: null,
      openedLocation: null,
      openedLocationIsDungeon: null,
    });
  }

  updateOpenedExit(dungeonOrCaveName) {
    this.setState({
      chartListOpen: false,
      entrancesListOpen: false,
      openedChartForIsland: null,
      openedExit: dungeonOrCaveName,
      openedLocation: null,
      openedLocationIsDungeon: null,
    });
  }

  unsetExit(dungeonOrCaveName) {
    const { databaseState, trackerState } = this.state;
    let newDatabaseState = databaseState;

    const entryName = LogicHelper.entryName(dungeonOrCaveName);
    const newTrackerState = trackerState
      .incrementItem(entryName)
      .unsetEntranceForExit(dungeonOrCaveName);

    newDatabaseState = DatabaseLogic.setItem(newDatabaseState, {
      itemName: entryName,
      count: 0,
      useRoomId: true,
    });

    newDatabaseState = DatabaseLogic.setEntrance(newDatabaseState, {
      exitName: dungeonOrCaveName,
    });

    this.updateTrackerState(newTrackerState, newDatabaseState);
  }

  updateEntranceForExit(exitName, entranceName) {
    const { databaseState, trackerState } = this.state;
    let newDatabaseState = databaseState;

    const entryName = LogicHelper.entryName(exitName);
    const newTrackerState = trackerState
      .incrementItem(entryName)
      .setEntranceForExit(exitName, entranceName);

    newDatabaseState = DatabaseLogic.setEntrance(newDatabaseState, {
      exitName,
      entranceName,
      useRoomId: true,
    });
    newDatabaseState = DatabaseLogic.setItem(
      newDatabaseState,
      { count: newTrackerState.getItemValue(entryName), itemName: entryName, useRoomId: true },
    );

    this.updateTrackerState(newTrackerState, newDatabaseState);
    this.clearOpenedMenus();
  }

  updateOpenedLocation({ locationName, isDungeon }) {
    this.setState({
      chartListOpen: false,
      entrancesListOpen: false,
      openedChartForIsland: null,
      openedExit: null,
      openedLocation: locationName,
      openedLocationIsDungeon: isDungeon,
    });
  }

  updateChartMapping(chart, chartForIsland) {
    const {
      databaseState, lastLocation, trackerState,
    } = this.state;
    let newDatabaseState = databaseState;

    let newTrackerState = trackerState
      .setChartMapping(chart, chartForIsland);

    if (newTrackerState.getItemValue(chart) === 0) {
      newTrackerState = newTrackerState.incrementItem(chart);

      if (!_.isNil(lastLocation)) {
        const {
          generalLocation,
          detailedLocation,
        } = lastLocation;

        newTrackerState = newTrackerState.setItemForLocation(
          chart,
          generalLocation,
          detailedLocation,
        );
      }
    }

    if (newTrackerState.getItemValue(chartForIsland) === 0) {
      newTrackerState = newTrackerState.incrementItem(chartForIsland);
    }

    const island = LogicHelper.islandFromChartForIsland(chartForIsland);
    const {
      generalLocation,
      detailedLocation,
    } = lastLocation ?? {};

    newDatabaseState = DatabaseLogic.setIslandsForCharts(newDatabaseState, {
      chart,
      island,
      useRoomId: true,
    });
    newDatabaseState = DatabaseLogic.setItem(newDatabaseState, {
      count: newTrackerState.getItemValue(chart),
      itemName: chart,
      generalLocation,
      detailedLocation,
    });
    newDatabaseState = DatabaseLogic.setItem(newDatabaseState, {
      count: newTrackerState.getItemValue(chartForIsland),
      itemName: chartForIsland,
    });

    this.updateTrackerState(newTrackerState, newDatabaseState);
    this.clearOpenedMenus();
  }

  // Unset via sector should only remove mapping.
  // Unset via chart-list should remove both mapping and decrement chart.
  unsetChartMapping(chartForIsland, decrementChart) {
    const { databaseState, trackerState } = this.state;
    let newTrackerState = trackerState;
    let newDatabaseState = databaseState;

    if (decrementChart) {
      const island = LogicHelper.islandFromChartForIsland(chartForIsland);
      const chart = trackerState.getChartFromChartMapping(island);

      newTrackerState = newTrackerState
        .decrementItem(chart);

      newDatabaseState = DatabaseLogic.setItem(newDatabaseState, {
        itemName: chart,
        count: newTrackerState.getItemValue(chart),
      });
    }

    newTrackerState = newTrackerState
      .decrementItem(chartForIsland)
      .unsetChartMapping(chartForIsland);
    newDatabaseState = DatabaseLogic.setItem(newDatabaseState, {
      itemName: chartForIsland,
      count: newTrackerState.getItemValue(chartForIsland),
    });

    const island = LogicHelper.islandFromChartForIsland(chartForIsland);
    const chart = trackerState.getChartFromChartMapping(island);

    newDatabaseState = DatabaseLogic.setIslandsForCharts(newDatabaseState, {
      chart,
      island: null,
      useRoomId: true,
    });

    this.updateTrackerState(newTrackerState, newDatabaseState);
  }

  updateOpenedChartForIsland(openedChartForIsland) {
    this.setState({
      chartListOpen: false,
      entrancesListOpen: false,
      openedChartForIsland,
      openedExit: null,
      openedLocation: null,
      openedLocationIsDungeon: null,
    });
  }

  toggleChartList() {
    const { chartListOpen } = this.state;

    this.setState({
      chartListOpen: !chartListOpen,
      entrancesListOpen: false,
      openedChartForIsland: null,
      openedExit: null,
      openedLocation: null,
      openedLocationIsDungeon: null,
    });
  }

  toggleEntrancesList() {
    const { entrancesListOpen } = this.state;

    this.setState({
      chartListOpen: false,
      entrancesListOpen: !entrancesListOpen,
      openedChartForIsland: null,
      openedExit: null,
      openedLocation: null,
      openedLocationIsDungeon: null,
    });
  }

  toggleOnlyProgressLocations() {
    const { onlyProgressLocations } = this.state;

    this.updatePreferences({ onlyProgressLocations: !onlyProgressLocations });
  }

  toggleColorPicker() {
    const { colorPickerOpen } = this.state;

    this.setState({
      colorPickerOpen: !colorPickerOpen,
    });
  }

  toggleTrackSpheres() {
    const { trackSpheres } = this.state;

    this.updatePreferences({ trackSpheres: !trackSpheres });
  }

  toggleCoopItemLocations() {
    const { hideCoopItemLocations } = this.state;

    this.setState({
      hideCoopItemLocations: !hideCoopItemLocations,
    });
  }

  toggleCoopMiscItemLocations() {
    const { showCoopItemSettings } = this.state;

    const newShowCoopItemSettings = _.merge(
      {},
      showCoopItemSettings,
      { charts: !showCoopItemSettings.charts },
    );

    this.setState({
      showCoopItemSettings: newShowCoopItemSettings,
    });
  }

  unsetLastLocation() {
    this.setState({ lastLocation: null });
  }

  updateColors(colorChanges) {
    this.updatePreferences({ colors: colorChanges });
  }

  updatePreferences(preferenceChanges) {
    const {
      colors,
      disableLogic,
      onlyProgressLocations,
      trackSpheres,
    } = this.state;

    const existingPreferences = {
      colors,
      disableLogic,
      onlyProgressLocations,
      trackSpheres,
    };

    const newPreferences = _.merge({}, existingPreferences, preferenceChanges);

    this.setState(newPreferences);
    Storage.savePreferences(newPreferences);
  }

  render() {
    const {
      chartListOpen,
      colorPickerOpen,
      colors,
      databaseState,
      databaseStats,
      disableLogic,
      entrancesListOpen,
      isLoading,
      lastLocation,
      logic,
      onlyProgressLocations,
      openedChartForIsland,
      openedExit,
      openedLocation,
      openedLocationIsDungeon,
      saveData,
      hideCoopItemLocations,
      showCoopItemSettings,
      spheres,
      trackerState,
      trackSpheres,
    } = this.state;

    const {
      extraLocationsBackground,
      itemsTableBackground,
      sphereTrackingBackground,
      statisticsBackground,
    } = colors;

    let content;

    if (isLoading) {
      content = (
        <div className="loading-spinner">
          <Oval color="white" secondaryColor="gray" />
        </div>
      );
    } else {
      content = (
        <div className="tracker-container">
          {!databaseStats.connected && <div className="darken-background" />}
          <div className="tracker">
            <ItemsTable
              backgroundColor={itemsTableBackground}
              databaseState={databaseState}
              decrementItem={this.decrementItem}
              incrementItem={this.incrementItem}
              spheres={spheres}
              trackerState={trackerState}
              trackSpheres={trackSpheres}
            />
            <LocationsTable
              backgroundColor={extraLocationsBackground}
              chartListOpen={chartListOpen}
              clearOpenedMenus={this.clearOpenedMenus}
              clearRaceModeBannedLocations={this.clearRaceModeBannedLocations}
              databaseState={databaseState}
              decrementItem={this.decrementItem}
              disableLogic={disableLogic}
              entrancesListOpen={entrancesListOpen}
              incrementItem={this.incrementItem}
              logic={logic}
              onlyProgressLocations={onlyProgressLocations}
              openedChartForIsland={openedChartForIsland}
              openedExit={openedExit}
              openedLocation={openedLocation}
              openedLocationIsDungeon={openedLocationIsDungeon}
              hideCoopItemLocations={hideCoopItemLocations}
              showCoopItemSettings={showCoopItemSettings}
              spheres={spheres}
              toggleLocationChecked={this.toggleLocationChecked}
              trackerState={trackerState}
              trackSpheres={trackSpheres}
              updateChartMapping={this.updateChartMapping}
              updateOpenedChartForIsland={this.updateOpenedChartForIsland}
              unsetChartMapping={this.unsetChartMapping}
              unsetExit={this.unsetExit}
              updateEntranceForExit={this.updateEntranceForExit}
              updateOpenedExit={this.updateOpenedExit}
              updateOpenedLocation={this.updateOpenedLocation}
            />
            <Statistics
              backgroundColor={statisticsBackground}
              databaseState={databaseState}
              disableLogic={disableLogic}
              logic={logic}
              onlyProgressLocations={onlyProgressLocations}
            />
          </div>
          {trackSpheres && (
            <SphereTracking
              backgroundColor={sphereTrackingBackground}
              lastLocation={lastLocation}
              trackerState={trackerState}
              unsetLastLocation={this.unsetLastLocation}
            />
          )}
          {colorPickerOpen && (
            <ColorPickerWindow
              extraLocationsBackground={extraLocationsBackground}
              itemsTableBackground={itemsTableBackground}
              sphereTrackingBackground={sphereTrackingBackground}
              statisticsBackground={statisticsBackground}
              toggleColorPicker={this.toggleColorPicker}
              updateColors={this.updateColors}
            />
          )}
          <CoopStatus
            databaseStats={databaseStats}
            databaseUpdateUsername={this.databaseUpdateUsername}
          />
          <Buttons
            colorPickerOpen={colorPickerOpen}
            disableLogic={disableLogic}
            chartListOpen={chartListOpen}
            entrancesListOpen={entrancesListOpen}
            onlyProgressLocations={onlyProgressLocations}
            saveData={saveData}
            hideCoopItemLocations={hideCoopItemLocations}
            hideCoopMiscItemLocations={showCoopItemSettings.charts}
            trackSpheres={trackSpheres}
            toggleChartList={this.toggleChartList}
            toggleColorPicker={this.toggleColorPicker}
            toggleCoopItemLocations={this.toggleCoopItemLocations}
            toggleCoopMiscItemLocations={this.toggleCoopMiscItemLocations}
            toggleDisableLogic={this.toggleDisableLogic}
            toggleEntrancesList={this.toggleEntrancesList}
            toggleOnlyProgressLocations={this.toggleOnlyProgressLocations}
            toggleTrackSpheres={this.toggleTrackSpheres}
          />
        </div>
      );
    }

    return (
      <>
        {content}
        <ToastContainer />
      </>
    );
  }
}

Tracker.propTypes = {
  mode: PropTypes.string.isRequired,
  loadProgress: PropTypes.bool.isRequired,
  permalink: PropTypes.string.isRequired,
  gameId: PropTypes.string.isRequired,
};

export default Tracker;
