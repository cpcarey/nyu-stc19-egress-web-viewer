// The numeric value corresponds to the column index of the dimension in the
// DETER CSV data.
export const Dimension = Object.freeze({
  GENDER: 16,
  TIME_TYPE: 14,
  RE_MEDICAL: 34,
  MECH_TRANS: 35,
  TOUCH_BINARY: 24,
});

export const DIMENSION_NAMES = Object.freeze(new Map([
  [Dimension.GENDER, 'GENDER'],
  [Dimension.MECH_TRANS, 'MECH_TRANS'],
  [Dimension.RE_MEDICAL, 'RE_MEDICAL'],
  [Dimension.TIME_TYPE, 'TIME_TYPE'],
  [Dimension.TOUCH_BINARY, 'TOUCH_BINARY'],
]));
