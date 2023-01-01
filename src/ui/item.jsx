import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';

import LogicHelper from '../services/logic-helper';

import ContextMenuWrapper from './context-menu-wrapper';
import KeyDownWrapper from './key-down-wrapper';
import Tooltip from './tooltip';

class Item extends React.PureComponent {
  item() {
    const {
      clearSelectedItem,
      decrementItem,
      images,
      incrementItem,
      isCoopChecked,
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
    const hasCoopLocation = isCoopChecked ? 'coop-item' : '';
    return (
      <div
        className={`item-container ${hasCoopLocation} ${itemClassName}`}
        onBlur={clearSelectedItem}
        onClick={incrementItemFunc}
        onContextMenu={ContextMenuWrapper.onRightClick(decrementItemFunc)}
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
    const { tooltipContent } = this.props;

    return (
      <Tooltip tooltipContent={tooltipContent}>
        {this.item()}
      </Tooltip>
    );
  }
}

Item.defaultProps = {
  decrementItem: null,
  isCoopChecked: false,
  tooltipContent: null,
};

Item.propTypes = {
  clearSelectedItem: PropTypes.func.isRequired,
  decrementItem: PropTypes.func,
  images: PropTypes.arrayOf(PropTypes.string).isRequired,
  incrementItem: PropTypes.func.isRequired,
  isCoopChecked: PropTypes.bool,
  itemCount: PropTypes.number.isRequired,
  itemName: PropTypes.string.isRequired,
  setSelectedItem: PropTypes.func.isRequired,
  tooltipContent: PropTypes.element,
};

export default Item;
