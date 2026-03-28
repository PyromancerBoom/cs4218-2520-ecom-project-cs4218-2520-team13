/**
 * MongoDB operator injection payloads.
 * Used in AUTH-03 and INJ-01.
 * Each payload is a full request body object — spread into the test's .send() call.
 */

// Login endpoint payloads — attempt to bypass email+password check
export const loginInjectionPayloads = [
  { email: { $ne: null },      password: { $ne: null } },
  { email: { $gt: '' },        password: { $gt: '' } },
  { email: { $gte: '' },       password: { $gte: '' } },
  { email: { $lt: 'z' },       password: { $lt: 'z' } },
  { email: { $regex: '.*' },   password: { $regex: '.*' } },
  { email: { $exists: true },  password: { $exists: true } },
  { email: { $in: ['a@b.com', 'admin@test.com'] }, password: { $ne: null } },
  { email: { $nin: [] },       password: { $nin: [] } },
  { email: { $type: 'string'}, password: { $type: 'string' } },
  { email: { $not: { $eq: 'x' } }, password: { $ne: null } },
];

// Forgot-password endpoint payloads — attempt to reset an arbitrary account's password
export const forgotPasswordInjectionPayloads = [
  { email: { $ne: null },     answer: { $ne: null },     newPassword: 'injected_pw_1234' },
  { email: { $exists: true }, answer: { $exists: true }, newPassword: 'injected_pw_1234' },
  { email: { $regex: '.*' }, answer: { $regex: '.*' },  newPassword: 'injected_pw_1234' },
];

// Product filter endpoint payloads — attempt to bypass category filter
export const productFilterInjectionPayloads = [
  { checked: { $where: '1==1' },  radio: [] },
  { checked: { $ne: null },       radio: [] },
  { checked: { $exists: true },   radio: [] },
  { checked: { $regex: '.*' },    radio: [] },
  { checked: null,                 radio: { $ne: null } },
];
