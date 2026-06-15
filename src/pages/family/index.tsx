import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Button, Image, Input } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useTreatmentStore } from '@/store/useTreatmentStore';
import { formatDuration, getDaysBetween, getProgressPercent } from '@/utils/format';
import dayjs from 'dayjs';

const FAMILY_ACCESS_KEY = 'orthodontic_family_access';
const FAMILY_CODE_KEY = 'orthodontic_family_code';
const FAMILY_VERIFIED_KEY = 'orthodontic_family_verified';

const FamilyPage: React.FC = () => {
  const {
    userInfo,
    stages,
    appointmentRecords,
    getTodayDuration,
    getWeeklyReport,
    getUnreadMessageCount,
    getFamilyShareCode
  } = useTreatmentStore();

  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [tick, setTick] = useState(0);
  const [isPreview, setIsPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const urlCode = router.params?.code;
    const isPreviewMode = router.params?.preview === '1';
    
    if (isPreviewMode) {
      setIsPreview(true);
    }

    const savedAccess = Taro.getStorageSync(FAMILY_ACCESS_KEY);
    const savedCode = Taro.getStorageSync(FAMILY_CODE_KEY);
    const savedVerified = Taro.getStorageSync(FAMILY_VERIFIED_KEY);

    if (urlCode) {
      setInviteCode(urlCode.toUpperCase());
      setTimeout(() => {
        validateAndAccess(urlCode.toUpperCase(), true);
      }, 200);
    } else if (savedAccess && savedCode && savedVerified) {
      const valid = validateCode(savedCode);
      if (valid) {
        setHasAccess(true);
        setIsVerified(true);
        setInviteCode(savedCode);
      } else {
        Taro.removeStorageSync(FAMILY_ACCESS_KEY);
        Taro.removeStorageSync(FAMILY_CODE_KEY);
        Taro.removeStorageSync(FAMILY_VERIFIED_KEY);
      }
    }
    setTick(prev => prev + 1);
  }, [router.params]);

  useDidShow(() => {
    setTick(prev => prev + 1);
  });

  const validateCode = (code: string): boolean => {
    if (!code || code.length < 6) return false;
    const storedCode = getFamilyShareCode();
    if (!storedCode) return code === 'TEST1234';
    return storedCode.toUpperCase() === code.toUpperCase();
  };

  const validateAndAccess = (code: string, autoMode: boolean = false) => {
    setErrorMsg('');
    if (!code || code.length < 6) {
      if (!autoMode) {
        setErrorMsg('请输入完整的邀请码');
        Taro.showToast({
          title: '请输入完整的邀请码',
          icon: 'none',
          duration: 1500
        });
      }
      return;
    }

    const isValid = validateCode(code);
    
    if (!isValid) {
      setErrorMsg('邀请码不正确，请检查后重试');
      Taro.showToast({
        title: '邀请码不正确',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    Taro.setStorageSync(FAMILY_ACCESS_KEY, true);
    Taro.setStorageSync(FAMILY_CODE_KEY, code.toUpperCase());
    Taro.setStorageSync(FAMILY_VERIFIED_KEY, true);
    setHasAccess(true);
    setIsVerified(true);
    setInviteCode(code.toUpperCase());
    
    if (!autoMode) {
      Taro.showToast({
        title: '验证成功',
        icon: 'success',
        duration: 1500
      });
    }
  };

  const currentStage = useMemo(() => stages.find(s => s.isCurrent), [stages]);
  
  const todayDuration = useMemo(() => getTodayDuration(), [getTodayDuration, tick]);
  const targetDuration = 1320;
  const weeklyReport = useMemo(() => getWeeklyReport(), [getWeeklyReport, tick]);

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

  const handleSubmitCode = () => {
    validateAndAccess(inviteCode, false);
  };

  const handleSwitchAccount = () => {
    Taro.showModal({
      title: '切换账号',
      content: '确定要退出当前账号吗？退出后需要重新输入邀请码。',
      success: (res) => {
        if (res.confirm) {
          Taro.removeStorageSync(FAMILY_ACCESS_KEY);
          Taro.removeStorageSync(FAMILY_CODE_KEY);
          Taro.removeStorageSync(FAMILY_VERIFIED_KEY);
          setHasAccess(false);
          setIsVerified(false);
          setInviteCode('');
          setErrorMsg('');
        }
      }
    });
  };

  const handleRefresh = () => {
    setTick(prev => prev + 1);
    Taro.showToast({
      title: '已刷新',
      icon: 'success',
      duration: 1000
    });
  };

  if (!hasAccess) {
    return (
      <View className={styles.page}>
        <View className={styles.header}>
          <View className={styles.headerIcon}>👨‍👩‍👧</View>
          <Text className={styles.headerTitle}>家属代看</Text>
          <Text className={styles.headerDesc}>
            输入患者分享的邀请码，{'\n'}
            随时了解TA的治疗进度
          </Text>
        </View>

        {isPreview && (
          <View className={styles.previewBanner}>
            <Text>👤 预览模式：您正在体验家属视角</Text>
          </View>
        )}

        <View className={styles.inputSection}>
          <View className={styles.inputCard}>
            <Text className={styles.inputLabel}>请输入邀请码</Text>
            <Input
              className={`${styles.codeInput} ${errorMsg ? styles.codeInputError : ''}`}
              placeholder='请输入8位邀请码'
              value={inviteCode}
              onInput={(e) => {
                setInviteCode(e.detail.value.toUpperCase());
                setErrorMsg('');
              }}
              maxlength={8}
            />
            {errorMsg && <Text className={styles.errorMsg}>{errorMsg}</Text>}
            <Button className={styles.submitBtn} onClick={handleSubmitCode}>
              查看进度
            </Button>
            <View className={styles.tipWrap}>
              <Text className={styles.tipText}>
                💡 邀请码由患者在"我的-家属代看"中生成{'\n'}
                每位患者对应一个专属邀请码{'\n'}
                邀请码长期有效，验证一次后即可持续查看
              </Text>
              {!getFamilyShareCode() && (
                <Text className={styles.testTip}>
                  🎯 测试邀请码：TEST1234
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className={styles.page}>
      <View className={styles.progressPage}>
        {isPreview && (
          <View className={styles.previewBanner}>
            <Text>👤 预览模式：您正在体验家属视角</Text>
          </View>
        )}

        {!isPreview && (
          <View className={styles.accessBanner}>
            <Text>🔒 已验证邀请码：{inviteCode}</Text>
            <Text className={styles.accessHint}>刷新后保持登录状态</Text>
          </View>
        )}

        {/* 患者信息 */}
        <View className={styles.patientInfo}>
          <Image className={styles.patientAvatar} src={userInfo.avatar} mode='aspectFill' />
          <View className={styles.patientDetails}>
            <Text className={styles.patientName}>{userInfo.name}</Text>
            <Text className={styles.patientMeta}>{userInfo.age}岁 · {userInfo.treatmentType}</Text>
          </View>
          <View className={styles.patientBadge}>
            <Text>🦷 治疗中</Text>
          </View>
        </View>

        {/* 当前阶段 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>当前阶段</Text>
          <View className={styles.card}>
            <View className={styles.stageCard}>
              <View className={styles.stageIcon}>📋</View>
              <View className={styles.stageInfo}>
                <Text className={styles.stageName}>{currentStage?.name || '治疗中'}</Text>
                <Text className={styles.stageDesc}>{currentStage?.description || ''}</Text>
                <View className={styles.stageProgress}>
                  <View 
                    className={styles.stageProgressBar} 
                    style={{ width: `${overallProgress}%` }} 
                  />
                </View>
                <View className={styles.stageProgressText}>
                  <Text>整体进度</Text>
                  <Text style={{ color: '#7C8CF6', fontWeight: 500 }}>{overallProgress}%</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* 今日佩戴 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>今日佩戴</Text>
          <View className={styles.card}>
            <View className={styles.todayCard}>
              <View className={styles.todayDuration}>
                {Math.floor(todayDuration / 60)}
                <Text className={styles.todayDurationUnit}> 小时 {todayDuration % 60} 分钟</Text>
              </View>
              <Text className={styles.todayTarget}>目标 {formatDuration(targetDuration)}</Text>
              <View className={styles.todayProgressBar}>
                <View 
                  className={styles.todayProgressFill} 
                  style={{ width: `${Math.min(100, Math.round(todayDuration / targetDuration * 100))}%` }} 
                />
              </View>
              <Text className={styles.todayStatus}>
                {todayDuration >= targetDuration ? '✅ 今日目标已完成' : `还差 ${formatDuration(targetDuration - todayDuration)} 完成目标`}
              </Text>
            </View>
          </View>
        </View>

        {/* 下次复诊 */}
        {nextAppointment && (
          <View className={styles.section}>
            <Text className={styles.sectionTitle}>下次复诊</Text>
            <View className={styles.card}>
              <View className={styles.appointmentCard}>
                <View className={styles.appointmentIcon}>📅</View>
                <View className={styles.appointmentInfo}>
                  <Text className={styles.appointmentTitle}>{userInfo.doctor} · {userInfo.hospital}</Text>
                  <Text className={styles.appointmentDate}>
                    {dayjs(nextAppointment).format('YYYY年MM月DD日 dddd')}
                  </Text>
                  <Text className={styles.appointmentDoctor}>上午10:00</Text>
                </View>
                <View className={styles.appointmentDays}>
                  <Text className={styles.daysNumber}>{daysToAppointment}</Text>
                  <Text className={styles.daysLabel}>天后</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 连续打卡 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>打卡情况</Text>
          <View className={styles.card}>
            <View className={styles.streakCard}>
              <View className={styles.streakIcon}>🔥</View>
              <View className={styles.streakNumber}>{weeklyReport.continuousDays}</View>
              <Text className={styles.streakLabel}>天连续打卡</Text>
              <Text className={styles.streakDesc}>
                本周完成 {weeklyReport.completedDays}/{weeklyReport.totalDays} 天
                {weeklyReport.avgDuration > 0 && ` · 平均 ${formatDuration(weeklyReport.avgDuration)}`}
              </Text>
            </View>
          </View>
        </View>

        {/* 治疗阶段总览 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>治疗阶段</Text>
          <View className={styles.card}>
            <View className={styles.stagesList}>
              {stages.map((stage, index) => (
                <View key={stage.id} className={styles.stageItem}>
                  <View className={`${styles.stageItemDot} ${
                    stage.isCompleted ? styles.dotCompleted : 
                    stage.isCurrent ? styles.dotCurrent : styles.dotPending
                  }`} />
                  <View className={styles.stageItemInfo}>
                    <Text className={styles.stageItemName}>{stage.name}</Text>
                    <Text className={styles.stageItemDate}>
                      {dayjs(stage.startDate).format('MM.DD')} - {dayjs(stage.endDate).format('MM.DD')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* 底部 */}
        <View className={styles.footer}>
          <Button className={styles.refreshBtn} onClick={handleRefresh}>
            🔄 刷新数据
          </Button>
          <Text className={styles.footerText}>
            最后更新：{dayjs().format('MM-DD HH:mm')}
          </Text>
          <Button className={styles.switchBtn} onClick={handleSwitchAccount}>
            切换账号
          </Button>
        </View>
      </View>
    </View>
  );
};

export default FamilyPage;
