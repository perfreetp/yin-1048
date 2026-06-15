import { create } from 'zustand';
import Taro from '@tarojs/taro';
import type {
  UserInfo,
  TreatmentStage,
  WearRecord,
  Message,
  PainRecord,
  RubberBandRecord,
  AppointmentRecord,
  OralPhoto,
  WeeklyReport,
  Settings
} from '@/types';
import {
  userInfo as defaultUserInfo,
  treatmentStages,
  messages as defaultMessages,
  painRecords as defaultPainRecords,
  rubberBandRecords as defaultRubberBandRecords,
  appointmentRecords,
  oralPhotos as defaultOralPhotos,
  defaultSettings
} from '@/data/mockData';
import dayjs from 'dayjs';

const STORAGE_KEY = 'orthodontic_treatment_data';

interface PersistedData {
  wearRecords: WearRecord[];
  messages: Message[];
  painRecords: PainRecord[];
  rubberBandRecords: RubberBandRecord[];
  oralPhotos: OralPhoto[];
  settings: Settings;
  isWearing: boolean;
  currentWearStartTime: number | null;
  lastRecordDate: string;
  lastWeekReportDate: string;
}

const getTodayStr = () => dayjs().format('YYYY-MM-DD');

const loadFromStorage = (): PersistedData | null => {
  try {
    const data = Taro.getStorageSync(STORAGE_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return null;
  } catch (e) {
    console.error('[Store] Failed to load from storage', e);
    return null;
  }
};

const saveToStorage = (data: PersistedData) => {
  try {
    Taro.setStorageSync(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('[Store] Failed to save to storage', e);
  }
};

const ensureTodayRecord = (records: WearRecord[]): WearRecord[] => {
  const today = getTodayStr();
  const todayRecord = records.find(r => r.date === today);
  
  if (!todayRecord) {
    const newRecord: WearRecord = {
      date: today,
      duration: 0,
      wearCount: 0,
      removeCount: 0,
      isCompleted: false
    };
    return [...records, newRecord];
  }
  return records;
};

const ensureTodayRubberBand = (records: RubberBandRecord[]): RubberBandRecord[] => {
  const today = getTodayStr();
  const todayRecord = records.find(r => r.date === today);
  
  if (!todayRecord) {
    const newRecord: RubberBandRecord = {
      date: today,
      times: 0,
      totalTimes: 3,
      isCompleted: false
    };
    return [newRecord, ...records];
  }
  return records;
};

interface TreatmentState {
  userInfo: UserInfo;
  stages: TreatmentStage[];
  appointmentRecords: AppointmentRecord[];
  
  wearRecords: WearRecord[];
  messages: Message[];
  painRecords: PainRecord[];
  rubberBandRecords: RubberBandRecord[];
  oralPhotos: OralPhoto[];
  settings: Settings;
  isWearing: boolean;
  currentWearStartTime: number | null;
  
  persist: () => void;
  toggleWear: () => void;
  addRemoveRecord: (date: string) => void;
  getTodayDuration: () => number;
  getCurrentWearMinutes: () => number;
  
  markMessageRead: (id: number) => void;
  markAllMessagesRead: () => void;
  
  addPainRecord: (record: PainRecord) => void;
  addRubberBandRecord: (date: string) => void;
  addOralPhoto: (photo: OralPhoto) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  
  getTodayRecord: () => WearRecord | undefined;
  getUnreadMessageCount: () => number;
  getWeeklyReport: () => WeeklyReport;
  
  syncWithStorage: () => void;
}

const persisted = loadFromStorage();
const initialWearRecords = persisted?.wearRecords || [];
const initialMessages = persisted?.messages || defaultMessages;
const initialPainRecords = persisted?.painRecords || defaultPainRecords;
const initialRubberBandRecords = persisted?.rubberBandRecords || defaultRubberBandRecords;
const initialOralPhotos = persisted?.oralPhotos || defaultOralPhotos;
const initialSettings = persisted?.settings || defaultSettings;
const initialIsWearing = persisted?.isWearing ?? true;
const initialCurrentWearStartTime = persisted?.currentWearStartTime || null;

const initializeRecords = () => {
  let wearRecords = ensureTodayRecord(initialWearRecords);
  let rubberBandRecords = ensureTodayRubberBand(initialRubberBandRecords);
  
  const today = getTodayStr();
  if (initialIsWearing && !initialCurrentWearStartTime) {
    const todayRecord = wearRecords.find(r => r.date === today);
    if (todayRecord && todayRecord.duration > 0) {
    }
  }
  
  return { wearRecords, rubberBandRecords };
};

const { wearRecords: initWearRecords, rubberBandRecords: initRubberBandRecords } = initializeRecords();

export const useTreatmentStore = create<TreatmentState>((set, get) => ({
  userInfo: defaultUserInfo,
  stages: treatmentStages,
  appointmentRecords,
  
  wearRecords: initWearRecords,
  messages: initialMessages,
  painRecords: initialPainRecords,
  rubberBandRecords: initRubberBandRecords,
  oralPhotos: initialOralPhotos,
  settings: initialSettings,
  isWearing: initialIsWearing,
  currentWearStartTime: initialCurrentWearStartTime,

  persist: () => {
    const state = get();
    const data: PersistedData = {
      wearRecords: state.wearRecords,
      messages: state.messages,
      painRecords: state.painRecords,
      rubberBandRecords: state.rubberBandRecords,
      oralPhotos: state.oralPhotos,
      settings: state.settings,
      isWearing: state.isWearing,
      currentWearStartTime: state.currentWearStartTime,
      lastRecordDate: getTodayStr(),
      lastWeekReportDate: getTodayStr()
    };
    saveToStorage(data);
  },

  getCurrentWearMinutes: () => {
    const { isWearing, currentWearStartTime } = get();
    if (!isWearing || !currentWearStartTime) return 0;
    return Math.floor((Date.now() - currentWearStartTime) / 60000);
  },

  getTodayDuration: () => {
    const { wearRecords } = get();
    const today = getTodayStr();
    const todayRecord = wearRecords.find(r => r.date === today);
    const baseDuration = todayRecord?.duration || 0;
    return baseDuration + get().getCurrentWearMinutes();
  },

  toggleWear: () => {
    const { isWearing, currentWearStartTime, wearRecords } = get();
    const today = getTodayStr();
    
    if (isWearing && currentWearStartTime) {
      const sessionDuration = Math.floor((Date.now() - currentWearStartTime) / 60000);
      
      const updatedRecords = wearRecords.map(record => {
        if (record.date === today) {
          const newDuration = record.duration + Math.max(0, sessionDuration);
          return {
            ...record,
            duration: newDuration,
            removeCount: record.removeCount + 1,
            isCompleted: newDuration >= 1320
          };
        }
        return record;
      });
      
      set({
        isWearing: false,
        currentWearStartTime: null,
        wearRecords: updatedRecords
      });
    } else {
      const updatedRecords = wearRecords.map(record => {
        if (record.date === today) {
          return {
            ...record,
            wearCount: record.wearCount + 1
          };
        }
        return record;
      });
      
      set({
        isWearing: true,
        currentWearStartTime: Date.now(),
        wearRecords: updatedRecords
      });
    }
    
    get().persist();
  },

  addRemoveRecord: (date: string) => {
    set(state => ({
      wearRecords: state.wearRecords.map(record =>
        record.date === date
          ? { ...record, removeCount: record.removeCount + 1 }
          : record
      )
    }));
    get().persist();
  },

  markMessageRead: (id: number) => {
    set(state => ({
      messages: state.messages.map(msg =>
        msg.id === id ? { ...msg, isRead: true } : msg
      )
    }));
    get().persist();
  },

  markAllMessagesRead: () => {
    set(state => ({
      messages: state.messages.map(msg => ({ ...msg, isRead: true }))
    }));
    get().persist();
  },

  addPainRecord: (record: PainRecord) => {
    set(state => ({
      painRecords: [record, ...state.painRecords]
    }));
    get().persist();
  },

  addRubberBandRecord: (date: string) => {
    set(state => ({
      rubberBandRecords: state.rubberBandRecords.map(record =>
        record.date === date && record.times < record.totalTimes
          ? { ...record, times: record.times + 1, isCompleted: record.times + 1 >= record.totalTimes }
          : record
      )
    }));
    get().persist();
  },

  addOralPhoto: (photo: OralPhoto) => {
    set(state => ({
      oralPhotos: [photo, ...state.oralPhotos]
    }));
    get().persist();
  },

  updateSettings: (settings: Partial<Settings>) => {
    set(state => ({
      settings: { ...state.settings, ...settings }
    }));
    get().persist();
  },

  getTodayRecord: () => {
    const { wearRecords } = get();
    const today = getTodayStr();
    return wearRecords.find(record => record.date === today);
  },

  getUnreadMessageCount: () => {
    const { messages } = get();
    return messages.filter(msg => !msg.isRead).length;
  },

  getWeeklyReport: (): WeeklyReport => {
    const { wearRecords } = get();
    const weekStart = dayjs().subtract(6, 'day').format('YYYY-MM-DD');
    const weekEnd = getTodayStr();
    
    let completedDays = 0;
    let totalDuration = 0;
    let continuousDays = 0;
    
    for (let i = 6; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      const record = wearRecords.find(r => r.date === date);
      if (record?.isCompleted) {
        completedDays++;
        totalDuration += record.duration;
      }
    }
    
    for (let i = 0; i < 30; i++) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      const record = wearRecords.find(r => r.date === date);
      if (record?.isCompleted) {
        continuousDays++;
      } else if (i > 0) {
        break;
      }
    }
    
    return {
      weekStart,
      weekEnd,
      totalDays: 7,
      completedDays,
      avgDuration: completedDays > 0 ? Math.floor(totalDuration / completedDays) : 0,
      continuousDays
    };
  },

  syncWithStorage: () => {
    const { wearRecords, rubberBandRecords } = get();
    let updatedWear = ensureTodayRecord(wearRecords);
    let updatedRubber = ensureTodayRubberBand(rubberBandRecords);
    
    if (updatedWear !== wearRecords || updatedRubber !== rubberBandRecords) {
      set({
        wearRecords: updatedWear,
        rubberBandRecords: updatedRubber
      });
      get().persist();
    }
  }
}));
