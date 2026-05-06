import React from 'react';
import { View, Text, ScrollView, StyleSheet, Image } from 'react-native';
import { useAppState } from '../core/state';
import { Card, Button, Label, Input, Badge } from '../components/ui';
import { theme } from '../lib/theme';
import { fmtDate } from '../lib/format';
import { REASONS, REASON_LABEL_MAP, STATUS_BADGES } from '../core/reasons';

export default function ReviewScreen({ navigation }) {
  const { missingDays, resolutions, updateResolution } = useAppState();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {missingDays.map((day) => {
        const k = day.date.toISOString().slice(0, 10);
        const res = resolutions[k] || {};
        return (
          <Card key={k} style={styles.dayCard}>
            <View style={styles.head}>
              <Text style={styles.dayDate}>{fmtDate(day.date)}</Text>
              <Badge>{STATUS_BADGES[day.justificationReason] || day.justificationReason || ''}</Badge>
              <Text style={styles.hr}>HR: {day.checkIn || '—'} / {day.checkOut || '—'}</Text>
            </View>

            <View style={styles.slotsRow}>
              {day.needsIn && <PhotoSlot label="⏰ เข้างาน" photo={res.photoIn} />}
              {day.needsOut && <PhotoSlot label="🌙 เลิกงาน" photo={res.photoOut} />}
            </View>

            <View style={styles.timeRow}>
              {day.needsIn && (
                <View style={{ flex: 1 }}>
                  <Label>เวลาเข้าจริง</Label>
                  <Input
                    placeholder="08:15"
                    value={res.actualTimeIn || ''}
                    onChangeText={(v) => updateResolution(k, { actualTimeIn: v })}
                  />
                </View>
              )}
              {day.needsOut && (
                <View style={{ flex: 1 }}>
                  <Label>เวลาออกจริง</Label>
                  <Input
                    placeholder="17:30"
                    value={res.actualTimeOut || ''}
                    onChangeText={(v) => updateResolution(k, { actualTimeOut: v })}
                  />
                </View>
              )}
            </View>

            <Label>เหตุผล</Label>
            <ReasonPicker
              value={res.reason}
              onChange={(v) => updateResolution(k, { reason: v })}
            />

            <Label>หมายเหตุ</Label>
            <Input
              placeholder="รายละเอียดเพิ่มเติมสำหรับ HR"
              value={res.remark || ''}
              onChangeText={(v) => updateResolution(k, { remark: v })}
              multiline
              numberOfLines={3}
              style={{ minHeight: 72, textAlignVertical: 'top' }}
            />
          </Card>
        );
      })}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="← ย้อนกลับ" variant="ghost" onPress={() => navigation.goBack()} style={{ flex: 1 }} />
        <Button title="ถัดไป → ส่งออก" onPress={() => navigation.navigate('Export')} style={{ flex: 2 }} />
      </View>
    </ScrollView>
  );
}

function PhotoSlot({ label, photo }) {
  return (
    <View style={styles.slot}>
      <Text style={styles.slotLabel}>{label}</Text>
      <View style={styles.photoBox}>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <Text style={{ color: theme.colors.muted }}>ไม่มีรูป</Text>
        )}
      </View>
    </View>
  );
}

function ReasonPicker({ value, onChange }) {
  return (
    <View style={styles.reasonGrid}>
      {REASONS.map(([v, label]) => (
        <Button
          key={v}
          title={label}
          variant={value === v ? 'primary' : 'ghost'}
          onPress={() => onChange(v)}
          style={styles.reasonChip}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 80 },
  dayCard: { padding: 14 },
  head: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, paddingBottom: 8, marginBottom: 8, borderBottomWidth: 1, borderColor: theme.colors.border },
  dayDate: { fontSize: 16, fontWeight: '700' },
  hr: { fontSize: 12, color: theme.colors.muted },
  slotsRow: { flexDirection: 'row', gap: 12 },
  slot: { flex: 1 },
  slotLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  photoBox: {
    aspectRatio: 1,
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { width: '100%', height: '100%' },
  timeRow: { flexDirection: 'row', gap: 12, marginTop: 8 },
  reasonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  reasonChip: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 36 },
});
