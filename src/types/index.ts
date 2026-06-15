// 治疗阶段
export interface TreatmentStage {
  id: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  isCompleted: boolean;
  progress: number;
}

// 佩戴记录
export interface WearRecord {
  date: string;
  duration: number;
  wearCount: number;
  removeCount: number;
  isCompleted: boolean;
}

// 消息类型
export type MessageType = 'appointment' | 'aligner' | 'doctor' | 'system';

// 消息
export interface Message {
  id: number;
  type: MessageType;
  title: string;
  content: string;
  time: string;
  isRead: boolean;
}

// 疼痛记录
export interface PainRecord {
  date: string;
  level: number;
  positions: string[];
  note?: string;
}

// 橡皮筋记录
export interface RubberBandRecord {
  date: string;
  times: number;
  totalTimes: number;
  isCompleted: boolean;
}

// 复诊记录
export interface AppointmentRecord {
  id: number;
  date: string;
  doctor: string;
  conclusion: string;
  notes: string[];
  nextAppointment?: string;
}

// 口腔照片
export interface OralPhoto {
  id: number;
  url: string;
  date: string;
  type: string;
}

// 用户信息
export interface UserInfo {
  name: string;
  avatar: string;
  age: number;
  treatmentType: string;
  doctor: string;
  hospital: string;
  startDate: string;
  totalDays: number;
}

// 打卡周报
export interface WeeklyReport {
  weekStart: string;
  weekEnd: string;
  totalDays: number;
  completedDays: number;
  avgDuration: number;
  continuousDays: number;
}

// 设置
export interface Settings {
  travelMode: boolean;
  travelStartDate?: string;
  travelEndDate?: string;
  reminderEnabled: boolean;
  reminderTime: string;
  familyMode: boolean;
}
