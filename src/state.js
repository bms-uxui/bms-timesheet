const USER_NAME_KEY = 'bms-timesheet:userName';

export const state = {
  step: 'import',
  timesheet: null,
  missingDays: [],
  photos: [],
  resolutions: {},
  userName: localStorage.getItem(USER_NAME_KEY) || '',
};

export function setUserName(name) {
  state.userName = name;
  if (name) localStorage.setItem(USER_NAME_KEY, name);
  else localStorage.removeItem(USER_NAME_KEY);
}
