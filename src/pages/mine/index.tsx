import React, { useState } from 'react';
import { View, Text, Image, Button, Input } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useTreatmentStore } from '@/store/useTreatmentStore';
import { getDaysBetween } from '@/utils/format';
import dayjs from 'dayjs';

const MinePage: React.FC = () => {
  const { 
    userInfo, 
    stages, 
    settings, 
    updateSettings, 
    getWeeklyReport,
    syncWithStorage
  } = useTreatmentStore();

  const [showTravelModal, setShowTravelModal] = useState(false);
  const [travelStart, setTravelStart] = useState(settings.travelStartDate || '');
  const [travelEnd, setTravelEnd] = useState(settings.travelEndDate || '');

  useDidShow(() => {
    syncWithStorage();
  });

  const totalDays = getDaysBetween(userInfo.startDate, dayjs().format('YYYY-MM-DD'));
  const completedStages = stages.filter(s => s.isCompleted).length;
  const weeklyReport = getWeeklyReport();

  const handleTravelModeToggle = () => {
    if (!settings.travelMode) {
      setTravelStart(dayjs().format('YYYY-MM-DD'));
      setTravelEnd(dayjs().add(7, 'day').format('YYYY-MM-DD'));
      setShowTravelModal(true);
    } else {
      updateSettings({ 
        travelMode: false,
        travelStartDate: undefined,
        travelEndDate: undefined
      });
      Taro.showToast({
        title: '出差模式已关闭',
        icon: 'none',
        duration: 1500
      });
    }
  };

  const handleConfirmTravel = () => {
    if (!travelStart || !travelEnd) {
      Taro.showToast({
        title: '请选择出发和返回日期',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    if (dayjs(travelEnd).isBefore(dayjs(travelStart))) {
      Taro.showToast({
        title: '返回日期不能早于出发日期',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    updateSettings({
      travelMode: true,
      travelStartDate: travelStart,
      travelEndDate: travelEnd
    });
    setShowTravelModal(false);
    Taro.showToast({
      title: '出差模式已开启',
      icon: 'success',
      duration: 1500
    });
  };

  const handleFamilyShare = () => {
    const shareCode = Math.random().toString(36).substring(2, 10).toUpperCase();
    const shareUrl = `orthodontic://family?code=${shareCode}`;
    
    Taro.setClipboardData({
      data: shareUrl,
      success: () => {
        Taro.showModal({
          title: '家属代看链接已复制',
          content: `链接已复制到剪贴板，发送给家属即可查看您的治疗进度。\n\n邀请码：${shareCode}\n\n家属可在小程序首页输入邀请码查看进度。`,
          confirmText: '好的',
          showCancel: false
        });
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

  const getTravelDays = () => {
    if (!settings.travelStartDate || !settings.travelEndDate) return 0;
    return dayjs(settings.travelEndDate).diff(dayjs(settings.travelStartDate), 'day') + 1;
  };

  const getTravelProgress = () => {
    if (!settings.travelMode || !settings.travelStartDate || !settings.travelEndDate) return 0;
    const total = dayjs(settings.travelEndDate).diff(dayjs(settings.travelStartDate), 'day') + 1;
    const passed = dayjs().diff(dayjs(settings.travelStartDate), 'day') + 1;
    return Math.min(100, Math.max(0, Math.round((passed / total) * 100)));
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

      {/* 出差模式提示 */}
      {settings.travelMode && (
        <View className={styles.menuSection}>
          <View className={styles.travelNoticeCard}>
            <View className={styles.travelNoticeHeader}>
              <Text className={styles.travelNoticeIcon}>✈️</Text>
              <View className={styles.travelNoticeInfo}>
                <Text className={styles.travelNoticeTitle}>出差旅行模式已开启</Text>
                <Text className={styles.travelNoticeDate}>
                  {dayjs(settings.travelStartDate).format('MM.DD')} - {dayjs(settings.travelEndDate).format('MM.DD')} · 共{getTravelDays()}天
                </Text>
              </View>
            </View>
            <View className={styles.travelProgressWrap}>
              <View className={styles.travelProgress}>
                <View className={styles.travelProgressBar} style={{ width: `${getTravelProgress()}%` }} />
              </View>
              <Text className={styles.travelProgressText}>行程已过 {getTravelProgress()}%</Text>
            </View>
            <Text className={styles.travelNoticeDesc}>
              📌 旅行期间：复诊/换牙套提醒会提前1天推送，佩戴提醒调整为每日早中晚3次，避免打扰您的行程
            </Text>
          </View>
        </View>
      )}

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
              <Text className={styles.menuDesc}>
                {settings.travelMode 
                  ? `${dayjs(settings.travelStartDate).format('MM月DD日')}出发，${dayjs(settings.travelEndDate).format('MM月DD日')}返回`
                  : '开启后将减少提醒频率，避免打扰'
                }
              </Text>
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

      {/* 出差模式设置弹窗 */}
      {showTravelModal && (
        <View className={styles.modalOverlay} onClick={() => setShowTravelModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>设置出差行程</Text>
            <Text className={styles.modalDesc}>设置出差日期后，我们将调整提醒策略，让您安心出行</Text>
            
            <View className={styles.datePickerRow}>
              <View className={styles.datePickerItem}>
                <Text className={styles.datePickerLabel}>出发日期</Text>
                <Input 
                  type='text'
                  className={styles.datePickerInput}
                  value={travelStart}
                  placeholder='选择出发日期'
                  onClick={() => {
                    Taro.showActionSheet({
                      itemList: ['今天出发', '明天出发', '后天出发', '选择日期'],
                      success: (res) => {
                        if (res.tapIndex === 0) setTravelStart(dayjs().format('YYYY-MM-DD'));
                        if (res.tapIndex === 1) setTravelStart(dayjs().add(1, 'day').format('YYYY-MM-DD'));
                        if (res.tapIndex === 2) setTravelStart(dayjs().add(2, 'day').format('YYYY-MM-DD'));
                      }
                    });
                  }}
                />
              </View>
              <View className={styles.datePickerItem}>
                <Text className={styles.datePickerLabel}>返回日期</Text>
                <Input 
                  type='text'
                  className={styles.datePickerInput}
                  value={travelEnd}
                  placeholder='选择返回日期'
                  onClick={() => {
                    Taro.showActionSheet({
                      itemList: ['3天后返回', '7天后返回', '14天后返回', '选择日期'],
                      success: (res) => {
                        if (res.tapIndex === 0) setTravelEnd(dayjs().add(3, 'day').format('YYYY-MM-DD'));
                        if (res.tapIndex === 1) setTravelEnd(dayjs().add(7, 'day').format('YYYY-MM-DD'));
                        if (res.tapIndex === 2) setTravelEnd(dayjs().add(14, 'day').format('YYYY-MM-DD'));
                      }
                    });
                  }}
                />
              </View>
            </View>

            <View className={styles.reminderInfo}>
              <Text className={styles.reminderInfoTitle}>📌 旅行期间提醒调整</Text>
              <View className={styles.reminderInfoList}>
                <Text className={styles.reminderInfoItem}>• 复诊/换牙套提醒：提前1天推送</Text>
                <Text className={styles.reminderInfoItem}>• 佩戴提醒：调整为每日早中晚3次</Text>
                <Text className={styles.reminderInfoItem}>• 夜间提醒：自动关闭，不打扰休息</Text>
              </View>
            </View>

            <View className={styles.modalButtons}>
              <Button className={styles.modalCancelBtn} onClick={() => setShowTravelModal(false)}>
                取消
              </Button>
              <Button className={styles.modalConfirmBtn} onClick={handleConfirmTravel}>
                开启出差模式
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default MinePage;
