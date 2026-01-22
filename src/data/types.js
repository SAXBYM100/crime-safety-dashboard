/**
 * @typedef {Object} AreaQuery
 * @property {"postcode"|"place"|"latlng"} kind
 * @property {string} value
 */

/**
 * @typedef {Object} AreaSource
 * @property {string} name
 * @property {string=} url
 * @property {string=} updatedAt
 */

/**
 * @typedef {Object} AreaProfile
 * @property {AreaQuery} query
 * @property {string} canonicalName
 * @property {string} displayName
 * @property {string} adminArea
 * @property {{lat: (number|null), lon: (number|null)}} geo
 * @property {{latestCrimes: Array, trend: {rows: Array}, errors: Object}} safety
 * @property {{summary?: string, status?: string}} housing
 * @property {{summary?: string, status?: string}} transport
 * @property {{summary?: string, status?: string}} demographics
 * @property {AreaSource[]} sources
 * @property {string} updatedAt
 */

export {};
