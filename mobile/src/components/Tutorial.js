import React, { createContext, forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from '../lib/theme';

const TUTORIAL_KEY = 'bms-timesheet:tutorial-seen';

const STEPS = [
  {
    title: 'ยินดีต้อนรับ',
    skeleton: () => (
      <View style={[sk.stage, { alignItems: 'center', paddingVertical: 24 }]}>
        <Text style={{ fontSize: 36, marginBottom: 8 }}>📋</Text>
        <View style={[sk.bar, sk.h2, { width: '60%' }]} />
        <View style={[sk.bar, sk.line, { width: '80%' }]} />
        <View style={sk.flow}>
          <View style={sk.flowDot}><Text style={sk.flowText}>1</Text></View>
          <Text style={sk.flowArrow}>→</Text>
          <View style={sk.flowDot}><Text style={sk.flowText}>2</Text></View>
          <Text style={sk.flowArrow}>→</Text>
          <View style={sk.flowDot}><Text style={sk.flowText}>3</Text></View>
          <Text style={sk.flowArrow}>→</Text>
          <View style={sk.flowDot}><Text style={sk.flowText}>4</Text></View>
        </View>
      </View>
    ),
    body: (
      <>
        <Text style={s.p}>แอปนี้ช่วยคุณสร้าง<Text style={s.strong}>ใบชี้แจงเวลาทำงาน</Text>สำหรับวันที่เครื่องสแกนใบหน้าไม่ทำงาน เพื่อส่งให้ HR ในรูปแบบ PDF</Text>
        <Text style={s.li}>• ใช้งานได้บนมือถือทั้ง iOS และ Android</Text>
        <Text style={s.li}>• ทุกอย่างประมวลผลบนเครื่อง — ไม่ส่งข้อมูลออกอินเทอร์เน็ต</Text>
        <Text style={s.li}>• ใช้เวลาประมาณ 2-3 นาที</Text>
      </>
    ),
  },
  {
    title: 'ขั้นตอนที่ 1: ใส่ชื่อและอัปโหลด PDF',
    skeleton: () => (
      <View style={sk.stage}>
        <View style={sk.card}>
          <View style={[sk.bar, sk.h2, { width: '70%' }]} />
          <Text style={sk.label}>ชื่อพนักงาน</Text>
          <View style={sk.input} />
          <View style={sk.upload}>
            <Text style={{ fontSize: 22, color: theme.colors.muted }}>📄</Text>
            <View style={[sk.bar, sk.line, { width: '60%', backgroundColor: theme.colors.borderStrong, marginTop: 6 }]} />
          </View>
        </View>
      </View>
    ),
    body: (
      <>
        <Text style={s.p}>1. กรอก<Text style={s.strong}>ชื่อ-นามสกุล</Text> (ระบบจะจำไว้ครั้งต่อไป)</Text>
        <Text style={s.p}>2. อัปโหลดไฟล์ PDF ตารางเวลาประจำเดือนที่ HR ส่งให้</Text>
        <Text style={s.muted}>แอปจะอ่านไฟล์ทันทีและบอกว่ามีวันที่ต้องชี้แจงกี่วัน</Text>
      </>
    ),
  },
  {
    title: 'ขั้นตอนที่ 2: สแกนคลังรูปภาพ',
    skeleton: () => (
      <View style={sk.stage}>
        <View style={sk.card}>
          <View style={[sk.bar, sk.h2, { width: '55%' }]} />
          <View style={[sk.upload, { paddingVertical: 16 }]}>
            <Text style={{ fontSize: 22, color: theme.colors.muted }}>📷</Text>
          </View>
          <View style={sk.grid3}>
            {Array.from({ length: 6 }).map((_, i) => (<View key={i} style={[sk.photo, { width: '32%' }]} />))}
          </View>
        </View>
      </View>
    ),
    body: (
      <>
        <Text style={s.p}>กดปุ่ม <Text style={s.strong}>"สแกนคลังรูปภาพ"</Text> ครั้งแรกแอปจะขออนุญาตเข้าถึงรูปภาพ จากนั้นจะค้นเฉพาะรูปในเดือนที่ต้องชี้แจงให้อัตโนมัติ</Text>
        <Text style={s.li}>• รูปก่อน <Text style={s.strong}>8:30 น.</Text> = เข้างาน</Text>
        <Text style={s.li}>• รูปหลัง <Text style={s.strong}>17:30 น.</Text> = เลิกงาน</Text>
      </>
    ),
  },
  {
    title: 'ขั้นตอนที่ 3: ตรวจสอบและแก้ไข',
    skeleton: () => (
      <View style={sk.stage}>
        <View style={sk.card}>
          <View style={sk.row}>
            <View style={[sk.bar, sk.h3, { width: '45%' }]} />
            <View style={sk.badge} />
          </View>
          <View style={sk.grid2}>
            <View style={{ flex: 1 }}>
              <Text style={sk.label}>⏰ เข้างาน</Text>
              <View style={sk.photo} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={sk.label}>🌙 เลิกงาน</Text>
              <View style={sk.photo} />
            </View>
          </View>
          <Text style={sk.label}>เหตุผล</Text>
          <View style={sk.input} />
          <Text style={sk.label}>หมายเหตุ</Text>
          <View style={[sk.input, { height: 48 }]} />
        </View>
      </View>
    ),
    body: (
      <>
        <Text style={s.p}>ตรวจสอบรูปและเวลาในแต่ละวัน</Text>
        <Text style={s.li}>• เปลี่ยนรูปได้ถ้าจับคู่ผิด</Text>
        <Text style={s.li}>• เลือก<Text style={s.strong}>เหตุผล</Text> เช่น "เครื่องสแกนใบหน้าไม่ทำงาน"</Text>
        <Text style={s.li}>• เพิ่มหมายเหตุได้ตามต้องการ</Text>
      </>
    ),
  },
  {
    title: 'ขั้นตอนที่ 4: ส่งให้ HR',
    skeleton: () => (
      <View style={sk.stage}>
        <View style={sk.card}>
          <View style={[sk.pdfBar]} />
          <View style={[sk.bar, sk.line, { width: '90%' }]} />
          <View style={[sk.bar, sk.line, { width: '60%' }]} />
          <View style={[sk.grid2, { marginTop: 8 }]}>
            <View style={[sk.photo, { flex: 1 }]} />
            <View style={[sk.photo, { flex: 1 }]} />
          </View>
        </View>
        <View style={sk.btnRow}>
          <View style={sk.btnGhost}><Text style={{ fontSize: 11, color: theme.colors.muted }}>ย้อนกลับ</Text></View>
          <View style={sk.btnPrimary}><Text style={{ fontSize: 11, color: 'white' }}>แชร์ให้ HR</Text></View>
        </View>
      </View>
    ),
    body: (
      <>
        <Text style={s.p}>เมื่อกด <Text style={s.strong}>"ถัดไป → ส่งออก"</Text> แอปจะสร้าง PDF ให้อัตโนมัติ</Text>
        <Text style={s.p}>กด <Text style={s.strong}>"แชร์ให้ HR"</Text> เพื่อเลือกแอปอีเมลหรือแชทที่ต้องการส่ง</Text>
        <Text style={s.muted}>ชื่อไฟล์: {`{ชื่อ}-รายงานการเข้าออกงาน-{เดือน}-{ปี}.pdf`}</Text>
      </>
    ),
  },
];

const TutorialContext = createContext({ open: () => {} });
export const useTutorial = () => useContext(TutorialContext);

export const TutorialProvider = forwardRef(function TutorialProvider({ children }, ref) {
  const sheetRef = useRef(null);
  const [step, setStep] = useState(0);
  const snapPoints = useMemo(() => ['85%'], []);

  const open = useCallback(() => { setStep(0); sheetRef.current?.snapToIndex(0); }, []);
  const close = useCallback(() => {
    sheetRef.current?.close();
    AsyncStorage.setItem(TUTORIAL_KEY, '1');
  }, []);

  useImperativeHandle(ref, () => ({ open, close }), [open, close]);

  useEffect(() => {
    AsyncStorage.getItem(TUTORIAL_KEY).then((seen) => {
      if (!seen) setTimeout(open, 700);
    });
  }, [open]);

  const ctx = useMemo(() => ({ open }), [open]);
  const cur = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <TutorialContext.Provider value={ctx}>
      {children}
      <BottomSheet
        ref={sheetRef}
        snapPoints={snapPoints}
        index={-1}
        enablePanDownToClose
        onClose={() => AsyncStorage.setItem(TUTORIAL_KEY, '1')}
        backgroundStyle={{ backgroundColor: theme.colors.surface }}
        handleIndicatorStyle={{ backgroundColor: theme.colors.borderStrong }}>
        <BottomSheetView style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>{cur.title}</Text>
            <Pressable onPress={close} hitSlop={10} style={s.closeBtn}>
              <Text style={{ color: theme.colors.muted, fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>
          <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 8 }}>
            {cur.skeleton()}
            {cur.body}
          </ScrollView>
          <View style={s.footer}>
            <Pressable
              onPress={() => setStep((i) => Math.max(0, i - 1))}
              disabled={step === 0}
              style={[s.navBtn, s.navGhost, step === 0 && { opacity: .35 }]}>
              <Text style={[s.navText, { color: theme.colors.accent }]}>←</Text>
            </Pressable>
            <View style={s.dots}>
              {STEPS.map((_, i) => (
                <View key={i} style={[s.dot, i === step && s.dotActive]} />
              ))}
            </View>
            <Pressable
              onPress={() => isLast ? close() : setStep((i) => Math.min(STEPS.length - 1, i + 1))}
              style={[s.navBtn, s.navPrimary]}>
              <Text style={[s.navText, { color: 'white' }]}>{isLast ? 'เสร็จสิ้น' : 'ถัดไป →'}</Text>
            </Pressable>
          </View>
        </BottomSheetView>
      </BottomSheet>
    </TutorialContext.Provider>
  );
});

