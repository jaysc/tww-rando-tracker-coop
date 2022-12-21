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

class ExtraLocation extends React.PureComponent {
  compassItem() {
    const {
      clearSelectedItem,
      decrementItem,
      incrementItem,
      locationName,
      setSelectedItem,
      spheres,
      trackerState,
      trackSpheres,
    } = this.props;

    const compassName = LogicHelper.compassName(locationName);
    const compassCount = trackerState.getItemValue(compassName);

    const compassImages = _.get(Images.IMAGES, 'COMPASSES');

    let locations = [];
    if (trackSpheres) {
      locations = trackerState.getLocationsForItem(compassName);
    }

    return (
      <div className="dungeon-item compass">
        <Item
          clearSelectedItem={clearSelectedItem}
          decrementItem={decrementItem}
          images={compassImages}
          incrementItem={incrementItem}
          itemCount={compassCount}
          itemName={compassName}
          locations={locations}
          setSelectedItem={setSelectedItem}
          spheres={spheres}
        />
      </div>
    );
  }

  dungeonMapItem() {
    const {
      clearSelectedItem,
      decrementItem,
      incrementItem,
      locationName,
      setSelectedItem,
      spheres,
      trackerState,
      trackSpheres,
    } = this.props;

    const dungeonMapName = LogicHelper.dungeonMapName(locationName);
    const dungeonMapCount = trackerState.getItemValue(dungeonMapName);

    const dungeonMapImages = _.get(Images.IMAGES, 'DUNGEON_MAPS');

    let locations = [];
    if (trackSpheres) {
      locations = trackerState.getLocationsForItem(dungeonMapName);
    }

    return (
      <div className="dungeon-item dungeon-map">
        <Item
          clearSelectedItem={clearSelectedItem}
          decrementItem={decrementItem}
          images={dungeonMapImages}
          incrementItem={incrementItem}
          itemCount={dungeonMapCount}
          itemName={dungeonMapName}
          locations={locations}
          setSelectedItem={setSelectedItem}
          spheres={spheres}
        />
      </div>
    );
  }

  smallKeyItem() {
    const {
      clearSelectedItem,
      databaseState,
      decrementItem,
      incrementItem,
      locationName,
      setSelectedItem,
      spheres,
      trackerState,
      trackSpheres,
    } = this.props;

    const smallKeyName = LogicHelper.smallKeyName(locationName);
    const smallKeyCount = trackerState.getItemValue(smallKeyName);

    const smallKeyImages = _.get(Images.IMAGES, 'SMALL_KEYS');

    const databaseLocations = DatabaseHelper.getLocationsForItem(
      databaseState,
      smallKeyName,
    );

    let locations = [];
    if (trackSpheres) {
      locations = trackerState.getLocationsForItem(smallKeyName);
    }

    const tooltipContent = DatabaseHelper.tooltipManager({
      databaseLocations,
      locations,
      spheres,
    });

    const isCoopChecked = DatabaseHelper.isCoopChecked(
      databaseLocations,
      databaseState,
      locations,
      smallKeyName,
      smallKeyCount,
    );

    return (
      <div className="dungeon-item small-key">
        <Item
          clearSelectedItem={clearSelectedItem}
          decrementItem={decrementItem}
          images={smallKeyImages}
          incrementItem={incrementItem}
          isCoopChecked={isCoopChecked}
          itemCount={smallKeyCount}
          itemName={smallKeyName}
          tooltipContent={tooltipContent}
          setSelectedItem={setSelectedItem}
        />
      </div>
    );
  }

  bigKeyItem() {
    const {
      clearSelectedItem,
      databaseState,
      decrementItem,
      incrementItem,
      locationName,
      setSelectedItem,
      spheres,
      trackerState,
      trackSpheres,
    } = this.props;

    const bigKeyName = LogicHelper.bigKeyName(locationName);
    const bigKeyCount = trackerState.getItemValue(bigKeyName);

    const databaseLocations = DatabaseHelper.getLocationsForItem(
      databaseState,
      bigKeyName,
    );

    const bigKeyImages = _.get(Images.IMAGES, 'BIG_KEYS');

    let locations = [];
    if (trackSpheres) {
      locations = trackerState.getLocationsForItem(bigKeyName);
    }

    const tooltipContent = DatabaseHelper.tooltipManager({
      databaseLocations,
      locations,
      spheres,
    });

    const isCoopChecked = DatabaseHelper.isCoopChecked(
      databaseLocations,
      databaseState,
      locations,
      bigKeyName,
      bigKeyCount,
    );

    return (
      <div className="dungeon-item big-key">
        <Item
          clearSelectedItem={clearSelectedItem}
          decrementItem={decrementItem}
          images={bigKeyImages}
          incrementItem={incrementItem}
          isCoopChecked={isCoopChecked}
          itemCount={bigKeyCount}
          itemName={bigKeyName}
          setSelectedItem={setSelectedItem}
          tooltipContent={tooltipContent}
        />
      </div>
    );
  }

