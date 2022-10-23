import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';
import { Oval } from 'react-loader-spinner';
import { ToastContainer, toast } from 'react-toastify';

// eslint-disable-next-line import/no-unresolved, import/extensions
import Database, { Mode, SaveDataType } from '../services/database';
import LogicHelper from '../services/logic-helper';
import TrackerController from '../services/tracker-controller';

import Buttons from './buttons';
import ColorPickerWindow from './color-picker-window';
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
      disableLogic: false,
      entrancesListOpen: false,
      isLoading: true,
      lastLocation: null,
      onlyProgressLocations: true,
      openedChartForIsland: null,
      openedExit: null,
      openedLocation: null,
      openedLocationIsDungeon: null,
      syncTracker: true,
      trackSpheres: false,
    };

    this.initialize();

    this.clearOpenedMenus = this.clearOpenedMenus.bind(this);
    this.clearRaceModeBannedLocations = this.clearRaceModeBannedLocations.bind(this);
    this.decrementItem = this.decrementItem.bind(this);
    this.incrementItem = this.incrementItem.bind(this);
    this.toggleChartList = this.toggleChartList.bind(this);
    this.toggleColorPicker = this.toggleColorPicker.bind(this);
    this.toggleDisableLogic = this.toggleDisableLogic.bind(this);
    this.toggleEntrancesList = this.toggleEntrancesList.bind(this);
    this.toggleLocationChecked = this.toggleLocationChecked.bind(this);
    this.toggleOnlyProgressLocations = this.toggleOnlyProgressLocations.bind(this);
    this.toggleSyncTracker = this.toggleSyncTracker.bind(this);
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

    this.databaseInitialLoad = this.databaseInitialLoad.bind(this);
    this.databaseUpdate = this.databaseUpdate.bind(this);
  }

  async initialize() {
    await Images.importImages();

    const preferences = Storage.loadPreferences();
    if (!_.isNil(preferences)) {
      this.updatePreferences(preferences);
    }

    const { loadProgress, permalink, gameId } = this.props;

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

    let database;
    if (gameId) {
      database = new Database({
        permaId: permalink,
        gameId,
        databaseInitialLoad: this.databaseInitialLoad.bind(this),
        databaseUpdate: this.databaseUpdate.bind(this),
        initialData,
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
      database,
      isLoading: false,
      logic,
      saveData,
      spheres,
      trackerState,
    });

    if (database) {
      database.connect();
    }
  }

  databaseInitialLoad() {
    const { database, trackerState } = this.state;

    let newTrackerState = trackerState._clone({
      items: true,
      locationsChecked: true,
    });

    const destructId = database.mode === Mode.ITEMSYNC ? database.roomId : database.userId;

    _.forEach(database.state.entrances, (entranceData, exitName) => {
      const { entranceName } = entranceData[destructId] ?? {};

      if (entranceName) {
        _.set(newTrackerState.entrances, exitName, entranceName);
      }
    });

    _.forEach(database.state.islandsForCharts, (chartData, chart) => {
      const { island } = chartData[destructId] ?? {};

      if (island) {
        _.set(newTrackerState.islandsForCharts, chart, island);
      }
    });

    _.forEach(database.state.items, (itemData, itemName) => {
      const { count } = itemData[destructId] ?? {};

      if (count) {
        _.set(newTrackerState.items, itemName, count ?? 0);
      }
    });

    _.forEach(database.state.locations, (locationData, location) => {
      const [generalLocation, detailedLocation] = location.split('#');
      const { isChecked } = locationData[destructId] ?? {};
      if (isChecked) {
        _.set(
          newTrackerState.locationsChecked,
          [generalLocation, detailedLocation],
          isChecked ?? false,
        );
      }
    });

    _.forEach(database.state.itemsForLocation, (locationData, location) => {
      const [generalLocation, detailedLocation] = location.split('#');
      const { itemName } = locationData[destructId] ?? {};

      if (itemName) {
        newTrackerState = newTrackerState.setItemForLocation(
          itemName,
          generalLocation,
          detailedLocation,
        );
      }
    });

    this.updateTrackerState(newTrackerState);
  }

  databaseUpdate(data) {
    const { database, trackerState } = this.state;

    const destructId = database.mode === Mode.ITEMSYNC ? database.roomId : database.userId;

    let newTrackerState = trackerState._clone({
      items: true,
      itemsForLocations: true,
      locationsChecked: true,
    });
    if (data.userId === destructId) {
      if (data.type === SaveDataType.ITEM) {
        const {
          itemName, count, generalLocation, detailedLocation,
        } = data;

        _.set(newTrackerState.items, itemName, count ?? 0);
        if (generalLocation && detailedLocation) {
          newTrackerState = newTrackerState.setItemForLocation(
            itemName,
            generalLocation,
            detailedLocation,
          );
        }
      } else if (data.type === SaveDataType.LOCATION) {
        _.set(
          newTrackerState.locationsChecked,
          [data.generalLocation, data.detailedLocation],
          data.isChecked ?? false,
        );
      }
    }

    this.updateTrackerState(newTrackerState);
  }

  incrementItem(itemName) {
    const {
      database,
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

    this.updateTrackerState(newTrackerState);

    if (database) {
      const { generalLocation, detailedLocation } = lastLocation ?? {};

      database.setItem(itemName, {
        count: newTrackerState.getItemValue(itemName),
        generalLocation,
        detailedLocation,
      });
    }
  }

  decrementItem(itemName) {
    const { database, trackerState } = this.state;

    const newTrackerState = trackerState.decrementItem(itemName);

    this.updateTrackerState(newTrackerState);

    if (database) {
      database.setItem(itemName, {
        count: newTrackerState.getItemValue(itemName),
      });
    }
  }

  toggleLocationChecked(generalLocation, detailedLocation) {
    const { database, trackerState } = this.state;

    let newTrackerState = trackerState.toggleLocationChecked(generalLocation, detailedLocation);

    if (newTrackerState.isLocationChecked(generalLocation, detailedLocation)) {
      this.setState({
        lastLocation: {
          generalLocation,
          detailedLocation,
        },
      });

      if (database) {
        database.setLocation(generalLocation, detailedLocation, true);
      }
    } else {
      this.setState({ lastLocation: null });

      newTrackerState = newTrackerState.unsetItemForLocation(generalLocation, detailedLocation);

      if (database) {
        database.setLocation(generalLocation, detailedLocation, false);
      }
    }

    this.updateTrackerState(newTrackerState);
  }

  clearRaceModeBannedLocations(dungeonName) {
    let { trackerState: newTrackerState } = this.state;

    const raceModeBannedLocations = LogicHelper.raceModeBannedLocations(dungeonName);

    _.forEach(raceModeBannedLocations, ({ generalLocation, detailedLocation }) => {
      if (!newTrackerState.isLocationChecked(generalLocation, detailedLocation)) {
        newTrackerState = newTrackerState.toggleLocationChecked(generalLocation, detailedLocation);
      }
    });

    this.updateTrackerState(newTrackerState);
  }

  updateTrackerState(newTrackerState) {
    const {
      logic,
      saveData,
      spheres,
      trackerState,
    } = TrackerController.refreshState(newTrackerState);

    Storage.saveToStorage(saveData);
    this.setState({
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
    const { trackerState } = this.state;

    const entryName = LogicHelper.entryName(dungeonOrCaveName);
    const newTrackerState = trackerState
      .incrementItem(entryName)
      .unsetEntranceForExit(dungeonOrCaveName);

    this.updateTrackerState(newTrackerState);
  }

  updateEntranceForExit(exitName, entranceName) {
    const { database, trackerState } = this.state;

    const entryName = LogicHelper.entryName(exitName);
    const newTrackerState = trackerState
      .incrementItem(entryName)
      .setEntranceForExit(exitName, entranceName);

    this.updateTrackerState(newTrackerState);

    if (database) {
      database.setEntrance(exitName, entranceName);
      database.setItem(entryName, { count: newTrackerState.getItemValue(entryName) });
    }

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
    const { database, lastLocation, trackerState } = this.state;

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

    if (database) {
      const island = LogicHelper.islandFromChartForIsland(chartForIsland);
      const {
        generalLocation,
        detailedLocation,
      } = lastLocation ?? {};

      database.setIslandForChart(island, chart);
      database.setItem(chart, {
        count: newTrackerState.getItemValue(chart),
        generalLocation,
        detailedLocation,
      });
      database.setItem(chartForIsland, {
        count: newTrackerState.getItemValue(chartForIsland),
        generalLocation,
        detailedLocation,
      });
    }

    this.updateTrackerState(newTrackerState);
    this.clearOpenedMenus();
  }

  // Unset via sector should only remove mapping.
  // Unset via chart-list should remove both mapping and decrement chart.
  unsetChartMapping(chartForIsland, decrementChart) {
    const { trackerState } = this.state;
    let newTrackerState = trackerState;

    if (decrementChart) {
      const island = LogicHelper.islandFromChartForIsland(chartForIsland);
      const chart = trackerState.getChartFromChartMapping(island);

      newTrackerState = newTrackerState
        .decrementItem(chart);
    }

    newTrackerState = newTrackerState
      .decrementItem(chartForIsland)
      .unsetChartMapping(chartForIsland);

    this.updateTrackerState(newTrackerState);
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

  toggleSyncTracker() {
    const { syncTracker } = this.state;

    this.setState({
      syncTracker: !syncTracker,
    });
  }

  toggleTrackSpheres() {
    const { trackSpheres } = this.state;

    this.updatePreferences({ trackSpheres: !trackSpheres });
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
      database,
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
      spheres,
      syncTracker,
      trackSpheres,
      trackerState,
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
          <div className="tracker">
            <ItemsTable
              backgroundColor={itemsTableBackground}
              database={database}
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
              database={database}
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
          <Buttons
            colorPickerOpen={colorPickerOpen}
            disableLogic={disableLogic}
            chartListOpen={chartListOpen}
            entrancesListOpen={entrancesListOpen}
            onlyProgressLocations={onlyProgressLocations}
            saveData={saveData}
            syncTracker={syncTracker}
            trackSpheres={trackSpheres}
            toggleChartList={this.toggleChartList}
            toggleColorPicker={this.toggleColorPicker}
            toggleDisableLogic={this.toggleDisableLogic}
            toggleEntrancesList={this.toggleEntrancesList}
            toggleOnlyProgressLocations={this.toggleOnlyProgressLocations}
            toggleSyncTracker={this.toggleSyncTracker}
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
  loadProgress: PropTypes.bool.isRequired,
  permalink: PropTypes.string.isRequired,
  gameId: PropTypes.string.isRequired,
};

export default Tracker;
