import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, Text, TouchableOpacity, NativeModules, 
  StyleSheet, View, Image, ActivityIndicator, ScrollView,
  PermissionsAndroid, Platform, FlatList
} from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';

const { RustCoreModule } = NativeModules;

const App = () => {
  // AI States
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Bluetooth States
  const [btStatus, setBtStatus] = useState<string>('Initializing...');
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [pairedDevices, setPairedDevices] = useState<BluetoothDevice[]>([]);
  
  // IoT Sensor States
  const [temperature, setTemperature] = useState<string>('--');
  const [moisture, setMoisture] = useState<string>('--');

  useEffect(() => {
    requestBluetoothPermissions();
    // Cleanup Bluetooth connection on app close
    return () => { if (connectedDevice) connectedDevice.disconnect(); };
  }, [connectedDevice]);

  // --- 1. BLUETOOTH CONNECTION LOGIC ---
  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      let granted = false;
      if (Platform.Version >= 31) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        ]);
        granted = result['android.permission.BLUETOOTH_CONNECT'] === 'granted';
      } else {
        const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        granted = result === 'granted';
      }
      if (granted) getPairedDevices();
      else setBtStatus('Bluetooth Permission Denied');
    }
  };

  const getPairedDevices = async () => {
    try {
      setBtStatus('Looking for Edge Nodes...');
      const devices = await RNBluetoothClassic.getBondedDevices();
      setPairedDevices(devices);
      setBtStatus(`Found ${devices.length} paired devices. Select HC-05 below.`);
    } catch (err) {
      setBtStatus('Failed to get paired devices');
    }
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    setBtStatus(`Connecting to ${device.name}...`);
    try {
      const connected = await device.connect();
      if (connected) {
        setConnectedDevice(device);
        setBtStatus(`Connected to ${device.name} ✅`);
        
        // Start listening to the UART Data Stream!
        device.onDataReceived((data) => parseHardwareData(data.data));
      }
    } catch (error) {
      setBtStatus(`Connection failed to ${device.name}`);
    }
  };

  // --- 2. IoT PARSING LOGIC ($TEMP:24;MOIST:65;) ---
  // The buffer holds partial strings since UART data arrives in chunks
  let dataBuffer = ""; 
  const parseHardwareData = (data: string) => {
    dataBuffer += data;
    // Look for the delimiter ';' which ends a packet
    if (dataBuffer.includes(';')) {
      const packets = dataBuffer.split(';');
      
      // Process all complete packets
      for (let i = 0; i < packets.length - 1; i++) {
        const packet = packets[i].trim();
        if (packet.startsWith('$TEMP:')) {
          setTemperature(packet.replace('$TEMP:', ''));
        } else if (packet.startsWith('MOIST:')) {
          setMoisture(packet.replace('MOIST:', ''));
        }
      }
      // Keep the incomplete packet in the buffer
      dataBuffer = packets[packets.length - 1]; 
    }
  };

  // --- 3. EXISTING AI LOGIC ---
  const runAI = async (uri: string) => {
    setIsProcessing(true); setDiagnosis(null); setErrorMsg(null);
    try {
      const jsonString = await RustCoreModule.scanLeaf(uri);
      const resultObj = JSON.parse(jsonString);
      if (resultObj.error) setErrorMsg(resultObj.error);
      else setDiagnosis(resultObj);
    } catch (error: any) {
      setErrorMsg('Inference Failed: ' + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const openCamera = async () => {
    const result = await ImagePicker.launchCamera({ mediaType: 'photo', quality: 0.8 });
    if (result.assets?.[0]?.uri) { setImageUri(result.assets[0].uri); runAI(result.assets[0].uri); }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.title}>LeGeberew</Text>
          <Text style={styles.subtitle}>Digital Plant Doctor 🇪🇹</Text>
        </View>

        {/* --- BLUETOOTH DASHBOARD --- */}
        <View style={styles.btBox}>
          <Text style={styles.btText}>📡 {btStatus}</Text>
          
          {/* Device Selection List */}
          {!connectedDevice && pairedDevices.length > 0 && (
            <View style={styles.deviceList}>
              {pairedDevices.map(device => (
                <TouchableOpacity key={device.address} style={styles.deviceBtn} onPress={() => connectToDevice(device)}>
                  <Text style={styles.deviceBtnText}>Connect: {device.name} ({device.address})</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* IoT Telemetry Gauges */}
          {connectedDevice && (
            <View style={styles.sensorRow}>
              <View style={styles.sensorCard}>
                <Text style={styles.sensorIcon}>🌡️</Text>
                <Text style={styles.sensorValue}>{temperature}°C</Text>
                <Text style={styles.sensorLabel}>Temp / የሙቀት</Text>
              </View>
              <View style={styles.sensorCard}>
                <Text style={styles.sensorIcon}>💧</Text>
                <Text style={styles.sensorValue}>{moisture}%</Text>
                <Text style={styles.sensorLabel}>Moisture / እርጥበት</Text>
              </View>
            </View>
          )}
        </View>

        {/* --- AI SCANNER --- */}
        <View style={styles.imageBox}>
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : <Text style={styles.placeholderText}>No Leaf Selected</Text>}
        </View>

        {isProcessing && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#2E7D32" />
            <Text style={styles.loadingText}>Rust AI is analyzing...</Text>
          </View>
        )}

        {diagnosis && !isProcessing && (
          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>Diagnosis / የህመም አይነት:</Text>
            <Text style={styles.diseaseText}>{diagnosis.disease_amharic}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${diagnosis.confidence}%` }]} />
            </View>
            <Text style={styles.confidenceText}>{diagnosis.confidence.toFixed(2)}%</Text>
          </View>
        )}

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.button} onPress={openCamera}><Text style={styles.buttonText}>📷 Take Photo</Text></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f7f6' },
  scroll: { alignItems: 'center', paddingVertical: 20 },
  header: { alignItems: 'center', marginBottom: 10 },
  title: { fontSize: 32, fontWeight: '900', color: '#1B5E20' },
  subtitle: { fontSize: 16, color: '#555', fontStyle: 'italic' },
  
  // Bluetooth & Sensor Styles
  btBox: { width: '85%', backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12, marginBottom: 20, alignItems: 'center', borderWidth: 1, borderColor: '#C8E6C9', elevation: 2 },
  btText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 14, textAlign: 'center', marginBottom: 10 },
  deviceList: { width: '100%' },
  deviceBtn: { backgroundColor: '#81C784', padding: 10, borderRadius: 6, marginVertical: 4 },
  deviceBtnText: { color: '#fff', fontWeight: 'bold', textAlign: 'center' },
  sensorRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 10 },
  sensorCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, width: '48%', alignItems: 'center', elevation: 1 },
  sensorIcon: { fontSize: 24, marginBottom: 5 },
  sensorValue: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  sensorLabel: { fontSize: 10, color: '#757575', marginTop: 5 },

  // AI Styles
  imageBox: { width: 300, height: 300, backgroundColor: '#e0e0e0', borderRadius: 16, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 5, marginBottom: 20 },
  image: { width: '100%', height: '100%' },
  placeholderText: { color: '#757575', fontSize: 16 },
  loadingBox: { alignItems: 'center', marginVertical: 20 },
  loadingText: { marginTop: 10, color: '#2E7D32', fontWeight: 'bold' },
  resultBox: { width: '85%', backgroundColor: '#fff', padding: 20, borderRadius: 12, elevation: 3, marginBottom: 20 },
  resultLabel: { fontSize: 14, color: '#757575', marginTop: 10 },
  diseaseText: { fontSize: 20, fontWeight: 'bold', color: '#b71c1c', marginTop: 5 },
  progressBarBg: { height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, marginTop: 10, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#2E7D32' },
  confidenceText: { textAlign: 'right', marginTop: 5, fontWeight: 'bold', color: '#2E7D32' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', width: '85%' },
  button: { flex: 1, backgroundColor: '#2E7D32', padding: 15, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default App;
