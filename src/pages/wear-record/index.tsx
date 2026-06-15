import React, { useMemo, useState } from 'react';
import { View, Text, Button, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useDidShow, useRouter } from '@tarojs/taro';
import styles from './index.module.scss';
import { useTreatmentStore } from '@/store/useTreatmentStore';
import { formatDuration } from '@/utils/format';
import type { WearSession } from '@/types';
import dayjs from 'dayjs';

/**
 * 佩戴记录明细页
 * 功能：
 *  1. 日期选择器（近14天）
 *  2. 每段 session 展示：戴上时间、取下时间、时长、备注
 *  3. 操作：修改开始/结束时间、删除误操作、新增补录
 *  4. 顶部摘要：当天总时长、次数、是否达标
 */

interface EditingSession {
  id: string;
  field: 'start' | 'end';
  currentValue: string; // HH:mm 格式
}

const WearRecordPage: React.FC = () => {
  const {
    wearRecords,
    getSessionsByDate,
    updateSession,
    deleteSession,
    addSession,
    syncWithStorage,
    isWearing,
    currentSessionId
  } = useTreatmentStore();

  const router = useRouter();
  const todayStr = dayjs().format('YYYY-MM-DD');
  const initialDate = router.params?.date || todayStr;

  const [activeDate, setActiveDate] = useState(initialDate);
  const [tick, setTick] = useState(0);
  const [editing, setEditing] = useState<EditingSession | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addStart, setAddStart] = useState('08:00');
  const [addEnd, setAddEnd] = useState('12:00');
  const [addNote, setAddNote] = useState('');

  useDidShow(() => {
    syncWithStorage();
    setTick(prev => prev + 1);
  });

  // 近14天日期列表
  const dateList = useMemo(() => {
    const list: Array<{ date: string; label: string; dayLabel: string }> = [];
    for (let i = 13; i >= 0; i--) {
      const d = dayjs().subtract(i, 'day');
      list.push({
        date: d.format('YYYY-MM-DD'),
        label: d.format('MM/DD'),
        dayLabel: i === 0 ? '今天' : i === 1 ? '昨天' : d.format('ddd').replace('周', '').replace('Sun', '日').replace('Mon', '一').replace('Tue', '二').replace('Wed', '三').replace('Thu', '四').replace('Fri', '五').replace('Sat', '六')
      });
    }
    return list;
  }, []);

  const dayRecord = useMemo(() => {
    return wearRecords.find(r => r.date === activeDate);
  }, [wearRecords, activeDate, tick]);

  const sessions = useMemo(() => {
    const list = getSessionsByDate(activeDate);
    return list.map(s => {
      const startDay = dayjs(s.startTs).format('YYYY-MM-DD');
      const endDay = s.endTs ? dayjs(s.endTs).format('YYYY-MM-DD') : activeDate;
      // 如果主日期是 activeDate，但开始是前一天，需要显示跨天标记
      const crossDay = startDay !== endDay || (s.endTs === null && startDay !== activeDate);
      return { ...s, crossDay };
    });
  }, [getSessionsByDate, activeDate, tick]);

  const totalMinutes = useMemo(() => {
    return sessions.reduce((sum, s) => {
      // 根据 activeDate 计算只属于该日期的分钟
      const dayStartTs = dayjs(activeDate).startOf('day').valueOf();
      const dayEndTs = dayStartTs + 86400000;
      const start = Math.max(s.startTs, dayStartTs);
      const end = Math.min(s.endTs || Date.now(), dayEndTs);
      if (end <= start) return sum;
      return sum + Math.floor((end - start) / 60000);
    }, 0);
  }, [sessions, activeDate]);

  const isCompleted = totalMinutes >= 1320;

  const tsToTime = (ts: number | null) => {
    if (!ts) return '进行中';
    return dayjs(ts).format('HH:mm');
  };

  const timeToTs = (date: string, time: string, baseTs: number) => {
    const [h, m] = time.split(':').map(Number);
    return dayjs(date).hour(h || 0).minute(m || 0).second(0).valueOf();
  };

  const pickTime = (session: WearSession, field: 'start' | 'end') => {
    const baseTs = field === 'start' ? session.startTs : (session.endTs || Date.now());
    Taro.showActionSheet({
      itemList: field === 'start'
        ? ['06:00', '07:00', '08:00', '09:00', '12:00', '18:00', '21:00', '自定义']
        : ['10:00', '12:00', '14:00', '18:00', '20:00', '22:00', '现在', '自定义'],
      success: (res) => {
        const quickMapStart = ['06:00', '07:00', '08:00', '09:00', '12:00', '18:00', '21:00'];
        const quickMapEnd = ['10:00', '12:00', '14:00', '18:00', '20:00', '22:00'];
        let timeStr = '';
        if (field === 'start' && res.tapIndex < 7) timeStr = quickMapStart[res.tapIndex];
        if (field === 'end' && res.tapIndex < 6) timeStr = quickMapEnd[res.tapIndex];
        if (field === 'end' && res.tapIndex === 6) timeStr = dayjs().format('HH:mm');
        if (timeStr) {
          applyTimeChange(session, field, timeStr);
        } else {
          setEditing({ id: session.id, field, currentValue: tsToTime(baseTs).replace('进行中', '') });
        }
      }
    });
  };

  const applyTimeChange = (session: WearSession, field: 'start' | 'end', timeStr: string) => {
    if (field === 'start') {
      const newStart = timeToTs(session.date, timeStr, session.startTs);
      if (session.endTs && newStart >= session.endTs) {
        Taro.showToast({ title: '开始时间必须早于结束时间', icon: 'none' });
        return;
      }
      updateSession(session.id, { startTs: newStart });
      Taro.showToast({ title: '已更新开始时间', icon: 'success' });
    } else {
      if (!session.endTs && session.id === currentSessionId) {
        Taro.showToast({ title: '正在进行的 session 请用取下按钮', icon: 'none' });
        return;
      }
      const newEnd = timeToTs(session.date, timeStr, session.endTs || Date.now());
      if (newEnd <= session.startTs) {
        Taro.showToast({ title: '结束时间必须晚于开始时间', icon: 'none' });
        return;
      }
      updateSession(session.id, { endTs: newEnd });
      Taro.showToast({ title: '已更新结束时间', icon: 'success' });
    }
    setTick(prev => prev + 1);
    setEditing(null);
  };

  const handleDeleteSession = (session: WearSession) => {
    Taro.showModal({
      title: '删除佩戴记录',
      content: `确定要删除 ${dayjs(session.startTs).format('HH:mm')} 的这段记录吗？\n删除后当天累计时长会重新计算。`,
      confirmColor: '#EF4444',
      success: (res) => {
        if (res.confirm) {
          if (session.id === currentSessionId && isWearing) {
            Taro.showToast({ title: '正在佩戴请先取下', icon: 'none' });
            return;
          }
          deleteSession(session.id);
          Taro.showToast({ title: '已删除', icon: 'success' });
          setTick(prev => prev + 1);
        }
      }
    });
  };

  const handleSaveManual = () => {
    const startTs = timeToTs(activeDate, addStart, Date.now());
    const endTs = timeToTs(activeDate, addEnd, Date.now());
    if (endTs <= startTs) {
      Taro.showToast({ title: '结束时间必须晚于开始', icon: 'none' });
      return;
    }
    addSession({
      date: activeDate,
      startTs,
      endTs,
      note: addNote || '补录'
    });
    setShowAddModal(false);
    setAddStart('08:00');
    setAddEnd('12:00');
    setAddNote('');
    Taro.showToast({ title: '已补录', icon: 'success' });
    setTick(prev => prev + 1);
  };

  return (
    <View className={styles.page}>
      {/* 日期选择 */}
      <View className={styles.datePickerWrap}>
        <ScrollView scrollX className={styles.datePickerScroll} showScrollbar={false}>
          <View className={styles.datePickerRow}>
            {dateList.map(d => (
              <View
                key={d.date}
                className={`${styles.dateItem} ${activeDate === d.date ? styles.dateItemActive : ''}`}
                onClick={() => setActiveDate(d.date)}
              >
                <Text className={styles.dateDayLabel}>{d.dayLabel}</Text>
                <Text className={styles.dateNumLabel}>{d.label}</Text>
                {wearRecords.find(r => r.date === d.date)?.isCompleted && (
                  <View className={styles.dateDot} />
                )}
              </View>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* 当日摘要 */}
      <View className={styles.summarySection}>
        <View className={styles.summaryCard}>
          <View className={styles.summaryHeader}>
            <Text className={styles.summaryTitle}>
              {activeDate === todayStr ? '今日' : dayjs(activeDate).format('MM月DD日')}佩戴摘要
            </Text>
            <View className={`${styles.summaryBadge} ${isCompleted ? styles.badgeCompleted : styles.badgePending}`}>
              {isCompleted ? '✅ 已达标' : '⏳ 未达标'}
            </View>
          </View>
          <View className={styles.summaryGrid}>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryValue}>{formatDuration(totalMinutes)}</Text>
              <Text className={styles.summaryLabel}>累计时长</Text>
            </View>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryValue}>{sessions.length}</Text>
              <Text className={styles.summaryLabel}>段数</Text>
            </View>
            <View className={styles.summaryItem}>
              <Text className={styles.summaryValue}>
                {Math.max(0, dayRecord?.wearCount || 0)} / {Math.max(0, dayRecord?.removeCount || 0)}
              </Text>
              <Text className={styles.summaryLabel}>戴上 / 取下</Text>
            </View>
          </View>
          <View className={styles.targetBarWrap}>
            <View
              className={`${styles.targetBar} ${isCompleted ? styles.targetBarCompleted : ''}`}
              style={{ width: `${Math.min(100, Math.round(totalMinutes / 1320 * 100))}%` }}
            />
          </View>
          <Text className={styles.targetHint}>
            目标 22小时，还差 {formatDuration(Math.max(0, 1320 - totalMinutes))}
          </Text>
        </View>
      </View>

      {/* Session 列表 */}
      <View className={styles.sessionsSection}>
        <View className={styles.sessionsHeader}>
          <Text className={styles.sessionsTitle}>佩戴明细</Text>
          <Button className={styles.addBtn} onClick={() => setShowAddModal(true)}>
            + 补录
          </Button>
        </View>

        {sessions.length === 0 ? (
          <View className={styles.emptySessions}>
            <Text className={styles.emptyIcon}>📭</Text>
            <Text className={styles.emptyText}>当天暂无佩戴记录</Text>
            <Button className={styles.emptyAddBtn} onClick={() => setShowAddModal(true)}>
              去补录
            </Button>
          </View>
        ) : (
          <View className={styles.sessionsList}>
            {sessions.map(session => (
              <View
                key={session.id}
                className={`${styles.sessionCard} ${session.id === currentSessionId ? styles.sessionOngoing : ''}`}
              >
                <View className={styles.sessionTop}>
                  <View className={styles.sessionNote}>
                    {session.note ? `${session.note}` : '常规佩戴'}
                    {session.crossDay && <Text className={styles.crossDayTag}> 跨天</Text>}
                  </View>
                  {session.id === currentSessionId ? (
                    <Text className={styles.ongoingTag}>进行中</Text>
                  ) : (
                    <Text className={styles.durationPill}>
                      {formatDuration(session.minutes)}
                    </Text>
                  )}
                </View>

                <View className={styles.timeRow}>
                  <View className={styles.timeBlock}>
                    <Text className={styles.timeLabel}>戴上</Text>
                    <View
                      className={styles.timeValueWrap}
                      onClick={() => pickTime(session, 'start')}
                    >
                      <Text className={styles.timeValue}>
                        {session.crossDay && dayjs(session.startTs).format('YYYY-MM-DD') !== activeDate
                          ? dayjs(session.startTs).format('MM/DD HH:mm')
                          : tsToTime(session.startTs)
                        }
                      </Text>
                      <Text className={styles.timeEditHint}>修改</Text>
                    </View>
                  </View>

                  <View className={styles.arrowWrap}>
                    <View className={styles.arrowLine} />
                    <View className={styles.arrowDotStart} />
                    <View className={`${styles.arrowDotEnd} ${session.endTs ? '' : styles.arrowDotPulse}`} />
                  </View>

                  <View className={styles.timeBlock}>
                    <Text className={styles.timeLabel}>取下</Text>
                    <View
                      className={`${styles.timeValueWrap} ${!session.endTs ? styles.timeValueWrapDisabled : ''}`}
                      onClick={() => session.endTs && pickTime(session, 'end')}
                    >
                      <Text className={`${styles.timeValue} ${!session.endTs ? styles.timeValueOngoing : ''}`}>
                        {session.endTs
                          ? (session.crossDay && dayjs(session.endTs).format('YYYY-MM-DD') !== activeDate
                            ? dayjs(session.endTs).format('MM/DD HH:mm')
                            : tsToTime(session.endTs))
                          : '进行中'
                        }
                      </Text>
                      <Text className={styles.timeEditHint}>
                        {session.endTs ? '修改' : ''}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* 编辑中的输入框 */}
                {editing && editing.id === session.id && (
                  <View className={styles.editRow}>
                    <View className={styles.editHint}>
                      请输入{editing.field === 'start' ? '开始' : '结束'}时间（HH:mm）：
                    </View>
                    <Input
                      className={styles.editInput}
                      value={editing.currentValue}
                      placeholder='例如 08:30'
                      onInput={(e) => setEditing({ ...editing, currentValue: e.detail.value })}
                      maxlength={5}
                    />
                    <View className={styles.editBtns}>
                      <Button
                        className={styles.editCancel}
                        onClick={() => setEditing(null)}
                      >取消</Button>
                      <Button
                        className={styles.editConfirm}
                        onClick={() => {
                          const v = editing.currentValue.trim();
                          if (!/^\d{1,2}:\d{2}$/.test(v)) {
                            Taro.showToast({ title: '格式错误，如 08:30', icon: 'none' });
                            return;
                          }
                          applyTimeChange(session, editing.field, v);
                        }}
                      >确定</Button>
                    </View>
                  </View>
                )}

                <View className={styles.sessionActions}>
                  <Button
                    className={styles.deleteBtn}
                    onClick={() => handleDeleteSession(session)}
                  >
                    删除本段
                  </Button>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 补录弹窗 */}
      {showAddModal && (
        <View className={styles.modalOverlay} onClick={() => setShowAddModal(false)}>
          <View className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <Text className={styles.modalTitle}>补录佩戴记录</Text>
            <Text className={styles.modalSubtitle}>日期：{activeDate}</Text>

            <View className={styles.modalRow}>
              <Text className={styles.modalLabel}>开始时间</Text>
              <Input
                className={styles.modalInput}
                value={addStart}
                onInput={(e) => setAddStart(e.detail.value)}
                placeholder='08:00'
                maxlength={5}
              />
            </View>
            <View className={styles.modalRow}>
              <Text className={styles.modalLabel}>结束时间</Text>
              <Input
                className={styles.modalInput}
                value={addEnd}
                onInput={(e) => setAddEnd(e.detail.value)}
                placeholder='12:00'
                maxlength={5}
              />
            </View>
            <View className={styles.modalRow}>
              <Text className={styles.modalLabel}>备注（可选）</Text>
              <Input
                className={styles.modalInput}
                value={addNote}
                onInput={(e) => setAddNote(e.detail.value)}
                placeholder='餐后 / 清洁后 / 其他'
                maxlength={20}
              />
            </View>

            <View className={styles.modalBtnRow}>
              <Button className={styles.modalCancel} onClick={() => setShowAddModal(false)}>
                取消
              </Button>
              <Button className={styles.modalConfirm} onClick={handleSaveManual}>
                保存
              </Button>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

export default WearRecordPage;
