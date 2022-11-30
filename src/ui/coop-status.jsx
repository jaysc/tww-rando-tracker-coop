import _ from 'lodash';
import PropTypes from 'prop-types';
import React from 'react';

import DatabaseLogic from '../services/database-logic.ts';

import Tooltip from './tooltip';

class CoopStatus extends React.PureComponent {
  render() {
    const { databaseStats } = this.props;
    return (
      <div className="coop-status-box">
        <div className="coop-status">
          Server status:&nbsp;
          {databaseStats.connected ? <div className="connected">Connected</div>
            : <div className="disconnected">Disconnected </div>}
        </div>
        <div className="coop-status">
          Username:&nbsp;
          <input
            type="text"
            key={Math.random()}
            onBlur={this.databaseUpdateUsername}
            defaultValue={_.get(databaseStats.users, DatabaseLogic.userId, '')}
          />
        </div>
        <div className="coop-status">
          Number of users:&nbsp;
          <div className="connected">
            <Tooltip tooltipContent={_.size(databaseStats.users) > 0
              ? (
                <div className="tooltip">
                  <div className="tooltip-title">Connected players</div>
                  <ul>
                    {_.map(
                      databaseStats.users,
                      (name, userId) => <li key={userId}>{name}</li>,
                    )}
                  </ul>
                </div>

              )
              : null}
            >
              <>{_.size(databaseStats.users)}</>
            </Tooltip>

          </div>
        </div>
        <div className="coop-status">
          Mode:&nbsp;
          <div className="connected">
            {DatabaseLogic.mode}
          </div>
        </div>
      </div>
    );
  }
}

CoopStatus.propTypes = {
  databaseStats: PropTypes.shape({
    connected: PropTypes.bool.isRequired,
    users: PropTypes.objectOf(PropTypes.string),
  }).isRequired,
};

export default CoopStatus;
