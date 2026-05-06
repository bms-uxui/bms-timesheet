import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useAppState } from '../core/state';
import { Card, Button, Label, Input, Badge, Callout } from '../components/ui';
import { PdfParserWebView } from '../components/PdfParserWebView';
import { theme } from '../lib/theme';
import { fmtDate } from '../lib/format';
import { REASON_LABEL_MAP } from '../core/reasons';
import { buildTimesheetFromRows } from '../core/parser';

export default function ImportScreen({ navigation }) {
  const { userName, setUserName, timesheet, setTimesheet, missingDays, setMissingDays, setResolutions } = useAppState();
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState(null);
  const parserRef = useRef(null);

  const pickPDF = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const file = res.assets?.[0];
    if (!file?.uri) return;

    setParsing(true);
    setError(null);
    try {
      const rawRows = await parserRef.current?.parse(file.uri);
      if (!rawRows || rawRows.length === 0) {
        throw new Error('ไม่พบข้อมูลในไฟล์ PDF — ตรวจสอบว่าเป็น PDF ตารางเวลาจาก HR');
      }
      const ts = buildTimesheetFromRows(rawRows);
      setTimesheet(ts);
      setMissingDays(ts.missingDays);
      setResolutions({});
    } catch (e) {
      setError(e.message);
    } finally {
      setParsing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <PdfParserWebView ref={parserRef} />

      <Card>
        <Text style={styles.h2}>นำเข้าตารางเวลาจาก HR</Text>
        <Label>ชื่อพนักงาน</Label>
        <Input
          placeholder="ชื่อ-นามสกุล"
          value={userName}
          onChangeText={setUserName}
          autoCapitalize="words"
        />
        <Text style={styles.helpText}>ใช้สำหรับชื่อไฟล์ PDF ที่ส่งให้ HR</Text>

        <Pressable onPress={pickPDF} style={styles.upload} disabled={parsing}>
          <Text style={styles.uploadIcon}>📄</Text>
          <Text style={styles.uploadPrimary}>{parsing ? 'กำลังอ่านไฟล์ PDF…' : 'แตะเพื่อเลือกไฟล์ PDF'}</Text>
          <Text style={styles.uploadSecondary}>PDF ตารางเวลาประจำเดือนที่ได้รับจาก HR</Text>
        </Pressable>

        {error && <Callout variant="error">❌ {error}</Callout>}

        {timesheet && (
          <View style={{ marginTop: 16 }}>
            <View style={styles.summary}>
              <SummaryTile label="รายการ" value={timesheet.entries.length} />
              <SummaryTile label="ต้องชี้แจง" value={missingDays.length} />
            </View>
            <Text style={[styles.h3, { marginTop: 12 }]}>วันที่ต้องชี้แจง</Text>
            {missingDays.map((d) => (
              <View key={d.date.toISOString()} style={styles.dayRow}>
                <Text style={styles.dayDate}>{fmtDate(d.date)}</Text>
                <Badge>{REASON_LABEL_MAP[d.justificationReason] || d.justificationReason || ''}</Badge>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Button
        title="ถัดไป → เลือกรูปภาพ"
        disabled={!timesheet || missingDays.length === 0}
        onPress={() => navigation.navigate('Photos')}
      />
    </ScrollView>
  );
}

function SummaryTile({ label, value }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 80 },
  h2: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  h3: { fontSize: 15, fontWeight: '600' },
  helpText: { fontSize: 12, color: theme.colors.muted, marginTop: 4, marginBottom: 12 },
  upload: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface2,
    borderRadius: theme.radius.md,
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  uploadIcon: { fontSize: 28, marginBottom: 6 },
  uploadPrimary: { fontWeight: '600', fontSize: 15, color: theme.colors.text },
  uploadSecondary: { fontSize: 12, color: theme.colors.muted, marginTop: 4 },
  summary: { flexDirection: 'row', gap: 8 },
  tile: { flex: 1, backgroundColor: theme.colors.surface2, borderRadius: theme.radius.sm, padding: 12, alignItems: 'center' },
  tileValue: { fontSize: 22, fontWeight: '700', color: theme.colors.text },
  tileLabel: { fontSize: 12, color: theme.colors.muted },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderColor: theme.colors.border },
  dayDate: { fontWeight: '600', fontSize: 14 },
});
