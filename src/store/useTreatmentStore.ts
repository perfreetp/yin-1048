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
const FAMILY_SHARE_KEY = 'orthodontic_family_share_code';

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
  currentSessionStartTime: number | null;
}

const getTodayStr = (ts: number | string = Date.now()) => dayjs(ts).format('YYYY-MM-DD');
const getStartOfDayTs = (dateStr: string) => dayjs(dateStr).startOf('day').valueOf();

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

const getOrCreateRecord = (records: WearRecord[], date: string): [WearRecord[], WearRecord] => {
  let target = records.find(r => r.date === date);
  if (!target) {
    target = {
      date,
      duration: 0,
      wearCount: 0,
      removeCount: 0,
      isCompleted: false
    };
    return [[...records, target], target];
  }
  return [records, target];
};

const ensureRubberBand = (records: RubberBandRecord[], date: string): RubberBandRecord[] => {
  if (records.find(r => r.date === date)) return records;
  const newRecord: RubberBandRecord = {
    date,
    times: 0,
    totalTimes: 3,
    isCompleted: false
  };
  return [newRecord, ...records];
};

/**
 * 拆分跨自然日的佩戴时长
 * 例如：从 23:30 戴到 01:30，共120分钟
 *   -> 昨天分到 30分钟（23:30-24:00）
 *   -> 今天分到 90分钟（00:00-01:30）
 */
const splitDurationByDays = (startTs: number, endTs: number): Array<{ date: string; minutes: number }> => {
  if (endTs <= startTs) return [];
  
  const results: Array<{ date: string; minutes: number }> = [];
  let currentTs = startTs;
  
  while (currentTs < endTs) {
    const dateStr = getTodayStr(currentTs);
    const dayEndTs = getStartOfDayTs(dateStr) + 24 * 60 * 60 * 1000;
    const segEnd = Math.min(endTs, dayEndTs);
    const minutes = Math.floor((segEnd - currentTs) / 60000);
    
    if (minutes > 0) {
      results.push({ date: dateStr, minutes });
    }
    currentTs = segEnd;
  }
  
  return results;
};

/**
 * 给某日添加佩戴时长，并更新完成状态
 */
const addDurationToRecord = (
  records: WearRecord[],
  date: string,
  minutes: number,
  wearInc: number = 0,
  removeInc: number = 0
): WearRecord[] => {
  const [newRecords, target] = getOrCreateRecord(records, date);
  const newDuration = Math.max(0, target.duration + minutes);
  const newWear = target.wearCount + wearInc;
  const newRemove = target.removeCount + removeInc;
  const isCompleted = newDuration >= 1320;
  
  return newRecords.map(r =>
    r.date === date
      ? { ...r, duration: newDuration, wearCount: newWear, removeCount: newRemove, isCompleted }
      : r
  );
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
  toggleWear: () => { durations: Array<{ date: string; minutes: number }> } | null;
  settleCrossDay: () => void;
  addRemoveRecord: (date: string) => void;
  getTodayDuration: () => number;
  getCurrentWearMinutes: () => number;
  getCurrentSessionStartText: () => string | null;
  getCurrentSessionElapsedText: () => string | null;
  
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
  
  // 家属分享
  saveFamilyShareCode: (code: string) => void;
  getFamilyShareCode: () => string | null;
}

const persisted = loadFromStorage();
const initialWearRecords = persisted?.wearRecords || [];
const initialMessages = persisted?.messages || defaultMessages;
const initialPainRecords = persisted?.painRecords || defaultPainRecords;
const initialRubberBandRecords = persisted?.rubberBandRecords || defaultRubberBandRecords;
const initialOralPhotos = persisted?.oralPhotos || defaultOralPhotos;
const initialSettings = persisted?.settings || defaultSettings;
const initialIsWearing = persisted?.isWearing ?? true;
let initialCurrentWearStartTime = persisted?.currentWearStartTime || null;

let wearRecordsInit = initialWearRecords;
let rubberBandInit = ensureRubberBand(initialRubberBandRecords, getTodayStr());

// 如果正在佩戴且跨了天，先做一次拆分
if (initialIsWearing && initialCurrentWearStartTime) {
  const startDay = getTodayStr(initialCurrentWearStartTime);
  const today = getTodayStr();
  if (startDay !== today) {
    const startOfToday = getStartOfDayTs(today);
    const splits = splitDurationByDays(initialCurrentWearStartTime, startOfToday);
    for (const s of splits) {
      wearRecordsInit = addDurationToRecord(wearRecordsInit, s.date, s.minutes);
    }
    // 更新佩戴开始时间到今天0点
    initialCurrentWearStartTime = startOfToday;
  }
}
// 确保今天有记录
[wearRecordsInit] = getOrCreateRecord(wearRecordsInit, getTodayStr());

