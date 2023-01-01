import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';

import DatabaseHelper from '../services/database-helper.tsx';
import DatabaseState from '../services/database-state.ts';
import LogicCalculation from '../services/logic-calculation';
import LogicHelper from '../services/logic-helper';
import Spheres from '../services/spheres';
import TrackerState from '../services/tracker-state';

import Images from './images';
import Item from './item';
import KeyDownWrapper from './key-down-wrapper';

class Sector extends React.PureComponent {
  chestsCounter() {
    const {
      databaseState,
      disableLogic,
      hideCoopItemLocations,
      island,
      logic,
      onlyProgressLocations,
      showCoopItemSettings,
    } = this.props;

    const {
      color,
      numAvailable,
      numRemaining,
    } = logic.locationCounts(island, {
      isDungeon: false,
      onlyProgressLocations,
      disableLogic,
      databaseState,
      hideCoopItemLocations,
      showCoopItemSettings,
    });

    const className = `chests-counter ${color}`;
    const chestCounts = disableLogic ? numRemaining : `${numAvailable}/${numRemaining}`;

    return (
      <div className={className}>
        {chestCounts}
      </div>
    );
  }

  chartItem() {
    const {
      clearSelectedItem,
      databaseState,
      decrementItem,
      incrementItem,
      island,
      setSelectedItem,
      spheres,
      trackerState,
      trackSpheres,
    } = this.props;

    const {
      chartName,
      chartType,
    } = LogicHelper.chartForIsland(island);

    const chartCount = trackerState.getItemValue(chartName);

    const databaseLocations = DatabaseHelper.getLocationsForItem(
      databaseState,
      chartName,
    );

    const chartImages = _.get(Images.IMAGES, ['CHARTS', chartType]);

    let locations = [];
    if (trackSpheres) {
      locations = trackerState.getLocationsForItem(chartName);
    }

    const chartItem = trackerState.getItemForChart(chartName);
    const databaseChartItems = DatabaseHelper.getItemForLocation(
      databaseState,
      island,
      LogicHelper.SUNKEN_TREASURE_LOCATION,
    );

    const isCoopChecked = DatabaseHelper.isCoopChecked(
      databaseLocations,
      databaseState,
      locations,
      chartName,
      chartCount,
    );

    const tooltipContent = DatabaseHelper.tooltipManager({
      chartItem,
      databaseChartItems,
      databaseLocations,
      locations,
      spheres,
      trackerState,
    });

    const hasChartItem = databaseChartItems.length > 0 ? 'item' : '';

    return (
      <div className={`treasure-chart ${hasChartItem}`}>
        <Item
          clearSelectedItem={clearSelectedItem}
          decrementItem={decrementItem}
          images={chartImages}
          incrementItem={incrementItem}
          isCoopChecked={isCoopChecked}
          itemCount={chartCount}
          itemName={chartName}
          setSelectedItem={setSelectedItem}
          tooltipContent={tooltipContent}
        />
      </div>
    );
  }

  chartIsland() {
    const {
      clearSelectedChartForIsland,
      clearSelectedLocation,
      databaseState,
      island,
      setSelectedChartForIsland,
      spheres,
      trackerState,
      trackSpheres,
      updateOpenedChartForIsland,
      unsetChartMapping,
    } = this.props;

    const chartForIsland = LogicHelper.chartForIslandName(island);

    const chartCount = trackerState.getItemValue(chartForIsland);

    const chartImages = _.get(Images.IMAGES, ['CHARTS', 'Treasure']);

    const chartName = trackerState.getChartFromChartMapping(island);
    let databaseLocations = [];
    if (!_.isNil(chartName)) {
      databaseLocations = DatabaseHelper.getLocationsForItem(
        databaseState,
        chartName,
      );
    }

    let locations = [];
    if (trackSpheres) {
      locations = trackerState.getLocationsForItem(chartName);
    }

    const chartItem = trackerState.getItemForChart(chartName);
    const databaseChartItems = DatabaseHelper.getItemForLocation(
      databaseState,
      island,
      LogicHelper.SUNKEN_TREASURE_LOCATION,
    );

    const isCoopChecked = DatabaseHelper.isCoopChecked(
      databaseLocations,
      databaseState,
      locations,
      chartName,
      chartCount,
    );

    const tooltipContent = DatabaseHelper.tooltipManager({
      chartItem,
      databaseChartItems,
      databaseLocations,
      locations,
      spheres,
      trackerState,
    });

    const hasChartItem = databaseChartItems.length > 0 ? 'item' : '';

    const updateOpenedChartForIslandFunc = () => {
      if (chartCount > 0) {
        unsetChartMapping(chartForIsland, false);
      } else {
        clearSelectedChartForIsland();
        clearSelectedLocation();

        updateOpenedChartForIsland(chartForIsland);
      }
    };

    return (
      <div className={`treasure-chart ${hasChartItem}`}>
        <Item
          clearSelectedItem={clearSelectedChartForIsland}
          images={chartImages}
          incrementItem={updateOpenedChartForIslandFunc}
          isCoopChecked={isCoopChecked}
          itemCount={chartCount}
          itemName={chartForIsland}
          locations={locations}
          setSelectedItem={setSelectedChartForIsland}
          spheres={spheres}
          tooltipContent={tooltipContent}
        />
      </div>
    );
  }

