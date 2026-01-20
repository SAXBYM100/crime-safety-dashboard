/**
 * @typedef {Object} CrimeLocation
 * @property {number} lat
 * @property {number} lon
 * @property {string} name
 */

/**
 * @typedef {Object} CrimeRecord
 * @property {string} id
 * @property {string} category
 * @property {number} count
 * @property {string} date
 * @property {CrimeLocation} location
 * @property {string} source
 * @property {string} [outcome]
 * @property {number} [confidence]
 */

/**
 * @typedef {Object} AreaReport
 * @property {string} name
 * @property {number} lat
 * @property {number} lon
 * @property {number} radius
 * @property {CrimeRecord[]} crimes
 * @property {Object} metadata
 * @property {string[]} sources
 * @property {string} generatedAt
 */

module.exports = {};
