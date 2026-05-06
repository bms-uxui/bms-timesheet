import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useAppState } from '../core/state';
import { scanGallery } from '../lib/gallery';
import { matchPhotos, classifyPhotoType, fmtTime } from '../core/match';
import { Card, Button, Callout } from '../components/ui';
import { theme } from '../lib/theme';

export default function PhotosScreen({ navigation }) {
  const { timesheet, missingDays, setPhotos, photos, resolutions, updateResolution } = useAppState();
  const [status, setStatus] = useState('พร้อมสแกนคลังรูปภาพในช่วงเวลานี้');
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [matchedCount, setMatchedCount] = useState(null);

  const scan = async () => {
    if (!timesheet?.period) return;
    setScanning(true); setError(null);
    setStatus('กำลังขออนุญาตเข้าถึงรูปภาพ…');
    try {
      const from = new Date(timesheet.period.start);
      const to = new Date(timesheet.period.end);
      to.setDate(to.getDate() + 1);
      setStatus('กำลังสแกนคลังรูปภาพ…');
      const found = await scanGallery({ from, to });
      setPhotos(found);
      const matched = matchPhotos(missingDays, found);
      let inN = 0, outN = 0;
      for (const day of missingDays) {
        const k = day.date.toISOString().slice(0, 10);
        const m = matched[k];
        if (!m) continue;
        const patch = {};
        if (m.photoIn && day.needsIn) {
          patch.photoIn = m.photoIn;
          patch.actualTimeIn = fmtTime(m.photoIn.takenAt);
          if (classifyPhotoType(m.photoIn.takenAt) === 'clock-in') inN++;
        }
        if (m.photoOut && day.needsOut) {
          patch.photoOut = m.photoOut;
          patch.actualTimeOut = fmtTime(m.photoOut.takenAt);
          if (classifyPhotoType(m.photoOut.takenAt) === 'clock-out') outN++;
        }
        if (!resolutions[k]?.reason && (patch.photoIn || patch.photoOut)) {
          patch.reason = 'scanner-broken';
        }
        if (Object.keys(patch).length) updateResolution(k, patch);
      }
      setMatchedCount({ total: Object.keys(matched).length, inN, outN, photos: found.length });
      setStatus(`พบรูปภาพ ${found.length} รูป · จับคู่ได้ ${Object.keys(matched).length}/${missingDays.length} วัน`);
    } catch (e) {
      setError(e.message);
    } finally {
      setScanning(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Text style={styles.h2}>สแกนคลังรูปภาพ</Text>
        <Text style={styles.help}>แอปจะค้นเฉพาะรูปในช่วงเวลาที่ HR แจ้ง — ไม่ต้องเลือกทีละรูป</Text>
        <Button title={scanning ? 'กำลังสแกน…' : '📷 สแกนคลังรูปภาพ'} onPress={scan} disabled={scanning} />
        <Callout variant={error ? 'error' : 'info'}>
          {error ? `❌ ${error}` : status}
        </Callout>
        {matchedCount && (
          <View style={styles.stats}>
            <Stat label="รูปทั้งหมด" value={matchedCount.photos} />
            <Stat label="เข้างาน" value={matchedCount.inN} />
            <Stat label="เลิกงาน" value={matchedCount.outN} />
          </View>
        )}
      </Card>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="← ย้อนกลับ" variant="ghost" onPress={() => navigation.goBack()} style={{ flex: 1 }} />
        <Button title="ถัดไป → ตรวจสอบ" disabled={photos.length === 0} onPress={() => navigation.navigate('Review')} style={{ flex: 2 }} />
      </View>
    </ScrollView>
  );
}

function Stat({ label, value }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 80 },
  h2: { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  help: { fontSize: 13, color: theme.colors.muted, marginBottom: 12 },
  stats: { flexDirection: 'row', gap: 8, marginTop: 12 },
  statTile: { flex: 1, backgroundColor: theme.colors.surface2, padding: 10, borderRadius: theme.radius.sm, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  statLabel: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
});
