// Lightweight global state via React context — small enough that we don't
// need Zustand/Redux for an internal tool.

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const StateContext = createContext(null);

const USER_NAME_KEY = 'bms-timesheet:userName';

export function StateProvider({ children }) {
  const [userName, setUserNameRaw] = useState('');
  const [timesheet, setTimesheet] = useState(null);
  const [missingDays, setMissingDays] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [resolutions, setResolutions] = useState({});

  useEffect(() => {
    AsyncStorage.getItem(USER_NAME_KEY).then((v) => v && setUserNameRaw(v));
  }, []);

  const setUserName = useCallback((name) => {
    setUserNameRaw(name);
    if (name) AsyncStorage.setItem(USER_NAME_KEY, name);
    else AsyncStorage.removeItem(USER_NAME_KEY);
  }, []);

  const updateResolution = useCallback((key, patch) => {
    setResolutions((r) => ({ ...r, [key]: { ...(r[key] || {}), ...patch } }));
  }, []);

  return (
    <StateContext.Provider value={{
      userName, setUserName,
      timesheet, setTimesheet,
      missingDays, setMissingDays,
      photos, setPhotos,
      resolutions, setResolutions, updateResolution,
    }}>
      {children}
    </StateContext.Provider>
  );
}

export function useAppState() {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error('useAppState must be used within StateProvider');
  return ctx;
}
