import React, { useState, useMemo } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useTreatmentStore } from '@/store/useTreatmentStore';
import { formatRelativeDate, getDaysBetween } from '@/utils/format';
import type { MessageType } from '@/types';
import dayjs from 'dayjs';

const MessagePage: React.FC = () => {
  const { 
    messages, 
    markMessageRead, 
    markAllMessagesRead,
    getUnreadMessageCount,
    syncWithStorage,
    settings
  } = useTreatmentStore();
  const [activeCategory, setActiveCategory] = useState<MessageType | 'all'>('all');
  const [tick, setTick] = useState(0);

  useDidShow(() => {
    syncWithStorage();
    setTick(prev => prev + 1);
  });

  const categories = [
    { key: 'all', label: '全部' },
    { key: 'appointment', label: '复诊' },
    { key: 'aligner', label: '牙套' },
    { key: 'doctor', label: '医生' },
    { key: 'system', label: '系统' }
  ];

  const filteredMessages = useMemo(() => {
    if (activeCategory === 'all') return messages;
    return messages.filter(msg => msg.type === activeCategory);
  }, [messages, activeCategory, tick]);

  const unreadCount = useMemo(() => getUnreadMessageCount(), [getUnreadMessageCount, tick]);

  const getIconByType = (type: MessageType) => {
    const icons = {
      appointment: '📅',
      aligner: '🦷',
      doctor: '👨‍⚕️',
      system: '🔔'
    };
    return icons[type];
  };

  const getIconClassByType = (type: MessageType) => {
    const classes = {
      appointment: styles.iconAppointment,
      aligner: styles.iconAligner,
      doctor: styles.iconDoctor,
      system: styles.iconSystem
    };
    return classes[type];
  };

  const handleMessageClick = (id: number) => {
    markMessageRead(id);
  };

  const handleMarkAllRead = () => {
    markAllMessagesRead();
    setTick(prev => prev + 1);
    Taro.showToast({
      title: '已全部标为已读',
      icon: 'success',
      duration: 1500
    });
  };

  const isTravelMode = settings.travelMode;
  const travelDays = isTravelMode 
    ? getDaysBetween(dayjs().format('YYYY-MM-DD'), settings.travelEndDate) 
    : 0;

  const getTravelNoticeForType = (type: MessageType): string | null => {
    if (!isTravelMode) return null;
    if (type === 'appointment') return '📎 旅行期提前1天推送';
    if (type === 'aligner') return '📎 旅行期换牙套提前提醒';
    if (type === 'system' && isTravelMode) return '📎 旅行期改为早中晚3次';
    return null;
  };

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>
          消息
          {unreadCount > 0 && (
            <Text className={styles.unreadBadge}>{unreadCount}</Text>
          )}
        </Text>
        <Button className={styles.readAllBtn} onClick={handleMarkAllRead}>
          全部已读
        </Button>
      </View>

      {isTravelMode && (
        <View className={styles.travelNotice}>
          <View className={styles.travelNoticeIcon}>✈️</View>
          <View className={styles.travelNoticeBody}>
            <View className={styles.travelNoticeTitle}>
              <Text>出差旅行模式进行中</Text>
              <Text className={styles.travelNoticeBadge}>还剩{travelDays}天</Text>
            </View>
            <Text className={styles.travelNoticeDesc}>
              {dayjs(settings.travelStartDate).format('MM.DD')} - {dayjs(settings.travelEndDate).format('MM.DD')}
            </Text>
            <View className={styles.travelNoticeTips}>
              <Text className={styles.travelNoticeTip}>• 复诊提醒 提前1天推送</Text>
              <Text className={styles.travelNoticeTip}>• 换牙套提醒 提前提醒</Text>
              <Text className={styles.travelNoticeTip}>• 佩戴提醒 早8午12晚20 共3次</Text>
            </View>
          </View>
        </View>
      )}

      <View className={styles.categoryTabs}>
        {categories.map(cat => (
          <Button
            key={cat.key}
            className={`${styles.categoryTab} ${activeCategory === cat.key ? styles.categoryTabActive : ''}`}
            onClick={() => setActiveCategory(cat.key as MessageType | 'all')}
          >
            {cat.label}
          </Button>
        ))}
      </View>

      <View className={styles.messageList}>
        {filteredMessages.length === 0 ? (
          <View className={styles.emptyState}>
            <View className={styles.emptyIcon}>📭</View>
            <Text className={styles.emptyText}>暂无消息</Text>
          </View>
        ) : (
          filteredMessages.map(msg => {
            const travelTag = getTravelNoticeForType(msg.type);
            return (
              <View
                key={msg.id}
                className={`${styles.messageItem} ${!msg.isRead ? styles.messageUnread : ''} ${isTravelMode ? styles.messageTravelMode : ''}`}
                onClick={() => handleMessageClick(msg.id)}
              >
                <View className={`${styles.messageIcon} ${getIconClassByType(msg.type)}`}>
                  <Text>{getIconByType(msg.type)}</Text>
                </View>
                <View className={styles.messageContent}>
                  <View className={styles.messageHeader}>
                    <Text className={styles.messageTitle}>{msg.title}</Text>
                    {!msg.isRead && <View className={styles.messageDot} />}
                  </View>
                  <Text className={styles.messageTime}>{formatRelativeDate(msg.time)}</Text>
                  <Text className={styles.messageText}>{msg.content}</Text>
                  {travelTag && (
                    <View className={styles.travelTag}>
                      <Text>{travelTag}</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    </View>
  );
};

export default MessagePage;
