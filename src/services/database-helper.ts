export default class DatabaseHelper {
  public static getLocationKey(generalLocation, detailedLocation) {
    return `${generalLocation}#${detailedLocation}`;
  }
}