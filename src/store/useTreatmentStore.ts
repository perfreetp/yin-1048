import { create } from 'zustand';
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
  userInfo,
  treatmentStages,
  generateWearRecords,
  messages,
  painRecords,
  rubberBandRecords,
  appointmentRecords,
  oralPhotos,
  weeklyReport,
  defaultSettings
} from '@/data/mockData';

interface TreatmentState {
  userInfo: UserInfo;
  stages: TreatmentStage[];
  wearRecords: WearRecord[];
  messages: Message[];
  painRecords: PainRecord[];
  rubberBandRecords: RubberBandRecord[];
  appointmentRecords: AppointmentRecord[];
  oralPhotos: OralPhoto[];
  weeklyReport: WeeklyReport;
  settings: Settings;
  isWearing: boolean;
  todayWearStartTime: number | null;
  
  toggleWear: () => void;
  addWearRecord: (date: string, duration: number) => void;
  addRemoveRecord: (date: string) => void;
  markMessageRead: (id: number) => void;
  addPainRecord: (record: PainRecord) => void;
  addRubberBandRecord: (date: string) => void;
  addOralPhoto: (photo: OralPhoto) => void;
  updateSettings: (settings: Partial<Settings>) => void;
  getTodayRecord: () => WearRecord | undefined;
  getUnreadMessageCount: () => number;
}

export const useTreatmentStore = create<TreatmentState>((set, get) => ({
  userInfo,
  stages: treatmentStages,
  wearRecords: generateWearRecords(),
  messages,
  painRecords,
  rubberBandRecords,
  appointmentRecords,
  oralPhotos,
  weeklyReport,
  settings: defaultSettings,
  isWearing: true,
  todayWearStartTime: Date.now() - 3600000,

  toggleWear: () => {
    const { isWearing, todayWearStartTime } = get();
    if (isWearing && todayWearStartTime) {
      const duration = Math.floor((Date.now() - todayWearStartTime) / 60000);
      const today = new Date().toISOString().split('T')[0];
      set((state) => ({
        isWearing: false,
        todayWearStartTime: null,
        wearRecords: state.wearRecords.map((record) =>
          record.date === today
            ? { ...record, duration: record.duration + duration }
            : record
        )
      }));
    } else {
      set({ isWearing: true, todayWearStartTime: Date.now() });
    }
  },

  addWearRecord: (date: string, duration: number) => {
    set((state) => ({
      wearRecords: state.wearRecords.map((record) =>
        record.date === date
          ? { ...record, duration: record.duration + duration, wearCount: record.wearCount + 1 }
          : record
      )
    }));
  },

  addRemoveRecord: (date: string) => {
    set((state) => ({
      wearRecords: state.wearRecords.map((record) =>
        record.date === date
          ? { ...record, removeCount: record.removeCount + 1 }
          : record
      )
    }));
  },

  markMessageRead: (id: number) => {
    set((state) => ({
      messages: state.messages.map((msg) =>
        msg.id === id ? { ...msg, isRead: true } : msg
      )
    }));
  },

  addPainRecord: (record: PainRecord) => {
    set((state) => ({
      painRecords: [record, ...state.painRecords]
    }));
  },

  addRubberBandRecord: (date: string) => {
    set((state) => ({
      rubberBandRecords: state.rubberBandRecords.map((record) =>
        record.date === date && record.times < record.totalTimes
          ? { ...record, times: record.times + 1, isCompleted: record.times + 1 >= record.totalTimes }
          : record
      )
    }));
  },

  addOralPhoto: (photo: OralPhoto) => {
    set((state) => ({
      oralPhotos: [photo, ...state.oralPhotos]
    }));
  },

  updateSettings: (settings: Partial<Settings>) => {
    set((state) => ({
      settings: { ...state.settings, ...settings }
    }));
  },

  getTodayRecord: () => {
    const { wearRecords } = get();
    const today = new Date().toISOString().split('T')[0];
    return wearRecords.find((record) => record.date === today);
  },

  getUnreadMessageCount: () => {
    const { messages } = get();
    return messages.filter((msg) => !msg.isRead).length;
  }
}));
