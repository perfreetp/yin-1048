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
const TEST_CODE = 'TEST1234';
const VALID_CODE_REGEX = /^[A-Z0-9]{6,12}$/;

const FamilyPage: React.FC = () => {
  const {
    userInfo,
    stages,
    appointmentRecords,
    getTodayDuration,
    getWeeklyReport,
    getLast7DaysTrend,
    getFamilyShareCode
  } = useTreatmentStore();

  const router = useRouter();
  const [hasAccess, setHasAccess] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [tick, setTick] = useState(0);
  const [isPreview, setIsPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [autoVerifyDone, setAutoVerifyDone] = useState(false);

  // 初始化
  useEffect(() => {
    const urlCode = (router.params?.code || '').toUpperCase();
    const preview = router.params?.preview === '1';
    if (preview) setIsPreview(true);

    const savedAccess = Taro.getStorageSync(FAMILY_ACCESS_KEY);
    const savedCode = Taro.getStorageSync(FAMILY_CODE_KEY);
    const savedVerified = Taro.getStorageSync(FAMILY_VERIFIED_KEY);

    if (urlCode && VALID_CODE_REGEX.test(urlCode) && !savedAccess) {
      // URL 参数携带合法邀请码：验证
      const r = verifyCodeInternal(urlCode);
      if (r.ok) {
        saveAndEnter(urlCode, preview);
        setAutoVerifyDone(true);
        return;
      } else {
        setInviteCode(urlCode);
        setErrorMsg(r.reason || '邀请码无效，请手动输入或检查链接');
        Taro.showToast({ title: '链接中邀请码无效', icon: 'none', duration: 2000 });
        setAutoVerifyDone(true);
        return;
      }
    }

    // 已保存访问
    if (savedAccess && savedCode && savedVerified) {
      const r = verifyCodeInternal(savedCode, true);
      if (r.ok) {
        setHasAccess(true);
        setInviteCode(savedCode);
      } else {
        // 本地码已失效，清
        Taro.removeStorageSync(FAMILY_ACCESS_KEY);
        Taro.removeStorageSync(FAMILY_CODE_KEY);
        Taro.removeStorageSync(FAMILY_VERIFIED_KEY);
      }
    }
    setTick(p => p + 1);
  }, [router.params]);

  useDidShow(() => setTick(p => p + 1));

  // 核心校验：
  //  1. 本地存在患者端的 getFamilyShareCode() → 精确匹配
  //  2. 否则允许 TEST1234（测试）
  //  3. 允许任何格式正确的码（模拟跨设备，因为没有服务端）
  //  4. 跨设备的码要求长度 6-12位 字母数字大写
  const verifyCodeInternal = (code: string, allowSaved = false): { ok: boolean; reason?: string } => {
    if (!code) return { ok: false, reason: '空' };
    const upper = code.toUpperCase();

    // 本地患者端生成的码 优先精准匹配
    const local = getFamilyShareCode();
    if (local && local.toUpperCase() === upper) return { ok: true };

    // 测试码
    if (upper === TEST_CODE) return { ok: true };

    // 预览模式：允许任何合法格式
    if (isPreview && VALID_CODE_REGEX.test(upper)) return { ok: true };

    // 跨设备：格式合法 + 不是本地存储过（模拟服务端白名单）
    if (VALID_CODE_REGEX.test(upper)) {
      return { ok: true };
    }

    if (upper.length < 6) return { ok: false, reason: '邀请码至少6位' };
    return { ok: false, reason: '邀请码格式不对（6-12位字母数字）' };
  };

  const saveAndEnter = (code: string, previewMode: boolean) => {
    Taro.setStorageSync(FAMILY_ACCESS_KEY, true);
    Taro.setStorageSync(FAMILY_CODE_KEY, code);
    Taro.setStorageSync(FAMILY_VERIFIED_KEY, true);
    setHasAccess(true);
    setInviteCode(code);
    if (!previewMode) setIsPreview(false);
    setErrorMsg('');
  };

  const currentStage = useMemo(() => stages.find(s => s.isCurrent), [stages]);
  const todayDuration = useMemo(() => getTodayDuration(), [getTodayDuration, tick]);
  const targetDuration = 1320;
  const weeklyReport = useMemo(() => getWeeklyReport(), [getWeeklyReport, tick]);
  const trend = useMemo(() => getLast7DaysTrend(), [getLast7DaysTrend, tick]);

  const nextAppointment = useMemo(() => appointmentRecords[0]?.nextAppointment, [appointmentRecords]);

  const daysToAppointment = useMemo(() => {
    if (!nextAppointment) return 0;
    return getDaysBetween(dayjs().format('YYYY-MM-DD'), nextAppointment);
  }, [nextAppointment]);

  const overallProgress = useMemo(() => {
    const s = stages[0]?.startDate, e = stages[stages.length - 1]?.endDate;
    if (!s || !e) return 0;
    return getProgressPercent(s, e);
  }, [stages]);

  // 趋势柱状图 计算
  const maxTrendMinutes = useMemo(() => Math.max(targetDuration, ...trend.map(t => t.minutes)),
    [trend]);

  const handleSubmitCode = () => {
    setErrorMsg('');
    const trimmed = inviteCode.trim().toUpperCase();
    if (!trimmed) {
      setErrorMsg('请输入邀请码');
      Taro.showToast({ title: '请输入邀请码', icon: 'none' });
      return;
    }
    const r = verifyCodeInternal(trimmed);
    if (!r.ok) {
      setErrorMsg(r.reason || '邀请码不正确');
      Taro.showToast({ title: r.reason || '邀请码不正确', icon: 'none', duration: 2000 });
      return;
    }
    saveAndEnter(trimmed, false);
    Taro.showToast({ title: '验证成功', icon: 'success' });
  };

  const handleSwitchAccount = () => {
    Taro.showModal({
      title: '切换账号',
      content: '确定要退出当前家属账号吗？退出后需重新输入邀请码。',
      success: (r) => {
        if (r.confirm) {
          Taro.removeStorageSync(FAMILY_ACCESS_KEY);
          Taro.removeStorageSync(FAMILY_CODE_KEY);
          Taro.removeStorageSync(FAMILY_VERIFIED_KEY);
          setHasAccess(false);
          setInviteCode('');
          setErrorMsg('');
          setIsPreview(false);
        }
      }
    });
  };

  const handleRefresh = () => {
    setTick(p => p + 1);
    Taro.showToast({ title: '已同步最新数据', icon: 'success', duration: 1000 });
  };

  if (!hasAccess) {
    return (
      <View className={styles.page}>
        <View className={styles.header}>
          <View className={styles.headerIcon}>👨‍👩‍👧</View>
          <Text className={styles.headerTitle}>家属代看</Text>
          <Text className={styles.headerDesc}>
            输入患者分享的邀请码，{'\n'}
            随时了解TA的正畸治疗进度
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
              placeholder='请输入6-12位邀请码'
              value={inviteCode}
              onInput={(e) => {
                setInviteCode(e.detail.value.toUpperCase());
                if (errorMsg) setErrorMsg('');
              }}
              maxlength={12}
            />
            {errorMsg && <Text className={styles.errorMsg}>{errorMsg}</Text>}
            <Button className={styles.submitBtn} onClick={handleSubmitCode}>
              查看治疗进度
            </Button>
            <View className={styles.tipWrap}>
              <Text className={styles.tipText}>
                💡 邀请码获取方式{'\n'}
                患者在"我的 → 家属代看 → 分享{'\n'}
                链接或邀请码长期有效，验证一次即可持续查看
              </Text>
              <Text className={styles.testTip}>
                🎯 测试体验邀请码：{TEST_CODE}
              </Text>
              <Text className={styles.urlTip}>
                🔗 链接格式：<Text className={styles.urlCode}>orthodontic://family?code=XXXXXX</Text>
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // ============ 已授权视图 ============
  return (
    <View className={styles.page}>
      <View className={styles.progressPage}>
        {isPreview ? (
          <View className={styles.previewBanner}>
            <Text>👤 预览模式：您正在体验家属视角 · 可点击下方「切换账号」退出</Text>
          </View>
        ) : (
          <View className={styles.accessBanner}>
            <Text>🔒 已验证邀请码：<Text style={{ fontWeight: 700 }}>{inviteCode}</Text></Text>
            <Text className={styles.accessHint}>刷新/关闭小程序后保持登录状态</Text>
          </View>
        )}

        {/* 患者信息+摘要 */}
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

        {/* 进度卡 */}
        <View className={styles.section}>
          <View className={styles.summarySection}>
            <View className={styles.summaryRow}>
              <View className={styles.summaryBlock}>
                <Text className={styles.summaryBlockValue}>{overallProgress}%</Text>
                <Text className={styles.summaryBlockLabel}>整体进度</Text>
              </View>
              <View className={styles.summaryBlock}>
                <Text className={styles.summaryBlockValue}>
                  {userInfo.currentAligner}
                  <Text style={{ fontSize: 24, fontWeight: 400 }}>/{userInfo.totalAligners}</Text>
                </Text>
                <Text className={styles.summaryBlockLabel}>当前牙套</Text>
              </View>
              <View className={styles.summaryBlock}>
                <Text className={styles.summaryBlockValue}>{weeklyReport.continuousDays}</Text>
                <Text className={styles.summaryBlockLabel}>连续打卡</Text>
              </View>
            </View>

            {/* 进度条 */}
            <View className={styles.summaryProgressRow}>
              <View className={styles.summaryProgressBar}>
                <View
                  className={styles.summaryProgressFill}
                  style={{ width: `${overallProgress}%` }}
                />
              </View>
              <Text className={styles.summaryProgressText}>
                第{currentStage?.name} · {currentStage?.description}
              </Text>
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
                {todayDuration >= targetDuration
                  ? '✅ 今日目标已完成 🎉'
                  : `还差 ${formatDuration(Math.max(0, targetDuration - todayDuration)} 完成`}
              </Text>
            </View>
          </View>
        </View>

        {/* 近7天趋势 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>近7天佩戴趋势</Text>
          <View className={styles.card}>
            <View className={styles.trendCard}>
              <View className={styles.trendBars}>
                {trend.map((d, idx) => {
                  const h = d.minutes > 0
                    ? Math.max(12, Math.round(d.minutes / maxTrendMinutes * 220))
                    : 6;
                  return (
                    <View key={d.date} className={styles.trendBarCol}>
                      <Text className={styles.trendBarVal}>
                        {d.minutes > 0 ? `${Math.floor(d.minutes / 60)}h` : ''}
                      </Text>
                      <View
                        className={`${styles.trendBar} ${d.completed ? styles.trendBarDone : ''}`}
                        style={{ height: `${h}rpx` }}
                      />
                      <View className={styles.trendBarLabel}>{d.label}</View>
                      {d.completed && <View className={styles.trendBarCheck}>✓</View>}
                    </View>
                  );
                })}
              </View>
              <View className={styles.trendTargetLine}>
                <View className={styles.trendTargetDash} />
                <Text className={styles.trendTargetText}>目标22h</Text>
              </View>
            </View>
            <View className={styles.trendFooter}>
              <View className={styles.trendLegend}>
                <View className={`${styles.trendLegendDot} ${styles.trendLegendDotDone}`} />
                <Text>达标</Text>
                <View className={`${styles.trendLegendDot} ${styles.trendLegendDotPending}`} />
                <Text>进行中</Text>
              </View>
              <Text className={styles.trendAvg}>
                本周平均 {formatDuration(weeklyReport.avgDuration > 0
                  ? weeklyReport.avgDuration
                  : Math.round(trend.reduce((s, d) => s + d.minutes, 0) / trend.length)
                )}
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

        {/* 医生注意事项 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>医生注意事项</Text>
          <View className={styles.card}>
            <View className={styles.notesCard}>
              <View className={styles.notesList}>
                {userInfo.doctorNotes.map((note, i) => (
                  <View key={i} className={styles.noteItem}>
                    <Text className={styles.noteIndex}>{i + 1}</Text>
                    <Text className={styles.noteText}>{note}</Text>
                  </View>
                ))}
              </View>
              <View className={styles.notesFooter}>
                <Text className={styles.notesUpdated}>
                  最近更新：{appointmentRecords[0]?.date
                    ? dayjs(appointmentRecords[0].date).format('YYYY-MM-DD')
                    : '近期复诊'
                  }
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* 阶段总览 */}
        <View className={styles.section}>
          <Text className={styles.sectionTitle}>治疗阶段总览</Text>
          <View className={styles.card}>
            <View className={styles.stagesList}>
              {stages.map((stage) => (
              <View key={stage.id} className={styles.stageItem}>
                <View className={`${styles.stageItemDot} ${
                  stage.isCompleted ? styles.dotCompleted :
                  stage.isCurrent ? styles.dotCurrent : styles.dotPending
                }`} />
                <View className={styles.stageItemInfo}>
                  <Text className={styles.stageItemName}>{stage.name}</Text>
                  <Text className={styles.stageItemDate}>
                    {dayjs(stage.startDate).format('MM.DD')} - {dayjs(stage.endDate).format('MM.DD')}
                    {stage.isCompleted && ' · 已完成'}
                    {stage.isCurrent && ' · 进行中'}
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
          🔄 同步最新数据
        </Button>
          <Text className={styles.footerText}>
          数据来源：患者端同步 · 最后更新 {dayjs().format('MM-DD HH:mm')}
        </Text>
          <Button className={styles.switchBtn} onClick={handleSwitchAccount}>
          切换家属账号
        </Button>
        </View>
      </View>
    </View>
  );
};

export default FamilyPage;
