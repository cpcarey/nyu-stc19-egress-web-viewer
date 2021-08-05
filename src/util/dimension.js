// The numeric value corresponds to the column index of the dimension in the
// DETER CSV data.
export const Dimension = Object.freeze({
  NO_DIMENSION: 112,
  DAY_TYPE: 7,
  FINAL_DESTINATION_CODED: 19,
  FIRST_TOUCH_OBJ_CODED: 28,
  GENDER: 16,
  MECH_TRANS: 35,
  RE_MEDICAL: 34,
  TIME_TYPE: 14,
  TOUCH_BINARY: 24,
});

export const DIMENSION_NAMES = Object.freeze(new Map([
  [Dimension.NO_DIMENSION, 'NO_DIMENSION'],
  [Dimension.DAY_TYPE, 'DAY_TYPE'],
  [Dimension.FINAL_DESTINATION_CODED, 'FINAL_DESTINATION_CODED'],
  [Dimension.FIRST_TOUCH_OBJ_CODED, 'FIRST_TOUCH_OBJ_CODED'],
  [Dimension.GENDER, 'GENDER'],
  [Dimension.MECH_TRANS, 'MECH_TRANS'],
  [Dimension.RE_MEDICAL, 'RE_MEDICAL'],
  [Dimension.TIME_TYPE, 'TIME_TYPE'],
  [Dimension.TOUCH_BINARY, 'TOUCH_BINARY'],
]));
