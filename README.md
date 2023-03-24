# TWW Randomizer Tracker Coop

This is a online synchronized tracker for [The Wind Waker Randomizer](https://github.com/LagoLunatic/wwrando). You can create an online room where the tracker will be synced with all connected clients (items and locations).

This tracker is based on source code written by [wooferzfg](https://github.com/wooferzfg). You can find the original tracker at [wooferzfg.me/tww-rando-tracker](https://www.wooferzfg.me/tww-rando-tracker/).

## Build Instructions

Building and running the tracker locally requires you to install [Node 18](https://nodejs.org/en/download/) and [Git](https://git-scm.com/downloads).

Clone the repository by running the following in a command prompt:
```bash
git clone https://github.com/jaysc/tww-rando-tracker-coop.git
```

Navigate to the `tww-rando-tracker` folder and install dependencies:
```bash
cd tww-rando-tracker && npm install
```
You can then build and serve the tracker application:
```bash
npm start
```
After the server starts, you can go to [localhost:8080](http://localhost:8080/) to open the tracker.

## Documentation

Original code documentation is available at [wooferzfg.me/tww-rando-tracker/docs](https://www.wooferzfg.me/tww-rando-tracker/docs).
