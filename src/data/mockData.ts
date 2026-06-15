import type {
  TreatmentStage,
  WearRecord,
  Message,
  PainRecord,
  RubberBandRecord,
  AppointmentRecord,
  OralPhoto,
  UserInfo,
  WeeklyReport,
  Settings
} from '@/types';

import dayjs from 'dayjs';

export const userInfo: UserInfo = {
  name: '李明晓',
  avatar: 'https://picsum.photos/id/64/200/200',
  age: 28,
  treatmentType: '隐形正畸',
  doctor: '王医生',
  hospital: '口腔健康中心',
  startDate: '2025-09-15',
  totalDays: 540
};

export const treatmentStages: TreatmentStage[] = [
  {
    id: 1,
    name: '初始阶段',
    description: '适应牙套，建立佩戴习惯',
    startDate: '2025-09-15',
    endDate: '2025-12-15',
    isCurrent: false,
    isCompleted: true,
    progress: 100
  },
  {
    id: 2,
    name: '排齐阶段',
    description: '牙齿逐渐排列整齐',
    startDate: '2025-12-16',
    endDate: '2026-06-15',
    isCurrent: true,
    isCompleted: false,
    progress: 75
  },
  {
    id: 3,
    name: '调整阶段',
    description: '精细调整咬合关系',
    startDate: '2026-06-16',
    endDate: '2026-12-15',
    isCurrent: false,
    isCompleted: false,
    progress: 0
  },
  {
    id: 4,
    name: '保持阶段',
    description: '佩戴保持器，巩固效果',
    startDate: '2026-12-16',
    endDate: '2027-03-15',
    isCurrent: false,
    isCompleted: false,
    progress: 0
  }
];

export const generateWearRecords = (): WearRecord[] => {
  const records: WearRecord[] = [];
  const today = dayjs();
  
  for (let i = 13; i >= 0; i--) {
    const date = today.subtract(i, 'day');
    const isCompleted = i > 0 || (i === 0 && Math.random() > 0.3);
    const duration = isCompleted 
      ? Math.floor(Math.random() * 60) + 1320 
      : Math.floor(Math.random() * 600) + 200;
    
    records.push({
      date: date.format('YYYY-MM-DD'),
      duration,
      wearCount: isCompleted ? 1 : 0,
      removeCount: Math.floor(Math.random() * 5) + 2,
      isCompleted: duration >= 1320
    });
  }
  
  return records;
};

export const messages: Message[] = [
  {
    id: 1,
    type: 'appointment',
    title: '复诊提醒',
    content: '您的下次复诊时间为 6月20日 上午10:00，请准时到达。',
    time: dayjs().subtract(2, 'hour').format('YYYY-MM-DD HH:mm'),
    isRead: false
  },
  {
    id: 2,
    type: 'aligner',
    title: '换牙套提醒',
    content: '您已佩戴第12副牙套7天，明天请更换第13副牙套。',
    time: dayjs().subtract(1, 'day').format('YYYY-MM-DD HH:mm'),
    isRead: false
  },
  {
    id: 3,
    type: 'doctor',
    title: '医生留言',
    content: '王医生：最近佩戴情况很好，继续保持！注意餐后清洁。',
    time: dayjs().subtract(2, 'day').format('YYYY-MM-DD HH:mm'),
    isRead: true
  },
  {
    id: 4,
    type: 'system',
    title: '佩戴时长提醒',
    content: '今日佩戴时长不足22小时，请记得补戴哦~',
    time: dayjs().subtract(3, 'day').format('YYYY-MM-DD HH:mm'),
    isRead: true
  },
  {
    id: 5,
    type: 'appointment',
    title: '复诊预约成功',
    content: '您已成功预约 6月20日 上午10:00 的复诊。',
    time: dayjs().subtract(5, 'day').format('YYYY-MM-DD HH:mm'),
    isRead: true
  }
];

