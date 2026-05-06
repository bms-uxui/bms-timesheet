import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { useAppState } from '../core/state';
import { Card, Button, Callout } from '../components/ui';
import { theme } from '../lib/theme';

export default function ExportScreen({ navigation }) {
  const { userName, timesheet, missingDays, resolutions } = useAppState();
  const [status, setStatus] = useState('กดปุ่ม "สร้าง PDF" เพื่อดูตัวอย่างเอกสาร');
  const [working, setWorking] = useState(false);
  const [pdfUri, setPdfUri] = useState(null);

  const generate = async () => {
    setWorking(true);
    setStatus('⏳ กำลังสร้าง PDF…');
    try {
      throw new Error('การสร้าง PDF ยังไม่พร้อม (กำลังพัฒนา)');
    } catch (e) {
      setStatus(`❌ ${e.message}`);
    } finally {
      setWorking(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Text style={styles.h2}>ตรวจสอบและส่งออก</Text>
        <Text style={styles.help}>สร้าง PDF เพื่อส่งให้ HR ผ่านอีเมลหรือแชท</Text>
        <Callout variant={status.startsWith('❌') ? 'error' : 'info'}>{status}</Callout>
        <View style={{ marginTop: 12 }}>
          <Button title={working ? 'กำลังสร้าง…' : 'สร้าง PDF'} onPress={generate} disabled={working} />
        </View>
      </Card>
      <Button title="← ย้อนกลับ" variant="ghost" onPress={() => navigation.goBack()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 80 },
  h2: { fontSize: 18, fontWeight: '600', marginBottom: 6 },
  help: { fontSize: 13, color: theme.colors.muted, marginBottom: 8 },
});
