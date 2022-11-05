import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';

import LogicHelper from '../services/logic-helper';
import Spheres from '../services/spheres';

import KeyDownWrapper from './key-down-wrapper';
import Tooltip from './tooltip';

class Item extends React.PureComponent {
  item() {
    const {
      clearSelectedItem,
      decrementItem,
      images,
      incrementItem,
      itemCount,
      itemName,
      setSelectedItem,
    } = this.props;

    const itemImage = _.get(images, itemCount);
    const startingItemCount = LogicHelper.startingItemCount(itemName);
    const maxItemCount = LogicHelper.maxItemCount(itemName);

    let itemClassName = '';
    if (maxItemCount === 0) {
      itemClassName = 'impossible-item';
    } else if (startingItemCount === maxItemCount) {
      itemClassName = 'static-item';
    }

    const incrementItemFunc = (event) => {
      event.stopPropagation();

      incrementItem(itemName);
    };

    const decrementItemFunc = (event) => {
      event.preventDefault();

      decrementItem(itemName);
    };

    const setSelectedItemFunc = () => setSelectedItem(itemName);

    return (
      <div
        className={`item-container ${itemClassName}`}
        onBlur={clearSelectedItem}
        onClick={incrementItemFunc}
        onContextMenu={decrementItemFunc}
        onFocus={setSelectedItemFunc}
        onKeyDown={KeyDownWrapper.onSpaceKey(incrementItemFunc)}
        onMouseOver={setSelectedItemFunc}
        onMouseOut={clearSelectedItem}
        role="button"
        tabIndex="0"
      >
        <img
          alt={itemName}
          src={itemImage}
          draggable={false}
        />
      </div>
    );
  }

  render() {
    const { databaseLocations, locations, spheres } = this.props;

    let locationContent;
    let databaseContent;
    const existingLocation = [];

    if (!_.isEmpty(locations)) {
      const locationsList = _.map(locations, ({
        generalLocation, detailedLocation,
      }) => {
        const sphere = spheres.sphereForLocation(generalLocation, detailedLocation);
        const sphereText = _.isNil(sphere) ? '?' : sphere;
        const locationName = `${generalLocation} | ${detailedLocation}`;
        existingLocation.push(locationName);

        return (
          <li key={locationName}>
            {`[${sphereText}] ${locationName}`}
          </li>
        );
      });

      locationContent = (
        <>
          <div className="tooltip-title">Locations Found At</div>
          <ul>{locationsList}</ul>
        </>
      );
    }

    if (!_.isEmpty(databaseLocations)) {
      const databaseList = _.reduce(databaseLocations, (acc, {
        generalLocation, detailedLocation,
      }) => {
        const sphere = spheres.sphereForLocation(generalLocation, detailedLocation);
        const sphereText = _.isNil(sphere) ? '?' : sphere;
        const locationName = `${generalLocation} | ${detailedLocation}`;

        if (!existingLocation.includes(locationName)) {
          acc.push((
            <li key={locationName}>
              {`[${sphereText}] ${locationName}`}
            </li>
          ));
        }

        return acc;
      }, []);

      if (databaseList.length > 0) {
        databaseContent = (
          <>
            <div className="tooltip-title">Coop Found At</div>
            <ul>{databaseList}</ul>
          </>
        );
      }
    }

    if (locationContent || databaseContent) {
      const foundAtTooltip = (
        <div className="tooltip item-location">
          {locationContent}
          {databaseContent}
        </div>
      );
      return (
        <Tooltip tooltipContent={foundAtTooltip}>
          {this.item()}
        </Tooltip>
      );
    }

    return this.item();
  }
}

Item.defaultProps = {
  decrementItem: null,
  databaseLocations: [],
  locations: [],
  spheres: null,
};

Item.propTypes = {
  clearSelectedItem: PropTypes.func.isRequired,
  decrementItem: PropTypes.func,
  databaseLocations: PropTypes.arrayOf(PropTypes.exact({
    generalLocation: PropTypes.string.isRequired,
    detailedLocation: PropTypes.string.isRequired,
  })),
  images: PropTypes.arrayOf(PropTypes.string).isRequired,
  incrementItem: PropTypes.func.isRequired,
  itemCount: PropTypes.number.isRequired,
  itemName: PropTypes.string.isRequired,
  locations: PropTypes.arrayOf(PropTypes.exact({
    generalLocation: PropTypes.string.isRequired,
    detailedLocation: PropTypes.string.isRequired,
  })),
  setSelectedItem: PropTypes.func.isRequired,
  spheres: PropTypes.instanceOf(Spheres),
};

export default Item;
