function roundToTwo(num) {
    return +(Math.round(num + "e+2") + "e-2");
}

export { roundToTwo }