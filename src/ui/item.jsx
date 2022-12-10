import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';

import DatabaseHelper from '../services/database-helper.tsx';
import LogicHelper from '../services/logic-helper';
import Spheres from '../services/spheres';

import KeyDownWrapper from './key-down-wrapper';
import Tooltip from './tooltip';

class Item extends React.PureComponent {
  item({ databaseContent } = {}) {
    const {
      clearSelectedItem,
      databaseMaxCount,
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
    const hasCoopLocation = itemCount !== maxItemCount
      && (!_.isNil(databaseContent) || databaseMaxCount > itemCount);
    return (
      <div
        className={`item-container ${hasCoopLocation ? 'coop-item' : ''} ${itemClassName}`}
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
    const { locations, databaseLocations, spheres } = this.props;

    const { databaseLocationContent, tooltipContent } = DatabaseHelper.tooltipManager({
      databaseLocations,
      locations,
      spheres,
    });

    return (
      <Tooltip tooltipContent={tooltipContent}>
        {this.item({ databaseLocationContent })}
      </Tooltip>
    );
  }
}

Item.defaultProps = {
  databaseLocations: [],
  databaseMaxCount: 0,
  decrementItem: null,
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
  databaseMaxCount: PropTypes.number,
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
