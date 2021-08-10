// The numeric value corresponds to the column index of the attribute in the
// DETER CSV data.
export const Attribute = Object.freeze({
  NO_ATTRIBUTE: 112,
  DAY_TYPE: 7,
  FINAL_DESTINATION_CODED: 19,
  FIRST_TOUCH_OBJ_CODED: 28,
  GENDER: 16,
  MECH_TRANS: 35,
  RE_MEDICAL: 34,
  TIME_TYPE: 14,
  TOUCH_BINARY: 24,
});

export const ATTRIBUTE_NAMES = Object.freeze(new Map([
  [Attribute.NO_ATTRIBUTE, 'NO_ATTRIBUTE'],
  [Attribute.DAY_TYPE, 'DAY_TYPE'],
  [Attribute.FINAL_DESTINATION_CODED, 'FINAL_DESTINATION_CODED'],
  [Attribute.FIRST_TOUCH_OBJ_CODED, 'FIRST_TOUCH_OBJ_CODED'],
  [Attribute.GENDER, 'GENDER'],
  [Attribute.MECH_TRANS, 'MECH_TRANS'],
  [Attribute.RE_MEDICAL, 'RE_MEDICAL'],
  [Attribute.TIME_TYPE, 'TIME_TYPE'],
  [Attribute.TOUCH_BINARY, 'TOUCH_BINARY'],
]));
