import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useTreatmentStore } from '@/store/useTreatmentStore';
import { formatDuration, generateWeekDays } from '@/utils/format';
import dayjs from 'dayjs';

const CheckinPage: React.FC = () => {
  const { 
    wearRecords, 
    isWearing, 
    toggleWear, 
    addRemoveRecord,
    getTodayDuration,
    getWeeklyReport,
    syncWithStorage
  } = useTreatmentStore();

  const [tick, setTick] = useState(0);

  useDidShow(() => {
    syncWithStorage();
    setTick(prev => prev + 1);
  });

  useEffect(() => {
    if (!isWearing) return;
    const timer = setInterval(() => {
      setTick(prev => prev + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, [isWearing]);

  const todayDuration = useMemo(() => getTodayDuration(), [getTodayDuration, tick]);
  const targetDuration = 1320;
  const weeklyReport = useMemo(() => getWeeklyReport(), [getWeeklyReport, tick]);

  const weekDays = useMemo(() => generateWeekDays(), []);

  const getDayStatus = (date: string) => {
    const record = wearRecords.find(r => r.date === date);
    return record?.isCompleted || false;
  };

  const handleToggleWear = () => {
    toggleWear();
    setTick(prev => prev + 1);
    Taro.showToast({
      title: isWearing ? '已结束计时' : '开始佩戴计时',
      icon: 'none',
      duration: 1500
    });
  };

  const handleQuickRemove = (type: string) => {
    const today = dayjs().format('YYYY-MM-DD');
    addRemoveRecord(today);
    Taro.showToast({
      title: `已记录${type}摘戴`,
      icon: 'success',
      duration: 1500
    });
  };

  const formatTimeDisplay = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.floor(minutes % 60);
    return { hours, mins };
  };

  const { hours, mins } = formatTimeDisplay(todayDuration);

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>今日打卡</Text>
        <Text className={styles.headerSub}>{dayjs().format('YYYY年MM月DD日 dddd')}</Text>
      </View>

      <View className={styles.statusSection}>
        <View className={styles.statusCard}>
          <Text className={styles.statusLabel}>今日已佩戴</Text>
          <View className={styles.statusTime}>
            {hours}<Text className={styles.statusUnit}>小时</Text> {mins.toString().padStart(2, '0')}<Text className={styles.statusUnit}>分钟</Text>
          </View>
          <Text className={styles.statusProgress}>
            目标 {formatDuration(targetDuration)} · 已完成 {Math.min(100, Math.round(todayDuration / targetDuration * 100))}%
          </Text>
          
          <View className={`${styles.wearStatus} ${isWearing ? styles.wearing : styles.notWearing}`}>
            <View className={styles.statusDot} />
            <Text>{isWearing ? '正在佩戴中' : '已取下牙套'}</Text>
          </View>

          <Button 
            className={`${styles.bigButton} ${!isWearing ? styles.bigButtonOff : ''}`}
            onClick={handleToggleWear}
          >
            {isWearing ? '取下牙套' : '戴上牙套'}
          </Button>
        </View>
      </View>

      <View className={styles.quickActions}>
        <Text className={styles.quickTitle}>快速记录</Text>
        <View className={styles.actionGrid}>
          <View className={styles.actionCard} onClick={() => handleQuickRemove('餐后')}>
            <View className={styles.actionIcon}>🍽️</View>
            <Text className={styles.actionText}>餐后摘戴</Text>
          </View>
          <View className={styles.actionCard} onClick={() => handleQuickRemove('清洁')}>
            <View className={styles.actionIcon}>🪥</View>
            <Text className={styles.actionText}>清洁摘戴</Text>
          </View>
          <View className={styles.actionCard} onClick={() => handleQuickRemove('其他')}>
            <View className={styles.actionIcon}>➕</View>
            <Text className={styles.actionText}>其他补记</Text>
          </View>
        </View>
      </View>

      <View className={styles.calendarSection}>
        <View className={styles.calendarTitle}>
          <Text>本周打卡</Text>
          <Text className={styles.streakText}>🔥 连续 {weeklyReport.continuousDays} 天</Text>
        </View>
        <View className={styles.calendarCard}>
          <View className={styles.weekDays}>
            {weekDays.map((day) => (
              <Text key={day.date} className={styles.weekDayLabel}>{day.day}</Text>
            ))}
          </View>
          <View className={styles.daysRow}>
            {weekDays.map((day) => {
              const isCompleted = getDayStatus(day.date);
              return (
                <View 
                  key={day.date} 
                  className={`${styles.dayItem} ${isCompleted ? styles.dayCompleted : ''} ${day.isToday ? styles.dayToday : ''}`}
                >
                  <Text className={styles.dayNumber}>{dayjs(day.date).format('DD')}</Text>
                  {isCompleted && <Text className={styles.dayCheck}>✓</Text>}
                </View>
              );
            })}
          </View>
        </View>
      </View>

      <View className={styles.weekReportSection}>
        <View className={styles.reportCard}>
          <View className={styles.reportHeader}>
            <Text className={styles.reportTitle}>本周周报</Text>
            <Text className={styles.reportDate}>
              {dayjs(weeklyReport.weekStart).format('MM.DD')} - {dayjs(weeklyReport.weekEnd).format('MM.DD')}
            </Text>
          </View>
          <View className={styles.reportStats}>
            <View className={styles.reportStat}>
              <Text className={styles.reportStatValue}>{weeklyReport.completedDays}/{weeklyReport.totalDays}</Text>
              <Text className={styles.reportStatLabel}>完成天数</Text>
            </View>
            <View className={styles.reportStat}>
              <Text className={styles.reportStatValue}>{formatDuration(weeklyReport.avgDuration)}</Text>
              <Text className={styles.reportStatLabel}>平均时长</Text>
            </View>
            <View className={styles.reportStat}>
              <Text className={styles.reportStatValue}>{weeklyReport.continuousDays}</Text>
              <Text className={styles.reportStatLabel}>连续打卡</Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

export default CheckinPage;
