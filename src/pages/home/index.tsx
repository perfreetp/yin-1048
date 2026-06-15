import React, { useMemo } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { useTreatmentStore } from '@/store/useTreatmentStore';
import { formatDuration, getDaysBetween, getProgressPercent } from '@/utils/format';
import dayjs from 'dayjs';

const HomePage: React.FC = () => {
  const { 
    userInfo, 
    stages, 
    wearRecords, 
    isWearing, 
    toggleWear,
    appointmentRecords,
    weeklyReport
  } = useTreatmentStore();

  const currentStage = useMemo(() => stages.find(s => s.isCurrent), [stages]);
  
  const todayRecord = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    return wearRecords.find(r => r.date === today);
  }, [wearRecords]);

  const todayDuration = todayRecord?.duration || 0;
  const targetDuration = 1320;

  const nextAppointment = useMemo(() => {
    const latest = appointmentRecords[0];
    return latest?.nextAppointment;
  }, [appointmentRecords]);

  const daysToAppointment = useMemo(() => {
    if (!nextAppointment) return 0;
    return getDaysBetween(dayjs().format('YYYY-MM-DD'), nextAppointment);
  }, [nextAppointment]);

  const overallProgress = useMemo(() => {
    const startDate = stages[0]?.startDate;
    const endDate = stages[stages.length - 1]?.endDate;
    if (!startDate || !endDate) return 0;
    return getProgressPercent(startDate, endDate);
  }, [stages]);

  const handleToggleWear = () => {
    toggleWear();
    Taro.showToast({
      title: isWearing ? '已取下牙套' : '开始佩戴计时',
      icon: 'none',
      duration: 1500
    });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 6) return '夜深了';
    if (hour < 12) return '早上好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.greeting}>{getGreeting()}，{userInfo.name}</Text>
        <Text className={styles.subGreeting}>今天是正畸第 {getDaysBetween(userInfo.startDate, dayjs().format('YYYY-MM-DD'))} 天</Text>
      </View>

      <View className={styles.progressSection}>
        <View className={styles.progressCard}>
          <View className={styles.progressHeader}>
            <Text className={styles.stageName}>{currentStage?.name || '治疗中'}</Text>
            <Text className={styles.stageTag}>进行中</Text>
          </View>
          <View className={styles.progressBarWrap}>
            <View 
              className={styles.progressBar} 
              style={{ width: `${overallProgress}%` }}
            />
          </View>
          <View className={styles.progressInfo}>
            <Text>整体进度</Text>
            <Text className={styles.progressPercent}>{overallProgress}%</Text>
          </View>
        </View>
      </View>

      <View className={styles.statsRow}>
        <View className={styles.statCard}>
          <Text className={styles.statValue}>{weeklyReport.continuousDays}</Text>
          <Text className={styles.statLabel}>连续打卡</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statValue}>{stages.filter(s => s.isCompleted).length}/{stages.length}</Text>
          <Text className={styles.statLabel}>完成阶段</Text>
        </View>
        <View className={styles.statCard}>
          <Text className={styles.statValue}>{Math.floor(userInfo.totalDays * overallProgress / 100)}</Text>
          <Text className={styles.statLabel}>已戴天数</Text>
        </View>
      </View>

      <View className={styles.todaySection}>
        <Text className={styles.sectionTitle}>今日佩戴</Text>
        <View className={styles.todayCard}>
          <View className={styles.todayInfo}>
            <Text className={styles.todayLabel}>今日已佩戴</Text>
            <Text className={styles.todayDuration}>{formatDuration(todayDuration)}</Text>
            <Text className={styles.todayTarget}>目标 {formatDuration(targetDuration)} · {Math.round(todayDuration / targetDuration * 100)}%</Text>
          </View>
          <Button 
            className={`${styles.wearButton} ${!isWearing ? styles.wearButtonOff : ''}`}
            onClick={handleToggleWear}
          >
            {isWearing ? '取下' : '戴上'}
          </Button>
        </View>
      </View>

      {nextAppointment && (
        <View className={styles.nextAppointment}>
          <Text className={styles.sectionTitle}>下次复诊</Text>
          <View className={styles.appointmentCard}>
            <View className={styles.appointmentIcon}>📅</View>
            <View className={styles.appointmentInfo}>
              <Text className={styles.appointmentTitle}>王医生 · 口腔健康中心</Text>
              <Text className={styles.appointmentDate}>{dayjs(nextAppointment).format('MM月DD日 dddd')} 上午10:00</Text>
            </View>
            <View className={styles.appointmentDays}>{daysToAppointment}天</View>
          </View>
        </View>
      )}

      <View className={styles.notesSection}>
        <Text className={styles.notesTitle}>💡 医生提醒</Text>
        <View className={styles.notesCard}>
          <View className={styles.notesList}>
            <Text className={styles.noteItem}>每天佩戴牙套不少于22小时</Text>
            <Text className={styles.noteItem}>餐后必须刷牙并清洁牙套</Text>
            <Text className={styles.noteItem}>橡皮筋每天佩戴3次，每次30分钟</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default HomePage;
