import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';

import DatabaseHelper from '../services/database-helper.ts';
import DatabaseState from '../services/database-state.ts';
import LogicCalculation from '../services/logic-calculation';
import LogicHelper from '../services/logic-helper';
import Permalink from '../services/permalink';
import Settings from '../services/settings';
import Spheres from '../services/spheres';
import TrackerState from '../services/tracker-state';

import Images from './images';
import KeyDownWrapper from './key-down-wrapper';
import MapTable from './map-table';
import Tooltip from './tooltip';

class DetailedLocationsTable extends React.PureComponent {
  static NUM_ROWS = 13;

  itemTooltip({
    disableLogic,
    isLocationChecked,
    generalLocation,
    detailedLocation,
    databaseItems,
  }) {
    const { logic, trackerState } = this.props;

    const itemForLocation = trackerState.getItemForLocation(generalLocation, detailedLocation);

    let requirementsContent;
    let itemForLocationContent;
    let databaseItemForLocationContent;
    let prettyItemName;

    if (!disableLogic && !isLocationChecked) {
      const requirements = logic.formattedRequirementsForLocation(
        generalLocation,
        detailedLocation,
      );

      const requirementsList = _.map(requirements, (elements, rowIndex) => (
        <li key={rowIndex}>
          {
            _.map(elements, ({ color, text }, elementIndex) => (
              <span className={color} key={elementIndex}>{text}</span>
            ))
          }
        </li>
      ));

      requirementsContent = (
        <>
          <div className="tooltip-title">Items Required</div>
          <ul>
            {requirementsList}
          </ul>
        </>
      );
    }

    if (!_.isNil(itemForLocation)) {
      prettyItemName = LogicHelper.prettyNameForItem(itemForLocation, null);

      let chartLeadsTo;
      if (LogicHelper.isRandomizedChart(itemForLocation)) {
        const mappedIslandForChart = trackerState.getIslandFromChartMapping(itemForLocation);
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

    if (!_.isNil(databaseItems)) {
      const databaseItemContent = [];
      _.forEach(databaseItems, (itemName) => {
        const databasePrettyItemName = LogicHelper.prettyNameForItem(itemName, null);
        if (prettyItemName !== databasePrettyItemName) {
          let chartLeadsTo;
          if (LogicHelper.isRandomizedChart(itemName)) {
            const mappedIslandForChart = trackerState.getIslandFromChartMapping(itemName);
            chartLeadsTo = !_.isNil(mappedIslandForChart) ? (
              <>
                <div className="tooltip-title">Chart Leads To</div>
                <div>{mappedIslandForChart}</div>
              </>
            ) : null;
          }

          databaseItemContent.push((
            <div key={itemName}>
              <div>{databasePrettyItemName}</div>
              {chartLeadsTo}
            </div>));
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

    if (!itemForLocationContent && !databaseItemForLocationContent && !requirementsContent) {
      return null;
    }

    return (
      <div className="tooltip">
        {requirementsContent}
        {itemForLocationContent}
        {databaseItemForLocationContent}
      </div>
    );
  }

  detailedLocation(locationInfo, numColumns) {
    if (_.isNil(locationInfo)) {
      return null;
    }

    const {
      location,
      color,
    } = locationInfo;

    const {
      databaseState,
      disableLogic,
      openedLocation,
      spheres,
      trackSpheres,
      toggleLocationChecked,
    } = this.props;

    let fontSizeClassName = '';
    if (numColumns === 3) {
      fontSizeClassName = 'font-smallest';
    } else if (numColumns === 2) {
      fontSizeClassName = 'font-small';
    }

    let locationText;
    if (trackSpheres) {
      const sphere = spheres.sphereForLocation(openedLocation, location);
      const sphereText = _.isNil(sphere) ? '?' : sphere;

      locationText = `[${sphereText}] ${location}`;
    } else {
      locationText = location;
    }

    const databaseItems = DatabaseHelper.getItemForLocation(
      databaseState,
      openedLocation,
      location,
    );

    const toggleLocationFunc = () => toggleLocationChecked(openedLocation, location, databaseItems);

    const isLocationChecked = color === LogicCalculation.LOCATION_COLORS.CHECKED_LOCATION;

    const locationElement = (
      <div
        className={`detail-span ${color} ${fontSizeClassName}`}
        onClick={toggleLocationFunc}
        onKeyDown={KeyDownWrapper.onSpaceKey(toggleLocationFunc)}
        role="button"
        tabIndex="0"
      >
        {locationText}
      </div>
    );

    let itemTooltip = null;
    if (trackSpheres) {
      itemTooltip = this.itemTooltip({
        disableLogic,
        isLocationChecked,
        generalLocation: openedLocation,
        detailedLocation: location,
        databaseItems,
      });
    }

    const locationContent = (
      <Tooltip tooltipContent={itemTooltip}>
        {locationElement}
      </Tooltip>
    );

    return (
      <td key={location}>
        {locationContent}
      </td>
    );
  }

  render() {
    const {
      clearOpenedMenus,
      clearRaceModeBannedLocations,
      databaseState,
      disableLogic,
      logic,
      onlyProgressLocations,
      openedLocation,
      openedLocationIsDungeon,
    } = this.props;

    const backgroundImage = _.get(Images.IMAGES, [
      openedLocationIsDungeon ? 'DUNGEON_CHART_BACKGROUNDS' : 'ISLAND_CHART_BACKGROUNDS',
      openedLocation,
    ]);

    const detailedLocations = logic.locationsList(
      openedLocation,
      {
        databaseState,
        disableLogic,
        isDungeon: openedLocationIsDungeon,
        onlyProgressLocations,
      },
    );

    const locationChunks = _.chunk(detailedLocations, DetailedLocationsTable.NUM_ROWS);
    const arrangedLocations = _.zip(...locationChunks);
    const numColumns = _.size(locationChunks);

    const locationRows = _.map(arrangedLocations, (locationsRow, index) => (
      <tr key={index}>
        {_.map(locationsRow, (locationInfo) => this.detailedLocation(locationInfo, numColumns))}
      </tr>
    ));

    let clearAllElement;
    if (
      Settings.getOptionValue(Permalink.OPTIONS.RACE_MODE)
      && openedLocationIsDungeon
      && LogicHelper.isRaceModeDungeon(openedLocation)
    ) {
      const clearRaceModeBannedLocationsFunc = () => clearRaceModeBannedLocations(openedLocation);

      clearAllElement = (
        <td>
          <div
            className="detail-span"
            onClick={clearRaceModeBannedLocationsFunc}
            onKeyDown={KeyDownWrapper.onSpaceKey(clearRaceModeBannedLocationsFunc)}
            role="button"
            tabIndex="0"
          >
            ✓ Clear All
          </div>
        </td>
      );
    }

    return (
      <MapTable
        backgroundImage={backgroundImage}
        closeFunc={clearOpenedMenus}
        headerCellsAfterClose={clearAllElement}
        tableRows={locationRows}
      />
    );
  }
}

DetailedLocationsTable.propTypes = {
  clearOpenedMenus: PropTypes.func.isRequired,
  clearRaceModeBannedLocations: PropTypes.func.isRequired,
  databaseState: PropTypes.instanceOf(DatabaseState).isRequired,
  disableLogic: PropTypes.bool.isRequired,
  logic: PropTypes.instanceOf(LogicCalculation).isRequired,
  onlyProgressLocations: PropTypes.bool.isRequired,
  openedLocation: PropTypes.string.isRequired,
  openedLocationIsDungeon: PropTypes.bool.isRequired,
  spheres: PropTypes.instanceOf(Spheres).isRequired,
  trackerState: PropTypes.instanceOf(TrackerState).isRequired,
  trackSpheres: PropTypes.bool.isRequired,
  toggleLocationChecked: PropTypes.func.isRequired,
};

export default DetailedLocationsTable;
