import dayjs from 'dayjs';

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}小时${mins > 0 ? ` ${mins}分钟` : ''}`;
  }
  return `${mins}分钟`;
};

export const formatDate = (date: string, format = 'YYYY-MM-DD'): string => {
  return dayjs(date).format(format);
};

export const formatRelativeDate = (date: string): string => {
  const now = dayjs();
  const target = dayjs(date);
  const diffDays = now.diff(target, 'day');
  
  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}周前`;
  return target.format('MM月DD日');
};

export const getDaysBetween = (start: string, end: string): number => {
  return dayjs(end).diff(dayjs(start), 'day');
};

export const getProgressPercent = (start: string, end: string): number => {
  const total = dayjs(end).diff(dayjs(start), 'day');
  const passed = dayjs().diff(dayjs(start), 'day');
  if (total <= 0) return 0;
  const percent = Math.round((passed / total) * 100);
  return Math.min(100, Math.max(0, percent));
};

export const getDayOfWeek = (date: string): string => {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[dayjs(date).day()];
};

export const generateWeekDays = (): Array<{ date: string; day: string; isToday: boolean }> => {
  const days = [];
  const today = dayjs();
  
  for (let i = 6; i >= 0; i--) {
    const date = today.subtract(i, 'day');
    days.push({
      date: date.format('YYYY-MM-DD'),
      day: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.day()],
      isToday: i === 0
    });
  }
  return days;
};