export const painRecords: PainRecord[] = [
  {
    date: dayjs().format('YYYY-MM-DD'),
    level: 2,
    positions: ['上排门牙'],
    note: '换牙套后轻微酸胀'
  },
  {
    date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'),
    level: 3,
    positions: ['上排门牙', '下排左侧'],
    note: '下午有点疼'
  },
  {
    date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'),
    level: 1,
    positions: ['下排右侧'],
    note: ''
  },
  {
    date: dayjs().subtract(3, 'day').format('YYYY-MM-DD'),
    level: 2,
    positions: ['上排门牙'],
    note: ''
  },
  {
    date: dayjs().subtract(4, 'day').format('YYYY-MM-DD'),
    level: 1,
    positions: [],
    note: '基本不疼'
  },
  {
    date: dayjs().subtract(5, 'day').format('YYYY-MM-DD'),
    level: 4,
    positions: ['上排门牙', '下排门牙'],
    note: '刚换牙套比较疼'
  },
  {
    date: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
    level: 3,
    positions: ['上排门牙'],
    note: ''
  }
];

export const rubberBandRecords: RubberBandRecord[] = [
  { date: dayjs().format('YYYY-MM-DD'), times: 2, totalTimes: 3, isCompleted: false },
  { date: dayjs().subtract(1, 'day').format('YYYY-MM-DD'), times: 3, totalTimes: 3, isCompleted: true },
  { date: dayjs().subtract(2, 'day').format('YYYY-MM-DD'), times: 3, totalTimes: 3, isCompleted: true },
  { date: dayjs().subtract(3, 'day').format('YYYY-MM-DD'), times: 2, totalTimes: 3, isCompleted: false },
  { date: dayjs().subtract(4, 'day').format('YYYY-MM-DD'), times: 3, totalTimes: 3, isCompleted: true },
  { date: dayjs().subtract(5, 'day').format('YYYY-MM-DD'), times: 3, totalTimes: 3, isCompleted: true },
  { date: dayjs().subtract(6, 'day').format('YYYY-MM-DD'), times: 1, totalTimes: 3, isCompleted: false }
];

export const appointmentRecords: AppointmentRecord[] = [
  {
    id: 1,
    date: '2026-03-15',
    doctor: '王医生',
    conclusion: '牙齿排齐进度良好，咬合关系正常',
    notes: [
      '继续保持每天22小时以上佩戴',
      '注意餐后及时刷牙清洁',
      '橡皮筋每天佩戴3次，每次30分钟'
    ],
    nextAppointment: '2026-06-20'
  },
  {
    id: 2,
    date: '2025-12-15',
    doctor: '王医生',
    conclusion: '初始阶段完成，进入排齐阶段',
    notes: [
      '适应情况良好，无明显不适',
      '开始第5副牙套',
      '每两周更换一副牙套'
    ],
    nextAppointment: '2026-03-15'
  },
  {
    id: 3,
    date: '2025-09-15',
    doctor: '王医生',
    conclusion: '初诊检查，制定治疗方案',
    notes: [
      '诊断：牙齿拥挤，轻度前突',
      '方案：隐形正畸，预计18个月',
      '注意口腔卫生，定期复诊'
    ],
    nextAppointment: '2025-12-15'
  }
];

export const oralPhotos: OralPhoto[] = [
  { id: 1, url: 'https://picsum.photos/id/1/300/300', date: '2026-06-10', type: '正面' },
  { id: 2, url: 'https://picsum.photos/id/2/300/300', date: '2026-06-10', type: '侧面' },
  { id: 3, url: 'https://picsum.photos/id/3/300/300', date: '2026-06-10', type: '咬合' },
  { id: 4, url: 'https://picsum.photos/id/6/300/300', date: '2026-05-15', type: '正面' },
  { id: 5, url: 'https://picsum.photos/id/8/300/300', date: '2026-05-15', type: '侧面' },
  { id: 6, url: 'https://picsum.photos/id/9/300/300', date: '2026-04-10', type: '正面' }
];

export const weeklyReport: WeeklyReport = {
  weekStart: dayjs().subtract(6, 'day').format('YYYY-MM-DD'),
  weekEnd: dayjs().format('YYYY-MM-DD'),
  totalDays: 7,
  completedDays: 5,
  avgDuration: 1280,
  continuousDays: 12
};

export const defaultSettings: Settings = {
  travelMode: false,
  reminderEnabled: true,
  reminderTime: '21:00',
  familyMode: false
};

export const doctorNotes = [
  '每天佩戴牙套不少于22小时',
  '餐后必须刷牙并清洁牙套',
  '避免食用过硬、过黏的食物',
  '每两周更换一副牙套',
  '如有严重不适请及时联系医生',
  '橡皮筋每天佩戴3次，每次30分钟'
];
