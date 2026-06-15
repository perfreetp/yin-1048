import { create } from 'zustand';
import Taro from '@tarojs/taro';
import type {
  UserInfo,
  TreatmentStage,
  WearRecord,
  WearSession,
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
  defaultSettings,
  generateWearSessions
} from '@/data/mockData';
import dayjs from 'dayjs';

const STORAGE_KEY = 'orthodontic_treatment_data';
const FAMILY_SHARE_KEY = 'orthodontic_family_share_code';
const TARGET_DURATION = 1320; // 22h = 1320min

interface PersistedData {
  wearRecords: WearRecord[];
  wearSessions: WearSession[];
  messages: Message[];
  painRecords: PainRecord[];
  rubberBandRecords: RubberBandRecord[];
  oralPhotos: OralPhoto[];
  settings: Settings;
  isWearing: boolean;
  currentWearStartTime: number | null;
  currentSessionId: string | null;
  lastRecordDate: string;
}

const getTodayStr = (ts: number | string = Date.now()) => dayjs(ts).format('YYYY-MM-DD');
const getStartOfDayTs = (dateStr: string) => dayjs(dateStr).startOf('day').valueOf();

const loadFromStorage = (): PersistedData | null => {
  try {
    const data = Taro.getStorageSync(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // 兼容老版本数据
      if (!parsed.wearSessions) parsed.wearSessions = [];
      if (!parsed.currentSessionId) parsed.currentSessionId = null;
      return parsed;
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
 * 从 session 列表重新计算累计的 WearRecords
 * 单一数据源，避免不一致
 */
const recalcRecordsFromSessions = (
  sessions: WearSession[],
  existingRecords: WearRecord[] = []
): WearRecord[] => {
  const recordsMap = new Map<string, WearRecord>();
  existingRecords.forEach(r => recordsMap.set(r.date, { ...r, duration: 0, wearCount: 0, removeCount: 0 }));

  sessions.forEach(s => {
    // 按跨天方式拆分每一段 session 到各自然日
    const start = s.startTs;
    const end = s.endTs || Date.now();
    if (end <= start) return;

    let curTs = start;
    while (curTs < end) {
      const dateStr = getTodayStr(curTs);
      const dayEnd = getStartOfDayTs(dateStr) + 86400000;
      const segEnd = Math.min(end, dayEnd);
      const mins = Math.floor((segEnd - curTs) / 60000);

      if (mins > 0) {
        if (!recordsMap.has(dateStr)) {
          recordsMap.set(dateStr, {
            date: dateStr, duration: 0, wearCount: 0, removeCount: 0, isCompleted: false
          });
        }
        const rec = recordsMap.get(dateStr)!;
        rec.duration += mins;
        if (curTs === s.startTs) rec.wearCount += 1;
        if (segEnd === end && s.endTs !== null) rec.removeCount += 1;
      }
      curTs = segEnd;
    }
  });

  // 更新 isCompleted
  recordsMap.forEach(r => {
    r.isCompleted = r.duration >= TARGET_DURATION;
  });

  return Array.from(recordsMap.values()).sort((a, b) => (a.date < b.date ? 1 : -1));
};

/**
 * 拆分跨自然日的佩戴时长
 */
const splitDurationByDays = (startTs: number, endTs: number): Array<{ date: string; minutes: number }> => {
  if (endTs <= startTs) return [];
  const results: Array<{ date: string; minutes: number }> = [];
  let currentTs = startTs;
  while (currentTs < endTs) {
    const dateStr = getTodayStr(currentTs);
    const dayEndTs = getStartOfDayTs(dateStr) + 86400000;
    const segEnd = Math.min(endTs, dayEndTs);
    const minutes = Math.floor((segEnd - currentTs) / 60000);
    if (minutes > 0) results.push({ date: dateStr, minutes });
    currentTs = segEnd;
  }
  return results;
};

interface TreatmentState {
  userInfo: UserInfo;
  stages: TreatmentStage[];
  appointmentRecords: AppointmentRecord[];

  wearRecords: WearRecord[];
  wearSessions: WearSession[];
  messages: Message[];
  painRecords: PainRecord[];
  rubberBandRecords: RubberBandRecord[];
  oralPhotos: OralPhoto[];
  settings: Settings;
  isWearing: boolean;
  currentWearStartTime: number | null;
  currentSessionId: string | null;

  persist: () => void;

  // 佩戴核心
  toggleWear: (note?: string) => { durations: Array<{ date: string; minutes: number }> } | null;
  settleCrossDay: () => void;
  addRemoveRecord: (date: string) => void;
  getTodayDuration: () => number;
  getCurrentWearMinutes: () => number;
  getCurrentSessionStartText: () => string | null;
  getCurrentSessionElapsedText: () => string | null;

  // Session 明细操作（用于记录页修正）
  getSessionsByDate: (date: string) => WearSession[];
  addSession: (session: Omit<WearSession, 'id' | 'minutes'> & { minutes?: number }) => void;
  updateSession: (id: string, patch: Partial<Pick<WearSession, 'startTs' | 'endTs' | 'note'>>) => void;
  deleteSession: (id: string) => void;
  recalcRecords: () => void;

  // 消息
  markMessageRead: (id: number) => void;
  markAllMessagesRead: () => void;

  // 记录
  addPainRecord: (record: PainRecord) => void;
  addRubberBandRecord: (date: string) => void;
  addOralPhoto: (photo: OralPhoto) => void;
  updateSettings: (settings: Partial<Settings>) => void;

  // 查询
  getTodayRecord: () => WearRecord | undefined;
  getUnreadMessageCount: () => number;
  getWeeklyReport: () => WeeklyReport;
  getLast7DaysTrend: () => Array<{ date: string; label: string; minutes: number; completed: boolean }>;

  syncWithStorage: () => void;

  // 家属分享
  saveFamilyShareCode: (code: string) => void;
  getFamilyShareCode: () => string | null;
}

// ========== 初始化 ==========
const persisted = loadFromStorage();

let initialWearSessions: WearSession[] = persisted?.wearSessions || [];
let initialCurrentSessionId: string | null = persisted?.currentSessionId || null;
let initialIsWearing = persisted?.isWearing ?? false;
let initialCurrentWearStartTime: number | null = persisted?.currentWearStartTime || null;

// 如果没有 sessions（首次启动），生成 mock 数据
if (initialWearSessions.length === 0) {
  initialWearSessions = generateWearSessions();
  // 找正在进行的 session
  const ongoing = initialWearSessions.find(s => s.endTs === null);
  if (ongoing) {
    initialCurrentSessionId = ongoing.id;
    initialIsWearing = true;
    initialCurrentWearStartTime = ongoing.startTs;
  }
}

// ========== 关键修复：佩戴状态一致性校验 ==========
// 如果显示正在佩戴，但没有 session ID 或没有 startTime，说明数据不一致 → 强制设为未佩戴
if (initialIsWearing && (!initialCurrentSessionId || !initialCurrentWearStartTime)) {
  console.warn('[Store] 数据不一致：正在佩戴但缺少 startTime 或 sessionId，强制修正为未佩戴');
  initialIsWearing = false;
  initialCurrentWearStartTime = null;
  initialCurrentSessionId = null;
  // 同时把 sessions 中正在进行的那条也收尾（防止脏数据）
  initialWearSessions = initialWearSessions.map(s => {
    if (s.endTs === null) {
      const now = Date.now();
      const mins = Math.floor((now - s.startTs) / 60000);
      return { ...s, endTs: now, minutes: Math.max(0, mins) };
    }
    return s;
  });
}

// 如果正在佩戴，重新核对：currentSessionId 对应的 session 必须存在且 endTs 为 null
if (initialIsWearing && initialCurrentSessionId) {
  const sess = initialWearSessions.find(s => s.id === initialCurrentSessionId);
  if (!sess || sess.endTs !== null) {
    console.warn('[Store] 数据不一致：session 不存在或已结束，强制修正为未佩戴');
    initialIsWearing = false;
    initialCurrentWearStartTime = null;
    initialCurrentSessionId = null;
  } else {
    // 对齐 startTime
    initialCurrentWearStartTime = sess.startTs;
  }
}

// 跨天结算（初始化时）
if (initialIsWearing && initialCurrentWearStartTime) {
  const startDay = getTodayStr(initialCurrentWearStartTime);
  const today = getTodayStr();
  if (startDay !== today) {
    // 把昨天及以前的 session 拆分并结束
    const startOfToday = getStartOfDayTs(today);
    const oldSession = initialWearSessions.find(s => s.id === initialCurrentSessionId);
    if (oldSession) {
      const splits = splitDurationByDays(oldSession.startTs, startOfToday);
      // 昨天及以前的时长已自然包含在原 session 中（recalcRecords 会处理）
      // 结束昨天那条 session
      initialWearSessions = initialWearSessions.map(s => {
        if (s.id === initialCurrentSessionId) {
          return { ...s, endTs: startOfToday, minutes: Math.floor((startOfToday - s.startTs) / 60000) };
        }
        return s;
      });
      // 新建今天从0点开始的 session
      const newSessionId = `cont-${Date.now()}`;
      initialWearSessions.push({
        id: newSessionId,
        date: today,
        startTs: startOfToday,
        endTs: null,
        minutes: 0,
        note: '隔夜佩戴'
      });
      initialCurrentSessionId = newSessionId;
      initialCurrentWearStartTime = startOfToday;
    }
  }
}

// 根据 sessions 重新计算 records（单一数据源）
let initialWearRecords = recalcRecordsFromSessions(initialWearSessions, persisted?.wearRecords || []);

[initialWearRecords] = getOrCreateRecord(initialWearRecords, getTodayStr());
const initialMessages = persisted?.messages || defaultMessages;
const initialPainRecords = persisted?.painRecords || defaultPainRecords;
const initialRubberBandRecords = ensureRubberBand(persisted?.rubberBandRecords || defaultRubberBandRecords, getTodayStr());
const initialOralPhotos = persisted?.oralPhotos || defaultOralPhotos;
const initialSettings = persisted?.settings || defaultSettings;

// ========== Store ==========
export const useTreatmentStore = create<TreatmentState>((set, get) => ({
  userInfo: defaultUserInfo,
  stages: treatmentStages,
  appointmentRecords,

  wearRecords: initialWearRecords,
  wearSessions: initialWearSessions,
  messages: initialMessages,
  painRecords: initialPainRecords,
  rubberBandRecords: initialRubberBandRecords,
  oralPhotos: initialOralPhotos,
  settings: initialSettings,
  isWearing: initialIsWearing,
  currentWearStartTime: initialCurrentWearStartTime,
  currentSessionId: initialCurrentSessionId,

  persist: () => {
    const state = get();
    const data: PersistedData = {
      wearRecords: state.wearRecords,
      wearSessions: state.wearSessions,
      messages: state.messages,
      painRecords: state.painRecords,
      rubberBandRecords: state.rubberBandRecords,
      oralPhotos: state.oralPhotos,
      settings: state.settings,
      isWearing: state.isWearing,
      currentWearStartTime: state.currentWearStartTime,
      currentSessionId: state.currentSessionId,
      lastRecordDate: getTodayStr(),
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
    if (minutes <= 0) return '刚刚';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}小时${m}分` : `${m}分钟`;
  },

  getTodayDuration: () => {
    const { wearRecords, getCurrentWearMinutes } = get();
    const today = getTodayStr();
    const todayRecord = wearRecords.find(r => r.date === today);
    const baseDuration = todayRecord?.duration || 0;
    return baseDuration + getCurrentWearMinutes();
  },

  settleCrossDay: () => {
    const { isWearing, currentWearStartTime, currentSessionId, wearSessions } = get();
    if (!isWearing || !currentWearStartTime || !currentSessionId) return;

    const startDay = getTodayStr(currentWearStartTime);
    const today = getTodayStr();
    if (startDay === today) return;

    const startOfToday = getStartOfDayTs(today);
    let newSessions = wearSessions.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, endTs: startOfToday, minutes: Math.max(0, Math.floor((startOfToday - s.startTs) / 60000)) };
      }
      return s;
    });

    const newSessionId = `cont-${Date.now()}`;
    newSessions.push({
      id: newSessionId,
      date: today,
      startTs: startOfToday,
      endTs: null,
      minutes: 0,
      note: '隔夜佩戴'
    });

    const newRecords = recalcRecordsFromSessions(newSessions, get().wearRecords);

    set({
      wearSessions: newSessions,
      wearRecords: newRecords,
      currentSessionId: newSessionId,
      currentWearStartTime: startOfToday
    });
    get().persist();
  },

  toggleWear: (note = '') => {
    const { isWearing, currentWearStartTime, currentSessionId, wearSessions, wearRecords } = get();
    const now = Date.now();

    if (isWearing && currentWearStartTime && currentSessionId) {
      // 取下
      const splits = splitDurationByDays(currentWearStartTime, now);
      if (splits.length === 0) return null;

      const newSessions = wearSessions.map(s => {
        if (s.id === currentSessionId) {
          const totalMins = Math.floor((now - s.startTs) / 60000);
          return { ...s, endTs: now, minutes: Math.max(0, totalMins) };
        }
        return s;
      });
      const newRecords = recalcRecordsFromSessions(newSessions, wearRecords);

      set({
        isWearing: false,
        currentWearStartTime: null,
        currentSessionId: null,
        wearSessions: newSessions,
        wearRecords: newRecords
      });
      get().persist();
      return { durations: splits };

    } else {
      // 戴上
      const today = getTodayStr();
      const newId = `sess-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      const newSessions = [...wearSessions, {
        id: newId,
        date: today,
        startTs: now,
        endTs: null,
        minutes: 0,
        note: note || undefined
      }];
      const newRecords = recalcRecordsFromSessions(newSessions, wearRecords);

      set({
        isWearing: true,
        currentWearStartTime: now,
        currentSessionId: newId,
        wearSessions: newSessions,
        wearRecords: newRecords
      });
      get().persist();
      return null;
    }
  },

  addRemoveRecord: (date: string) => {
    // 兼容：不加 session，只增加计数（这里更新 record，注意下次 recalc 会重算，所以直接写入 session 更稳妥）
    // 实现为：如果正在佩戴，先取下再戴上（产生一次取下记录）
    const { isWearing } = get();
    if (isWearing) {
      get().toggleWear('补记');
      setTimeout(() => get().toggleWear('补记'), 200);
    } else {
      // 未佩戴：直接插入一段假 session（1分钟）增加 removeCount
      const now = Date.now();
      get().addSession({
        date,
        startTs: now - 60000,
        endTs: now,
        note: '补记'
      });
    }
  },

  // ========== Session 明细操作 ==========
  getSessionsByDate: (date: string) => {
    const { wearSessions } = get();
    // 按日期取：不仅主日期是 date，跨天的 session 只要跨越了 date 也应该显示
    // 简化：以 startTs 的主日期分组
    return wearSessions
      .filter(s => s.date === date || (s.startTs >= getStartOfDayTs(date) && s.startTs < getStartOfDayTs(date) + 86400000))
      .sort((a, b) => a.startTs - b.startTs);
  },

  addSession: (session) => {
    const now = Date.now();
    const startTs = session.startTs;
    const endTs = session.endTs ?? null;
    const minutes = session.minutes ?? (endTs ? Math.max(0, Math.floor((endTs - startTs) / 60000)) : 0);
    const newSess: WearSession = {
      id: session.id || `manual-${now}-${Math.floor(Math.random()*10000)}`,
      date: getTodayStr(startTs),
      startTs,
      endTs,
      minutes,
      note: session.note
    };
    const newSessions = [...get().wearSessions, newSess];
    const newRecords = recalcRecordsFromSessions(newSessions, get().wearRecords);
    set({ wearSessions: newSessions, wearRecords: newRecords });
    get().persist();
  },

  updateSession: (id, patch) => {
    let newSessions = get().wearSessions.map(s => {
      if (s.id !== id) return s;
      const updated = { ...s, ...patch };
      // 重新计算 minutes
      if (updated.endTs) {
        updated.minutes = Math.max(0, Math.floor((updated.endTs - updated.startTs) / 60000));
      }
      // 更新主日期
      updated.date = getTodayStr(updated.startTs);
      return updated;
    });

    // 如果修改了正在进行的 session 的 startTs，要同步 currentWearStartTime
    const { currentSessionId } = get();
    let extra = {} as Partial<TreatmentState>;
    if (id === currentSessionId) {
      const updated = newSessions.find(s => s.id === id);
      if (updated) {
        extra.currentWearStartTime = updated.startTs;
      }
    }

    const newRecords = recalcRecordsFromSessions(newSessions, get().wearRecords);
    set({ wearSessions: newSessions, wearRecords: newRecords, ...extra });
    get().persist();
  },

  deleteSession: (id) => {
    const newSessions = get().wearSessions.filter(s => s.id !== id);
    let extra = {} as Partial<TreatmentState>;
    // 如果删除的是正在进行的 session
    if (id === get().currentSessionId) {
      extra.isWearing = false;
      extra.currentWearStartTime = null;
      extra.currentSessionId = null;
    }
    const newRecords = recalcRecordsFromSessions(newSessions, get().wearRecords);
    set({ wearSessions: newSessions, wearRecords: newRecords, ...extra });
    get().persist();
  },

  recalcRecords: () => {
    const newRecords = recalcRecordsFromSessions(get().wearSessions, get().wearRecords);
    set({ wearRecords: newRecords });
    get().persist();
  },

  // ========== 消息 ==========
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

  // ========== 记录 ==========
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

  // ========== 查询 ==========
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
      weekStart, weekEnd, totalDays: 7,
      completedDays,
      avgDuration: completedDays > 0 ? Math.floor(totalDuration / completedDays) : 0,
      continuousDays
    };
  },

  getLast7DaysTrend: () => {
    const { wearRecords } = get();
    const trend: Array<{ date: string; label: string; minutes: number; completed: boolean }> = [];
    for (let i = 6; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      const record = wearRecords.find(r => r.date === date);
      trend.push({
        date,
        label: i === 0 ? '今天' : dayjs().subtract(i, 'day').format('周dd').replace('周', '周').replace('星期日', '日').replace('星期', ''),
        minutes: record?.duration || 0,
        completed: record?.isCompleted || false
      });
    }
    return trend;
  },

  syncWithStorage: () => {
    get().settleCrossDay();
    set(state => {
      const today = getTodayStr();
      let [newWear, _] = getOrCreateRecord(state.wearRecords, today);
      const newRubber = ensureRubberBand(state.rubberBandRecords, today);
      if (newWear === state.wearRecords && newRubber === state.rubberBandRecords) return {};
      return {
        wearRecords: newWear,
        rubberBandRecords: newRubber
      };
    });
    get().persist();
  },

  // ========== 家属分享 ==========
  saveFamilyShareCode: (code: string) => {
    try { Taro.setStorageSync(FAMILY_SHARE_KEY, code); } catch (e) {}
  },

  getFamilyShareCode: () => {
    try {
      const code = Taro.getStorageSync(FAMILY_SHARE_KEY);
      return code || null;
    } catch (e) { return null; }
  }
}));
