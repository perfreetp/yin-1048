import React, { useState, useMemo } from 'react';
import { View, Text, Button, Textarea, Image } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useDidShow } from '@tarojs/taro';
import styles from './index.module.scss';
import { useTreatmentStore } from '@/store/useTreatmentStore';
import { doctorNotes } from '@/data/mockData';
import dayjs from 'dayjs';

const RecordPage: React.FC = () => {
  const { 
    painRecords, 
    rubberBandRecords, 
    addRubberBandRecord,
    addPainRecord,
    oralPhotos,
    appointmentRecords,
    addOralPhoto,
    syncWithStorage
  } = useTreatmentStore();

  const [painLevel, setPainLevel] = useState(2);
  const [selectedPositions, setSelectedPositions] = useState<string[]>([]);
  const [painNote, setPainNote] = useState('');
  const [expandedAppointment, setExpandedAppointment] = useState<number | null>(null);

  useDidShow(() => {
    syncWithStorage();
  });

  const today = dayjs().format('YYYY-MM-DD');
  const todayRubber = rubberBandRecords.find(r => r.date === today);

  const positions = ['上排门牙', '下排门牙', '上排左侧', '上排右侧', '下排左侧', '下排右侧'];

  const handleTogglePosition = (pos: string) => {
    setSelectedPositions(prev => 
      prev.includes(pos) 
        ? prev.filter(p => p !== pos)
        : [...prev, pos]
    );
  };

  const handleSavePain = () => {
    addPainRecord({
      date: today,
      level: painLevel,
      positions: selectedPositions,
      note: painNote
    });
    setPainNote('');
    setSelectedPositions([]);
    Taro.showToast({
      title: '记录已保存',
      icon: 'success',
      duration: 1500
    });
  };

  const handleAddRubberBand = () => {
    if (todayRubber && todayRubber.times >= todayRubber.totalTimes) return;
    addRubberBandRecord(today);
    Taro.showToast({
      title: '已记录一次',
      icon: 'success',
      duration: 1500
    });
  };

  const handleAddPhoto = () => {
    Taro.chooseImage({
      count: 1,
      success: (res) => {
        const newPhoto = {
          id: Date.now(),
          url: res.tempFilePaths[0],
          date: today,
          type: '自拍'
        };
        addOralPhoto(newPhoto);
        Taro.showToast({
          title: '照片已保存',
          icon: 'success',
          duration: 1500
        });
      }
    });
  };

  const painTrendData = useMemo(() => {
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
      const record = painRecords.find(r => r.date === date);
      last7Days.push({
        date,
        level: record?.level || 0,
        day: dayjs(date).format('DD')
      });
    }
    return last7Days;
  }, [painRecords]);

  const recentPhotos = useMemo(() => oralPhotos.slice(0, 5), [oralPhotos]);

  return (
    <View className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.headerTitle}>健康记录</Text>
      </View>

      {/* 疼痛记录 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>今日疼痛</Text>
        <View className={styles.card}>
          <View className={styles.painCard}>
            <View className={styles.painLevelRow}>
              <Text className={styles.painLabel}>疼痛等级</Text>
              <Text className={styles.painValue}>{painLevel}/10</Text>
            </View>
            
            <View className={styles.painLevels}>
              {[1, 3, 5, 7, 9].map(level => (
                <Button
                  key={level}
                  className={`${styles.painLevelBtn} ${painLevel >= level ? styles.painLevelBtnActive : ''}`}
                  onClick={() => setPainLevel(level)}
                >
                  {level}
                </Button>
              ))}
            </View>

            <Text className={styles.painLabel}>不适部位</Text>
            <View className={styles.painPositions}>
              {positions.map(pos => (
                <Button
                  key={pos}
                  className={`${styles.positionTag} ${selectedPositions.includes(pos) ? styles.positionTagActive : ''}`}
                  onClick={() => handleTogglePosition(pos)}
                >
                  {pos}
                </Button>
              ))}
            </View>

            <Textarea
              className={styles.painNote}
              placeholder='备注一下今天的感受...'
              value={painNote}
              onInput={(e) => setPainNote(e.detail.value)}
              maxlength={100}
            />

            <Button className={styles.painSaveBtn} onClick={handleSavePain}>
              保存记录
            </Button>
          </View>
        </View>
      </View>

      {/* 疼痛趋势 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>近7天疼痛趋势</Text>
        <View className={styles.card}>
          <View className={styles.painTrend}>
            {painTrendData.map((item, index) => (
              <View
                key={item.date}
                className={`${styles.painTrendBar} ${item.level > 0 ? styles.painTrendBarActive : ''}`}
                style={{ height: `${Math.max(item.level * 10, 8)}%` }}
              >
                <Text className={styles.painTrendLabel}>{item.day}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* 橡皮筋 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>橡皮筋打卡</Text>
        <View className={styles.card}>
          <View className={styles.rubberBandCard}>
            <View className={styles.rubberIcon}>🎀</View>
            <View className={styles.rubberInfo}>
              <Text className={styles.rubberTitle}>今日橡皮筋</Text>
              <Text className={styles.rubberDesc}>每天3次，每次30分钟</Text>
              <View className={styles.rubberProgress}>
                <View 
                  className={styles.rubberBar}
                  style={{ width: `${todayRubber ? (todayRubber.times / todayRubber.totalTimes) * 100 : 0}%` }}
                />
              </View>
              <Text className={styles.rubberText}>
                已完成 {todayRubber?.times || 0}/{todayRubber?.totalTimes || 3} 次
              </Text>
            </View>
            <Button
              className={`${styles.rubberAddBtn} ${todayRubber?.times >= todayRubber?.totalTimes ? styles.rubberAddBtnDisabled : ''}`}
              onClick={handleAddRubberBand}
            >
              +
            </Button>
          </View>
        </View>
      </View>

      {/* 口腔照片 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>口腔照片</Text>
        <View className={styles.card}>
          <View className={styles.photoGrid}>
            {recentPhotos.map(photo => (
              <View key={photo.id} className={styles.photoItem}>
                <Image className={styles.photoImage} src={photo.url} mode='aspectFill' />
                <Text className={styles.photoDate}>{photo.type}</Text>
              </View>
            ))}
            <Button className={styles.photoAdd} onClick={handleAddPhoto}>+</Button>
          </View>
        </View>
      </View>

      {/* 复诊记录 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>复诊记录</Text>
        <View className={styles.card}>
          <View className={styles.appointmentList}>
            {appointmentRecords.map(record => {
              const isExpanded = expandedAppointment === record.id;
              return (
                <View 
                  key={record.id} 
                  className={`${styles.appointmentItem} ${isExpanded ? styles.appointmentItemExpanded : ''}`}
                  onClick={() => setExpandedAppointment(isExpanded ? null : record.id)}
                >
                  <View className={styles.appointmentHeader}>
                    <View className={styles.appointmentHeaderLeft}>
                      <View className={styles.appointmentDot} />
                      <Text className={styles.appointmentDate}>
                        {dayjs(record.date).format('YYYY年MM月DD日')}
                      </Text>
                    </View>
                    <View className={styles.appointmentHeaderRight}>
                      <Text className={styles.appointmentDoctor}>{record.doctor}</Text>
                      <Text className={styles.appointmentArrow}>{isExpanded ? '↑' : '↓'}</Text>
                    </View>
                  </View>
                  
                  <Text className={styles.appointmentConclusion}>{record.conclusion}</Text>
                  
                  {isExpanded && (
                    <View className={styles.appointmentDetail}>
                      <View className={styles.appointmentDetailSection}>
                        <Text className={styles.appointmentDetailTitle}>📝 本次注意事项</Text>
                        <View className={styles.appointmentNotes}>
                          {record.notes.map((note, idx) => (
                            <Text key={idx} className={styles.appointmentNoteItem}>
                              • {note}
                            </Text>
                          ))}
                        </View>
                      </View>
                      
                      {record.nextAppointment && (
                        <View className={styles.appointmentDetailSection}>
                          <Text className={styles.appointmentDetailTitle}>📅 下次复诊</Text>
                          <View className={styles.nextAppointmentCard}>
                            <Text className={styles.nextAppointmentDate}>
                              {dayjs(record.nextAppointment).format('YYYY年MM月DD日')}
                            </Text>
                            <Text className={styles.nextAppointmentDesc}>
                              {dayjs(record.nextAppointment).format('dddd')} 上午10:00 · {record.doctor}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* 医生注意事项 */}
      <View className={styles.section}>
        <Text className={styles.sectionTitle}>医生注意事项</Text>
        <View className={styles.card}>
          <View className={styles.notesList}>
            {doctorNotes.slice(0, 4).map((note, index) => (
              <View key={index} className={styles.noteItem}>
                <Text className={styles.noteIcon}>💡</Text>
                <Text className={styles.noteText}>{note}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
};

export default RecordPage;