export const useTreatmentStore = create<TreatmentState>((set, get) => ({
  userInfo: defaultUserInfo,
  stages: treatmentStages,
  appointmentRecords,
  
  wearRecords: wearRecordsInit,
  messages: initialMessages,
  painRecords: initialPainRecords,
  rubberBandRecords: rubberBandInit,
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
      currentSessionStartTime: state.currentWearStartTime
    };
    saveToStorage(data);
  },

  getCurrentWearMinutes: () => {
    const { isWearing, currentWearStartTime } = get();
    if (!isWearing || !currentWearStartTime) return 0;
    const now = Date.now();
    const startDay = getTodayStr(currentWearStartTime);
    const today = getTodayStr();
    
    if (startDay === today) {
      return Math.floor((now - currentWearStartTime) / 60000);
    }
    const startOfToday = getStartOfDayTs(today);
    return Math.floor((now - startOfToday) / 60000);
  },

  getCurrentSessionStartText: () => {
    const { isWearing, currentWearStartTime } = get();
    if (!isWearing || !currentWearStartTime) return null;
    return dayjs(currentWearStartTime).format('HH:mm');
  },

  getCurrentSessionElapsedText: () => {
    const { isWearing, currentWearStartTime } = get();
    if (!isWearing || !currentWearStartTime) return null;
    const minutes = Math.floor((Date.now() - currentWearStartTime) / 60000);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}小时${m}分` : `${m}分钟`;
  },

  getTodayDuration: () => {
    const { wearRecords } = get();
    const today = getTodayStr();
    const todayRecord = wearRecords.find(r => r.date === today);
    const baseDuration = todayRecord?.duration || 0;
    return baseDuration + get().getCurrentWearMinutes();
  },

  settleCrossDay: () => {
    const { isWearing, currentWearStartTime, wearRecords } = get();
    if (!isWearing || !currentWearStartTime) return;
    
    const startDay = getTodayStr(currentWearStartTime);
    const today = getTodayStr();
    if (startDay === today) return;
    
    const startOfToday = getStartOfDayTs(today);
    const splits = splitDurationByDays(currentWearStartTime, startOfToday);
    let newRecords = wearRecords;
    for (const s of splits) {
      newRecords = addDurationToRecord(newRecords, s.date, s.minutes);
    }
    
    set({
      wearRecords: newRecords,
      currentWearStartTime: startOfToday
    });
    get().persist();
  },

  toggleWear: () => {
    const { isWearing, currentWearStartTime, wearRecords } = get();
    const now = Date.now();
    
    if (isWearing && currentWearStartTime) {
      const splits = splitDurationByDays(currentWearStartTime, now);
      if (splits.length === 0) return null;
      
      let newRecords = wearRecords;
      for (let i = 0; i < splits.length; i++) {
        const s = splits[i];
        const isLast = i === splits.length - 1;
        newRecords = addDurationToRecord(
          newRecords,
          s.date,
          s.minutes,
          i === 0 ? 0 : 0,
          isLast ? 1 : 0
        );
      }
      
      set({
        isWearing: false,
        currentWearStartTime: null,
        wearRecords: newRecords
      });
      get().persist();
      return { durations: splits };
      
    } else {
      const today = getTodayStr();
      let newRecords = addDurationToRecord(wearRecords, today, 0, 1, 0);
      
      set({
        isWearing: true,
        currentWearStartTime: now,
        wearRecords: newRecords
      });
      get().persist();
      return null;
    }
  },

  addRemoveRecord: (date: string) => {
    set(state => ({
      wearRecords: addDurationToRecord(state.wearRecords, date, 0, 0, 1)
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
    get().settleCrossDay();
    
    set(state => {
      const today = getTodayStr();
      let [newWear, _] = getOrCreateRecord(state.wearRecords, today);
      const newRubber = ensureRubberBand(state.rubberBandRecords, today);
      
      if (newWear === state.wearRecords && newRubber === state.rubberBandRecords) {
        return {};
      }
      return {
        wearRecords: newWear,
        rubberBandRecords: newRubber
      };
    });
    get().persist();
  },

  saveFamilyShareCode: (code: string) => {
    try {
      Taro.setStorageSync(FAMILY_SHARE_KEY, code);
    } catch (e) {
      console.error('[Store] saveFamilyShareCode error', e);
    }
  },

  getFamilyShareCode: () => {
    try {
      const code = Taro.getStorageSync(FAMILY_SHARE_KEY);
      return code || null;
    } catch (e) {
      return null;
    }
  }
}));
