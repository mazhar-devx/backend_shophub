const Log = require('../models/logModel');

/**
 * Record a system event log in the database.
 * @param {'info' | 'success' | 'error'} type 
 * @param {string} message 
 */
const logEvent = async (type, message) => {
  try {
    await Log.create({ type, message });
    console.log(`[SYS-LOG] [${type.toUpperCase()}] ${message}`);
  } catch (err) {
    console.error('Failed to write log to DB:', err.message);
  }
};

module.exports = { logEvent };
