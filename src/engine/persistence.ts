import { getItem } from '../data';
import { SAVE_KEY } from './actions/consts';

export const hasSave = (): boolean => {
  try {
    return localStorage.getItem(SAVE_KEY) !== null;
  } catch {
    return false;
  }
};

