import _ from 'lodash';
import React from 'react';
import { ToastContainer, toast } from 'react-toastify';

import HEADER_IMAGE from '../images/header.png';
import Permalink from '../services/permalink';

import DropdownOptionInput from './dropdown-option-input';
import OptionsTable from './options-table';
import Storage from './storage';
import ToggleOptionInput from './toggle-option-input';

import 'react-toastify/dist/ReactToastify.css';
import 'react-toggle/style.css';

export default class Launcher extends React.PureComponent {
  static openTrackerWindow(route) {
    const windowWidth = 1507;
    const windowHeight = 585;

    window.open(
      `#/tracker${route}`,
      '_blank',
      `width=${windowWidth},height=${windowHeight},titlebar=0,menubar=0,toolbar=0`,
    );
  }

  static introductionContainer() {
    return (
      <div className="introduction">
        <div className="content">
          <div className="title">
            TWW Randomizer Tracker Online
          </div>
          <div className="text">
            A Tracker used to play coop.
            <br />
            You can find the standard version of the tracker
            {' '}
            <a href="https://www.wooferzfg.me/tww-rando-tracker/">here</a>
            .
          </div>
          <div className="heading">
            How to use
          </div>
          <div className="text">
            Ensure all players are using the same permalink.
            <br />
            &quot;Room Name&quot; is used to place all users within the same room.
            If a name already exists with the same permalink
            , you will be placed in the existing room.
          </div>
          <div className="heading">
            Modes
          </div>
          <div className="text">
            The mode is set when creating the room. If you want to change the mode
            , you must create a new room.
            <br />
            There are two different types of modes.
            <ul>
              <li>
                &quot;Itemsync&quot;
                <ul>
                  <li>All tracker items, and locations are synced between all clients</li>
                </ul>
              </li>
              <li>
                &quot;Coop&quot;
                <ul>
                  <li>Status of tracker is shared to all players.</li>
                  <li>
                    Only chart mapping (randomised charts)
                    and entrance mapping (randomised entrances) are synced.
                  </li>
                </ul>
              </li>
            </ul>
          </div>
          <div className="heading">
            Notes
          </div>
          <div className="text">
            <ul>
              <li>
                Yellow Location (Coop mode)
                <ul>
                  <li>Yellow locations means the location contains a progressive item.</li>
                </ul>
              </li>
              <li>
                Automatic (Location - Item) selection
                <ul>
                  <li>
                    When a location has tracked exactly one coop item
                    , when other players mark the same location they will
                    automatically gain the tracked item.
                  </li>
                </ul>
              </li>
              <li>
                Room lifetime
                <ul>
                  <li>All rooms have a lifetime of 30 minutes based on the last action taken.</li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  constructor() {
    super();

    const permalink = Permalink.DEFAULT_PERMALINK;
    const options = Permalink.decode(permalink);

    this.state = {
      options,
      permalink,
      gameId: '',
    };

    this.launchNewTracker = this.launchNewTracker.bind(this);
    this.loadFromFile = this.loadFromFile.bind(this);
    this.loadFromSave = this.loadFromSave.bind(this);
    this.setOptionValue = this.setOptionValue.bind(this);
    this.launchOnline = this.launchOnline.bind(this);
    this.loadFromFileLaunchOnline = this.loadFromFileLaunchOnline.bind(this);
  }

  getOptionValue(optionName) {
    const { options } = this.state;

    return _.get(options, optionName);
  }

  setOptionValue(optionName, newValue) {
    const { options } = this.state;

    _.set(options, optionName, newValue);

    this.updateOptions(options);
  }

  loadPermalink(permalinkInput) {
    try {
      const options = Permalink.decode(permalinkInput);

      this.updateOptions(options);
    } catch (err) {
      toast.error('Invalid permalink!');
    }
  }

  updateOptions(options) {
    const permalink = Permalink.encode(options);

    this.setState({
      options,
      permalink,
    });
  }

  toggleInput({ labelText, optionName }) {
    const optionValue = this.getOptionValue(optionName);

    return (
      <ToggleOptionInput
        key={optionName}
        labelText={labelText}
        optionName={optionName}
        optionValue={optionValue}
        setOptionValue={this.setOptionValue}
      />
    );
  }

  dropdownInput({ labelText, optionName }) {
    const optionValue = this.getOptionValue(optionName);

    return (
      <DropdownOptionInput
        key={optionName}
        labelText={labelText}
        optionName={optionName}
        optionValue={optionValue}
        setOptionValue={this.setOptionValue}
      />
    );
  }

  permalinkContainer() {
    const { permalink } = this.state;

    return (
      <div className="permalink-container">
        <div className="permalink-label">Permalink:</div>
        <div className="permalink-input">
          <input
            placeholder="Permalink"
            className="permalink"
            onChange={(event) => this.loadPermalink(event.target.value)}
            value={permalink}
          />
        </div>
      </div>
    );
  }

  progressItemLocationsTable() {
    return (
      <OptionsTable
        title="Progress Item Locations"
        numColumns={3}
        options={[
          this.toggleInput({
            labelText: 'Dungeons',
            optionName: Permalink.OPTIONS.PROGRESSION_DUNGEONS,
          }),
          this.toggleInput({
            labelText: 'Tingle Chests',
            optionName: Permalink.OPTIONS.PROGRESSION_TINGLE_CHESTS,
          }),
          this.toggleInput({
            labelText: 'Mail',
            optionName: Permalink.OPTIONS.PROGRESSION_MAIL,
          }),
          this.toggleInput({
            labelText: 'Puzzle Secret Caves',
            optionName: Permalink.OPTIONS.PROGRESSION_PUZZLE_SECRET_CAVES,
          }),
          this.toggleInput({
            labelText: 'Combat Secret Caves',
            optionName: Permalink.OPTIONS.PROGRESSION_COMBAT_SECRET_CAVES,
          }),
          this.toggleInput({
            labelText: 'Savage Labyrinth',
            optionName: Permalink.OPTIONS.PROGRESSION_SAVAGE_LABYRINTH,
          }),
          this.toggleInput({
            labelText: 'Short Sidequests',
            optionName: Permalink.OPTIONS.PROGRESSION_SHORT_SIDEQUESTS,
          }),
          this.toggleInput({
            labelText: 'Long Sidequests',
            optionName: Permalink.OPTIONS.PROGRESSION_LONG_SIDEQUESTS,
          }),
          this.toggleInput({
            labelText: 'Spoils Trading',
            optionName: Permalink.OPTIONS.PROGRESSION_SPOILS_TRADING,
          }),
          this.toggleInput({
            labelText: 'Great Fairies',
            optionName: Permalink.OPTIONS.PROGRESSION_GREAT_FAIRIES,
          }),
          this.toggleInput({
            labelText: 'Free Gifts',
            optionName: Permalink.OPTIONS.PROGRESSION_FREE_GIFTS,
          }),
          this.toggleInput({
            labelText: 'Miscellaneous',
            optionName: Permalink.OPTIONS.PROGRESSION_MISC,
          }),
          this.toggleInput({
            labelText: 'Minigames',
            optionName: Permalink.OPTIONS.PROGRESSION_MINIGAMES,
          }),
          this.toggleInput({
            labelText: 'Battlesquid Minigame',
            optionName: Permalink.OPTIONS.PROGRESSION_BATTLESQUID,
          }),
          this.toggleInput({
            labelText: 'Expensive Purchases',
            optionName: Permalink.OPTIONS.PROGRESSION_EXPENSIVE_PURCHASES,
          }),
          this.toggleInput({
            labelText: 'Island Puzzles',
            optionName: Permalink.OPTIONS.PROGRESSION_ISLAND_PUZZLES,
          }),
          this.toggleInput({
            labelText: 'Lookout Platforms and Rafts',
            optionName: Permalink.OPTIONS.PROGRESSION_PLATFORMS_RAFTS,
          }),
          this.toggleInput({
            labelText: 'Submarines',
            optionName: Permalink.OPTIONS.PROGRESSION_SUBMARINES,
          }),
          this.toggleInput({
            labelText: 'Big Octos and Gunboats',
            optionName: Permalink.OPTIONS.PROGRESSION_BIG_OCTOS_GUNBOATS,
          }),
          this.toggleInput({
            labelText: 'Sunken Treasure (From Triforce Charts)',
            optionName: Permalink.OPTIONS.PROGRESSION_TRIFORCE_CHARTS,
          }),
          this.toggleInput({
            labelText: 'Sunken Treasure (From Treasure Charts)',
            optionName: Permalink.OPTIONS.PROGRESSION_TREASURE_CHARTS,
          }),
          this.toggleInput({
            labelText: 'Eye Reef Chests',
            optionName: Permalink.OPTIONS.PROGRESSION_EYE_REEF_CHESTS,
          }),
        ]}
      />
    );
  }

  additionalRandomizationOptionsTable() {
    return (
      <OptionsTable
        title="Additional Randomization Options"
        numColumns={2}
        options={[
          this.dropdownInput({
            labelText: 'Sword Mode',
            optionName: Permalink.OPTIONS.SWORD_MODE,
          }),
          this.toggleInput({
            labelText: 'Key-Lunacy',
            optionName: Permalink.OPTIONS.KEYLUNACY,
          }),
          this.dropdownInput({
            labelText: 'Triforce Shards to Start With',
            optionName: Permalink.OPTIONS.NUM_STARTING_TRIFORCE_SHARDS,
          }),
          this.toggleInput({
            labelText: 'Race Mode',
            optionName: Permalink.OPTIONS.RACE_MODE,
          }),
          this.dropdownInput({
            labelText: 'Randomize Entrances',
            optionName: Permalink.OPTIONS.RANDOMIZE_ENTRANCES,
          }),
          this.toggleInput({
            labelText: 'Randomize Charts',
            optionName: Permalink.OPTIONS.RANDOMIZE_CHARTS,
          }),
        ]}
      />
    );
  }

  convenienceTweaksTable() {
    return (
      <OptionsTable
        title="Convenience Tweaks"
        numColumns={2}
        options={[
          this.toggleInput({
            labelText: 'Skip Boss Rematches',
            optionName: Permalink.OPTIONS.SKIP_REMATCH_BOSSES,
          }),
        ]}
      />
    );
  }

  launchNewTracker() {
    const encodedPermalink = this.encodedPermalink();

    Launcher.openTrackerWindow(`/new/${encodedPermalink}`);
  }

  launchOnline(mode) {
    const encodedPermalink = this.encodedPermalink();
    const { gameId } = this.state;

    Launcher.openTrackerWindow(`/online/${mode}/${encodedPermalink}/${gameId}`);
  }

  launchLoadFromFileLaunchOnline() {
    const encodedPermalink = this.encodedPermalink();
    const { gameId } = this.state;

    Launcher.openTrackerWindow(`/load/online/${encodedPermalink}/${gameId}`);
  }

  loadFromSave() {
    const encodedPermalink = this.encodedPermalink();

    Launcher.openTrackerWindow(`/load/${encodedPermalink}`);
  }

  encodedPermalink() {
    const { permalink } = this.state;

    return encodeURIComponent(permalink);
  }

  async loadFromFile() {
    await Storage.loadFileAndStore();

    this.loadFromSave();
  }

  async loadFromFileLaunchOnline() {
    await Storage.loadFileAndStore();

    this.launchLoadFromFileLaunchOnline();
  }

  gameIdContainer() {
    const { gameId } = this.state;

    return (
      <>
        <div className="permalink-container">
          <div className="permalink-label">Room Name:</div>
          <div className="permalink-input">
            <input
              placeholder="Room Name"
              className="permalink"
              onChange={(event) => {
                event.stopPropagation();
                this.setState({ gameId: event.target.value });
              }}
              value={gameId}
            />
          </div>
        </div>
        <div className="launcher-button-container">
          <button
            className="launcher-button"
            type="button"
            onClick={() => this.launchOnline('itemsync')}
            disabled={!gameId}
          >
            Launch Itemsync
          </button>
          <button
            className="launcher-button"
            type="button"
            onClick={() => this.launchOnline('coop')}
            disabled={!gameId}
          >
            Launch Coop
          </button>
        </div>
      </>
    );
  }

  render() {
    return (
      <div className="full-container">
        <div className="launcher-container">
          <div className="header">
            <img
              src={HEADER_IMAGE}
              alt="The Legend of Zelda: The Wind Waker Randomizer Tracker"
              draggable={false}
            />
          </div>
          <div className="settings">
            {Launcher.introductionContainer()}
            {this.permalinkContainer()}
            {this.progressItemLocationsTable()}
            {this.additionalRandomizationOptionsTable()}
            {this.convenienceTweaksTable()}
            {this.gameIdContainer()}
          </div>
          <div className="attribution">
            <span>Maintained by Jaysc/Colfra • Source Code at </span>
            <a href="https://github.com/jaysc/tww-rando-tracker-coop">Github</a>
            <span> • Server code can be found </span>
            <a href="https://github.com/jaysc/tww-rando-tracker-coop-server">here</a>
            <span> • </span>
            <a href={`https://github.com/jaysc/tww-rando-tracker-coop/commit/${COMMIT_HASH}`} target="_blank" rel="noreferrer">
              Version:
              {' '}
              {COMMIT_HASH}
              {' '}
              (
              {BUILD_DATE}
              )
            </a>
          </div>
          <div className="attribution">
            <span>Based on code by wooferzfg • Source Code on </span>
            <a href="https://github.com/wooferzfg/tww-rando-tracker">GitHub</a>
            <span> • Original Tracker by BigDunka</span>
          </div>
        </div>
        <ToastContainer />
      </div>
    );
  }
}
