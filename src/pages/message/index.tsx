import React, { useState, useMemo } from 'react';
import { View, Text, Button } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useTreatmentStore } from '@/store/useTreatmentStore';
import { formatRelativeDate } from '@/utils/format';
import type { MessageType } from '@/types';

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
          filteredMessages.map(msg => (
            <View
              key={msg.id}
              className={`${styles.messageItem} ${!msg.isRead ? styles.messageUnread : ''}`}
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
              </View>
            </View>
          ))
        )}
      </View>
    </View>
  );
};

export default MessagePage;
