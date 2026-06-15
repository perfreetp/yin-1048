import React from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import styles from './index.module.scss';
import { useTreatmentStore } from '@/store/useTreatmentStore';
import { getDaysBetween } from '@/utils/format';
import dayjs from 'dayjs';

const MinePage: React.FC = () => {
  const { userInfo, stages, settings, updateSettings, weeklyReport } = useTreatmentStore();

  const totalDays = getDaysBetween(userInfo.startDate, dayjs().format('YYYY-MM-DD'));
  const completedStages = stages.filter(s => s.isCompleted).length;

  const handleTravelModeToggle = () => {
    const newValue = !settings.travelMode;
    updateSettings({ travelMode: newValue });
    Taro.showToast({
      title: newValue ? '出差模式已开启' : '出差模式已关闭',
      icon: 'none',
      duration: 1500
    });
  };

  const handleFamilyShare = () => {
    Taro.showModal({
      title: '家属代看',
      content: '生成分享链接，让家属随时查看您的治疗进度。',
      confirmText: '生成链接',
      success: (res) => {
        if (res.confirm) {
          Taro.showToast({
            title: '链接已复制',
            icon: 'success',
            duration: 1500
          });
        }
      }
    });
  };

  const handleReminderSetting = () => {
    Taro.showToast({
      title: '提醒设置功能开发中',
      icon: 'none',
      duration: 1500
    });
  };

  const handleTreatmentPlan = () => {
    Taro.showToast({
      title: '治疗方案详情开发中',
      icon: 'none',
      duration: 1500
    });
  };

  const handleDoctorContact = () => {
    Taro.showToast({
      title: '联系医生功能开发中',
      icon: 'none',
      duration: 1500
    });
  };

  const handleAbout = () => {
    Taro.showToast({
      title: '关于我们开发中',
      icon: 'none',
      duration: 1500
    });
  };

  return (
    <View className={styles.page}>
      {/* 头部 */}
      <View className={styles.profileHeader}>
        <View className={styles.profileCard}>
          <Image className={styles.avatar} src={userInfo.avatar} mode='aspectFill' />
          <View className={styles.profileInfo}>
            <Text className={styles.userName}>{userInfo.name}</Text>
            <Text className={styles.userDesc}>{userInfo.age}岁 · {userInfo.treatmentType}</Text>
            <View className={styles.treatmentBadge}>
              <Text>🦷 正畸中</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 治疗概览 */}
      <View className={styles.overviewSection}>
        <View className={styles.overviewCard}>
          <Text className={styles.overviewTitle}>治疗概览</Text>
          <View className={styles.overviewGrid}>
            <View className={styles.overviewItem}>
              <Text className={styles.overviewValue}>{totalDays}</Text>
              <Text className={styles.overviewLabel}>已戴天数</Text>
            </View>
            <View className={styles.overviewItem}>
              <Text className={styles.overviewValue}>{completedStages}/{stages.length}</Text>
              <Text className={styles.overviewLabel}>完成阶段</Text>
            </View>
            <View className={styles.overviewItem}>
              <Text className={styles.overviewValue}>{weeklyReport.continuousDays}</Text>
              <Text className={styles.overviewLabel}>连续打卡</Text>
            </View>
          </View>
        </View>
      </View>

      {/* 功能列表 */}
      <View className={styles.menuSection}>
        <View className={styles.menuCard}>
          <View className={styles.menuItem} onClick={handleTreatmentPlan}>
            <View className={`${styles.menuIcon} ${styles.iconPurple}`}>📋</View>
            <View className={styles.menuContent}>
              <Text className={styles.menuTitle}>治疗方案</Text>
              <Text className={styles.menuDesc}>{userInfo.doctor} · {userInfo.hospital}</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>

          <View className={styles.menuItem} onClick={handleTravelModeToggle}>
            <View className={`${styles.menuIcon} ${styles.iconOrange}`}>✈️</View>
            <View className={styles.menuContent}>
              <Text className={styles.menuTitle}>出差旅行模式</Text>
              <Text className={styles.menuDesc}>开启后将减少提醒频率，避免打扰</Text>
            </View>
            <View className={styles.switchWrap} onClick={(e) => { e.stopPropagation(); handleTravelModeToggle(); }}>
              <View className={`${styles.switch} ${settings.travelMode ? styles.switchOn : ''}`}>
                <View className={styles.switchDot} />
              </View>
            </View>
          </View>

          <View className={styles.menuItem} onClick={handleReminderSetting}>
            <View className={`${styles.menuIcon} ${styles.iconGreen}`}>⏰</View>
            <View className={styles.menuContent}>
              <Text className={styles.menuTitle}>提醒设置</Text>
              <Text className={styles.menuDesc}>佩戴提醒 · 复诊提醒 · 换牙套提醒</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>
        </View>
      </View>

      {/* 家属代看 */}
      <View className={styles.menuSection}>
        <View className={styles.menuCard}>
          <View className={styles.menuItem} onClick={handleFamilyShare}>
            <View className={`${styles.menuIcon} ${styles.iconBlue}`}>👨‍👩‍👧</View>
            <View className={styles.menuContent}>
              <Text className={styles.menuTitle}>家属代看</Text>
              <Text className={styles.menuDesc}>让家人随时了解您的治疗进度</Text>
            </View>
            <Button className={styles.familyBtn} onClick={(e) => { e.stopPropagation(); handleFamilyShare(); }}>
              分享
            </Button>
          </View>
        </View>
      </View>

      {/* 其他 */}
      <View className={styles.menuSection}>
        <View className={styles.menuCard}>
          <View className={styles.menuItem} onClick={handleDoctorContact}>
            <View className={`${styles.menuIcon} ${styles.iconPurple}`}>💬</View>
            <View className={styles.menuContent}>
              <Text className={styles.menuTitle}>联系医生</Text>
              <Text className={styles.menuDesc}>有问题随时咨询您的主治医生</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>

          <View className={styles.menuItem} onClick={handleAbout}>
            <View className={`${styles.menuIcon} ${styles.iconGray}`}>ℹ️</View>
            <View className={styles.menuContent}>
              <Text className={styles.menuTitle}>关于我们</Text>
              <Text className={styles.menuDesc}>正畸管家 · 陪伴每一颗牙齿的蜕变</Text>
            </View>
            <Text className={styles.menuArrow}>›</Text>
          </View>
        </View>
      </View>

      {/* 底部 */}
      <View className={styles.bottomSection}>
        <Text className={styles.versionText}>正畸管家 v1.0.0</Text>
      </View>
    </View>
  );
};

export default MinePage;