const s = StyleSheet.create({
  sheet: { flex: 1, paddingHorizontal: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, paddingBottom: 8 },
  title: { fontSize: 17, fontWeight: '600', color: theme.colors.text },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surface2, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1 },
  p: { fontSize: 14, color: theme.colors.text, lineHeight: 21, marginBottom: 8 },
  li: { fontSize: 14, color: theme.colors.text, lineHeight: 21, marginBottom: 4 },
  muted: { fontSize: 13, color: theme.colors.muted, marginTop: 8 },
  strong: { fontWeight: '700' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderTopWidth: 1, borderColor: theme.colors.border },
  dots: { flexDirection: 'row', flex: 1, justifyContent: 'center', gap: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.borderStrong },
  dotActive: { backgroundColor: theme.colors.accent, transform: [{ scale: 1.3 }] },
  navBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, minHeight: 38, alignItems: 'center', justifyContent: 'center' },
  navGhost: { borderWidth: 1, borderColor: theme.colors.border, minWidth: 50 },
  navPrimary: { backgroundColor: theme.colors.accent },
  navText: { fontSize: 14, fontWeight: '600' },
});

const sk = StyleSheet.create({
  stage: { backgroundColor: theme.colors.surface2, borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, padding: 12, marginVertical: 4 },
  card: { backgroundColor: 'white', borderColor: theme.colors.border, borderWidth: 1, borderRadius: 8, padding: 10 },
  bar: { backgroundColor: '#e2e8f0', height: 8, borderRadius: 4, marginBottom: 6 },
  h2: { height: 14, backgroundColor: theme.colors.borderStrong },
  h3: { height: 11, backgroundColor: theme.colors.borderStrong },
  line: { height: 7 },
  label: { fontSize: 11, color: theme.colors.muted, marginTop: 6, marginBottom: 4, fontWeight: '500' },
  input: { backgroundColor: 'white', borderColor: theme.colors.border, borderWidth: 1, borderRadius: 6, height: 30, marginBottom: 6 },
  upload: { borderWidth: 2, borderStyle: 'dashed', borderColor: theme.colors.borderStrong, borderRadius: 8, backgroundColor: theme.colors.surface2, paddingVertical: 14, alignItems: 'center', marginVertical: 6 },
  photo: { aspectRatio: 1, backgroundColor: theme.colors.borderStrong, borderRadius: 6 },
  grid2: { flexDirection: 'row', gap: 6, marginVertical: 6 },
  grid3: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  badge: { width: 50, height: 14, backgroundColor: '#fee2e2', borderRadius: 999 },
  pdfBar: { height: 18, backgroundColor: theme.colors.accent, borderRadius: 4, marginBottom: 6 },
  flow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 14 },
  flowDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: theme.colors.accent, alignItems: 'center', justifyContent: 'center' },
  flowText: { color: 'white', fontSize: 12, fontWeight: '700' },
  flowArrow: { color: theme.colors.muted, fontSize: 14 },
  btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: 8 },
  btnGhost: { borderWidth: 1, borderColor: theme.colors.border, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6 },
  btnPrimary: { backgroundColor: theme.colors.accent, paddingVertical: 5, paddingHorizontal: 10, borderRadius: 6 },
});

