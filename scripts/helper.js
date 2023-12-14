function roundToTwo(num) {
    return +(Math.round(num + "e+2") + "e-2");
}

const DATE_NOW = new Date();
// Just a date that is old but not that old
const DATE_IPHONE5_RELEASE = new Date(2012, 9, 21);
const DIFF = DATE_NOW - DATE_IPHONE5_RELEASE;

/**
 * 
 * @param {string} date 
 * @returns {number} 0-100 (both inclusive)
 */
function calPercentage(date) {
    const obj = new Date(date);
    const percent = Math.max(0, parseInt((DATE_NOW - obj) / DIFF * 100));

    // Manually send p100, so cap the calculated percentage to 99
    return Math.min(99, percent);
}

export { roundToTwo, calPercentage }