  entrance() {
    const {
      clearSelectedItem,
      locationName,
      setSelectedExit,
      trackerState,
      unsetExit,
      updateOpenedExit,
    } = this.props;

    const entryName = LogicHelper.entryName(locationName);
    const entryCount = trackerState.getItemValue(entryName);

    const entranceImages = _.get(Images.IMAGES, 'DUNGEON_ENTRANCE');

    const setSelectedItemFunc = () => setSelectedExit(locationName);

    const incrementItemFunc = () => {
      if (entryCount > 0) {
        unsetExit(locationName);
      } else {
        updateOpenedExit(locationName);
      }
    };

    return (
      <div className="dungeon-item dungeon-entry">
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
  }

  dungeonItems() {
    const { locationName } = this.props;

    const isMainDungeon = LogicHelper.isMainDungeon(locationName);
    const isRaceModeDungeon = LogicHelper.isRaceModeDungeon(locationName);

    return (
      <div className="dungeon-items">
        { isMainDungeon && (
          <>
            {this.smallKeyItem()}
            { LogicHelper.isRandomDungeonEntrances() && this.entrance() }
            {this.bigKeyItem()}
          </>
        )}
        { isRaceModeDungeon && (
          <>
            {this.dungeonMapItem()}
            {this.compassItem()}
          </>
        )}
      </div>
    );
  }

  locationIcon() {
    const {
      isDungeon,
      locationName,
      logic,
    } = this.props;

    let locationIcon;
    if (isDungeon) {
      const isBossDefeated = logic.isBossDefeated(locationName);

      locationIcon = _.get(Images.IMAGES, ['DUNGEONS', locationName, isBossDefeated]);
    } else {
      locationIcon = _.get(Images.IMAGES, ['MISC_LOCATIONS', locationName]);
    }

    return (
      <div className="dungeon-icon">
        <img src={locationIcon} alt={locationName} draggable={false} />
      </div>
    );
  }

  chestsCounter() {
    const {
      databaseState,
      disableLogic,
      hideCoopItemLocations,
      isDungeon,
      locationName,
      logic,
      onlyProgressLocations,
      showCoopItemSettings,
    } = this.props;

    const {
      color,
      numAvailable,
      numRemaining,
    } = logic.locationCounts(locationName, {
      isDungeon,
      onlyProgressLocations,
      disableLogic,
      databaseState,
      hideCoopItemLocations,
      showCoopItemSettings,
    });

    const className = `extra-location-chests ${color}`;
    const chestCounts = disableLogic ? numRemaining : `${numAvailable}/${numRemaining}`;

    return (
      <div className={className}>
        {chestCounts}
      </div>
    );
  }

  render() {
    const {
      clearSelectedLocation,
      isDungeon,
      locationName,
      setSelectedLocation,
      updateOpenedLocation,
    } = this.props;

    const updateOpenedLocationFunc = () => updateOpenedLocation({
      isDungeon,
      locationName,
    });

    const setSelectedLocationFunc = () => setSelectedLocation({
      isDungeon,
      locationName,
    });

    return (
      <div
        className="extra-location"
        onBlur={clearSelectedLocation}
        onClick={updateOpenedLocationFunc}
        onFocus={setSelectedLocationFunc}
        onKeyDown={KeyDownWrapper.onSpaceKey(updateOpenedLocationFunc)}
        onMouseOver={setSelectedLocationFunc}
        onMouseOut={clearSelectedLocation}
        role="button"
        tabIndex="0"
      >
        {this.dungeonItems()}
        {this.locationIcon()}
        {this.chestsCounter()}
      </div>
    );
  }
}

ExtraLocation.propTypes = {
  clearSelectedItem: PropTypes.func.isRequired,
  clearSelectedLocation: PropTypes.func.isRequired,
  databaseState: PropTypes.instanceOf(DatabaseState).isRequired,
  decrementItem: PropTypes.func.isRequired,
  disableLogic: PropTypes.bool.isRequired,
  hideCoopItemLocations: PropTypes.bool.isRequired,
  incrementItem: PropTypes.func.isRequired,
  isDungeon: PropTypes.bool.isRequired,
  locationName: PropTypes.string.isRequired,
  logic: PropTypes.instanceOf(LogicCalculation).isRequired,
  onlyProgressLocations: PropTypes.bool.isRequired,
  setSelectedExit: PropTypes.func.isRequired,
  setSelectedItem: PropTypes.func.isRequired,
  setSelectedLocation: PropTypes.func.isRequired,
  showCoopItemSettings: PropTypes.shape({
    charts: PropTypes.bool.isRequired,
  }).isRequired,
  spheres: PropTypes.instanceOf(Spheres).isRequired,
  trackerState: PropTypes.instanceOf(TrackerState).isRequired,
  trackSpheres: PropTypes.bool.isRequired,
  unsetExit: PropTypes.func.isRequired,
  updateOpenedExit: PropTypes.func.isRequired,
  updateOpenedLocation: PropTypes.func.isRequired,
};

export default ExtraLocation;