  entrances() {
    if (!LogicHelper.isRandomCaveEntrances()) {
      return [];
    }

    const {
      island,
      trackerState,
    } = this.props;

    const cavesForIsland = LogicHelper.cavesForIsland(island);

    return _.map(cavesForIsland, (caveName) => {
      const entryName = LogicHelper.entryName(caveName);
      const entryCount = trackerState.getItemValue(entryName);

      return {
        entryCount,
        entryName,
        locationName: caveName,
      };
    });
  }

  entryItems() {
    const {
      clearSelectedItem,
      clearSelectedLocation,
      setSelectedExit,
      unsetExit,
      updateOpenedExit,
    } = this.props;

    const entrances = this.entrances();

    return _.map(entrances, (entrance) => {
      const {
        entryCount,
        entryName,
        locationName,
      } = entrance;

      const entranceImages = _.get(Images.IMAGES, 'CAVE_ENTRANCE');

      const setSelectedItemFunc = () => setSelectedExit(locationName);

      const incrementItemFunc = () => {
        if (entryCount > 0) {
          unsetExit(locationName);
        } else {
          clearSelectedItem();
          clearSelectedLocation();

          updateOpenedExit(locationName);
        }
      };

      return (
        <div className="cave-entry" key={entryName}>
          <Item
            clearSelectedItem={clearSelectedItem}
            images={entranceImages}
            incrementItem={incrementItemFunc}
            itemCount={entryCount}
            itemName={entryName}
            setSelectedItem={setSelectedItemFunc}
          />
        </div>
      );
    });
  }

  render() {
    const {
      clearSelectedLocation,
      island,
      setSelectedLocation,
      updateOpenedLocation,
    } = this.props;

    const updateOpenedLocationFunc = () => {
      clearSelectedLocation();

      updateOpenedLocation({
        isDungeon: false,
        locationName: island,
      });
    };

    const setSelectedLocationFunc = () => setSelectedLocation({
      isDungeon: false,
      locationName: island,
    });

    return (
      <div
        className="sea-sector"
        onBlur={clearSelectedLocation}
        onClick={updateOpenedLocationFunc}
        onFocus={setSelectedLocationFunc}
        onKeyDown={KeyDownWrapper.onSpaceKey(updateOpenedLocationFunc)}
        onMouseOver={setSelectedLocationFunc}
        onMouseOut={clearSelectedLocation}
        role="button"
        tabIndex="0"
      >
        {LogicHelper.isRandomizedChartsSettings() ? this.chartIsland() : this.chartItem()}
        {this.entryItems()}
        {this.chestsCounter()}
      </div>
    );
  }
}

Sector.propTypes = {
  clearSelectedChartForIsland: PropTypes.func.isRequired,
  clearSelectedItem: PropTypes.func.isRequired,
  clearSelectedLocation: PropTypes.func.isRequired,
  databaseState: PropTypes.instanceOf(DatabaseState).isRequired,
  decrementItem: PropTypes.func.isRequired,
  disableLogic: PropTypes.bool.isRequired,
  incrementItem: PropTypes.func.isRequired,
  island: PropTypes.string.isRequired,
  logic: PropTypes.instanceOf(LogicCalculation).isRequired,
  onlyProgressLocations: PropTypes.bool.isRequired,
  setSelectedChartForIsland: PropTypes.func.isRequired,
  setSelectedExit: PropTypes.func.isRequired,
  setSelectedItem: PropTypes.func.isRequired,
  setSelectedLocation: PropTypes.func.isRequired,
  showCoopItemSettings: PropTypes.shape({
    charts: PropTypes.bool.isRequired,
  }).isRequired,
  hideCoopItemLocations: PropTypes.bool.isRequired,
  spheres: PropTypes.instanceOf(Spheres).isRequired,
  trackerState: PropTypes.instanceOf(TrackerState).isRequired,
  trackSpheres: PropTypes.bool.isRequired,
  unsetChartMapping: PropTypes.func.isRequired,
  unsetExit: PropTypes.func.isRequired,
  updateOpenedChartForIsland: PropTypes.func.isRequired,
  updateOpenedExit: PropTypes.func.isRequired,
  updateOpenedLocation: PropTypes.func.isRequired,
};

export default Sector;
