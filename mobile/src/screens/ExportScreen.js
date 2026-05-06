import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import * as Sharing from 'expo-sharing';
import { useAppState } from '../core/state';
import { Card, Button, Callout } from '../components/ui';
import { theme } from '../lib/theme';
import { generatePDF } from '../lib/exporter';

export default function ExportScreen({ navigation }) {
  const state = useAppState();
  const [status, setStatus] = useState('⏳ กำลังสร้าง PDF…');
  const [error, setError] = useState(null);
  const [working, setWorking] = useState(true);
  const result = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await generatePDF(state);
        if (cancelled) return;
        result.current = r;
        setStatus(`✅ พร้อมส่ง: ${r.filename}`);
      } catch (e) {
        if (cancelled) return;
        setError(e.message);
      } finally {
        if (!cancelled) setWorking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const share = async () => {
    if (!result.current) return;
    const can = await Sharing.isAvailableAsync();
    if (!can) {
      setError('อุปกรณ์นี้ไม่รองรับการแชร์');
      return;
    }
    await Sharing.shareAsync(result.current.uri, {
      mimeType: 'application/pdf',
      UTI: 'com.adobe.pdf',
      dialogTitle: 'ส่งใบชี้แจงให้ HR',
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card>
        <Text style={styles.h2}>ตรวจสอบและส่งออก</Text>
        <Text style={styles.help}>สร้างไฟล์ PDF เพื่อส่งให้ HR ผ่านอีเมลหรือแชท</Text>
        <Callout variant={error ? 'error' : 'info'}>{error ? `❌ ${error}` : status}</Callout>
        <View style={{ marginTop: 12, gap: 8 }}>
          <Button title="แชร์ให้ HR" onPress={share} disabled={working || !!error} />
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
