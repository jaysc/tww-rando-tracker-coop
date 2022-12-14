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
import KeyDownWrapper from './key-down-wrapper';
import MapTable from './map-table';
import Tooltip from './tooltip';

class ChartList extends React.PureComponent {
  static NUM_ROWS = 20;

  mapChart(chart) {
    const {
      openedChartForIsland,
      trackerState,
      updateChartMapping,
    } = this.props;

    if (_.isNil(chart)) {
      return null;
    }

    const itemCount = trackerState.getItemValue(chart);

    const mappedIslandForChart = trackerState.getIslandFromChartMapping(chart);
    const isChartMapped = !_.isNil(mappedIslandForChart);

    const notInteractiveClassName = isChartMapped ? 'detail-not-interactive' : '';

    let color;
    if (isChartMapped) {
      color = LogicCalculation.LOCATION_COLORS.CHECKED_LOCATION;
    } else if (itemCount === 1) {
      color = LogicCalculation.LOCATION_COLORS.AVAILABLE_LOCATION;
    } else {
      color = LogicCalculation.LOCATION_COLORS.UNAVAILABLE_LOCATION;
    }

    const updateChartMappingFunc = (event) => {
      event.stopPropagation();

      if (!isChartMapped) {
        updateChartMapping(chart, openedChartForIsland);
      }
    };

    const chartElement = (
      <div
        className={`detail-span ${notInteractiveClassName} ${color} font-smallest`}
        onClick={updateChartMappingFunc}
        onKeyDown={KeyDownWrapper.onSpaceKey(updateChartMappingFunc)}
        role="button"
        tabIndex="0"
      >
        {chart}
      </div>
    );

    let chartContent;
    if (isChartMapped) {
      const tooltip = (
        <div className="tooltip">
          <div className="tooltip-title">Chart Leads To</div>
          <div>{mappedIslandForChart}</div>
        </div>
      );

      chartContent = (
        <Tooltip tooltipContent={tooltip}>
          {chartElement}
        </Tooltip>
      );
    } else {
      chartContent = chartElement;
    }

    return <td key={chart}>{chartContent}</td>;
  }

  chart(chartName, showLocationTooltip = true) {
    if (_.isNil(chartName)) {
      return null;
    }

    const {
      databaseState,
      incrementItem,
      spheres,
      trackerState,
      trackSpheres,
      unsetChartMapping,
    } = this.props;

    const itemCount = trackerState.getItemValue(chartName);
    const mappedIslandForChart = (
      LogicHelper.isRandomizedChartsSettings()
        ? trackerState.getIslandFromChartMapping(chartName)
        : LogicHelper.islandForChart(chartName)
    );
    const isChartMapped = !_.isNil(mappedIslandForChart);

    const databaseMaxCount = DatabaseHelper.getMaxCount(databaseState, chartName);
    const databaseLocations = DatabaseHelper.getLocationsForItem(
      databaseState,
      chartName,
    );

    const chartItem = trackerState.getItemForChart(chartName);
    const databaseChartItems = DatabaseHelper.getItemForLocation(
      databaseState,
      mappedIslandForChart,
      LogicHelper.SUNKEN_TREASURE_LOCATION,
    );

    let color;
    if (itemCount === 1) {
      color = LogicCalculation.LOCATION_COLORS.CHECKED_LOCATION;
    } else if (databaseMaxCount !== itemCount || databaseLocations.length > 0) {
      color = LogicCalculation.LOCATION_COLORS.COOP_CHECKED_LOCATION;
    } else {
      color = LogicCalculation.LOCATION_COLORS.AVAILABLE_LOCATION;
    }

    let locations = [];
    if (showLocationTooltip && trackSpheres) {
      locations = trackerState.getLocationsForItem(chartName);
    }

    const incrementItemFunc = (event) => {
      event.stopPropagation();

      incrementItem(chartName);

      if (LogicHelper.isRandomizedChartsSettings()) {
        if (isChartMapped) {
          unsetChartMapping(LogicHelper.chartForIslandName(mappedIslandForChart), true);
        }
      }
    };

    const chartElement = (
      <div
        className={`detail-span ${color} font-smallest`}
        onClick={incrementItemFunc}
        onKeyDown={KeyDownWrapper.onSpaceKey(incrementItemFunc)}
        role="button"
        tabIndex="0"
      >
        {chartName}
      </div>
    );

    const tooltipContent = DatabaseHelper.tooltipManager({
      chartItem,
      databaseChartItems,
      databaseLocations,
      mappedIslandForChart,
      locations,
      spheres,
      trackerState,
    });

    return (
      <td key={chartName}>
        <Tooltip tooltipContent={tooltipContent}>{chartElement}</Tooltip>
      </td>
    );
  }

  render() {
    const { clearOpenedMenus, openedChartForIsland } = this.props;

    const chartChunks = _.chunk([
      ...LogicHelper.ALL_TREASURE_CHARTS,
      ...LogicHelper.ALL_TRIFORCE_CHARTS,
    ], ChartList.NUM_ROWS);
    const arrangedCharts = _.zip(...chartChunks);

    const chartType = (chart) => (openedChartForIsland ? this.mapChart(chart) : this.chart(chart));

    const chartRows = _.map(arrangedCharts, (chartsRow, index) => (
      <tr key={index}>
        {_.map(chartsRow, (chart) => chartType(chart))}
      </tr>
    ));

    return (
      <MapTable
        backgroundImage={Images.IMAGES.EMPTY_BACKGROUND}
        closeFunc={clearOpenedMenus}
        headerCellsBeforeClose={openedChartForIsland && (
          <td>
            <div className="detail-span detail-not-interactive">
              Choose Chart
            </div>
          </td>
        )}
        tableRows={chartRows}
      />
    );
  }
}

ChartList.defaultProps = {
  openedChartForIsland: null,
};

ChartList.propTypes = {
  clearOpenedMenus: PropTypes.func.isRequired,
  databaseState: PropTypes.instanceOf(DatabaseState).isRequired,
  incrementItem: PropTypes.func.isRequired,
  openedChartForIsland: PropTypes.string,
  spheres: PropTypes.instanceOf(Spheres).isRequired,
  trackerState: PropTypes.instanceOf(TrackerState).isRequired,
  trackSpheres: PropTypes.bool.isRequired,
  updateChartMapping: PropTypes.func.isRequired,
  unsetChartMapping: PropTypes.func.isRequired,
};

export default ChartList;
