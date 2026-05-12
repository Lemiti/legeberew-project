import React, { useState, useEffect } from 'react';
import { 
  SafeAreaView, Text, TouchableOpacity, NativeModules, 
  StyleSheet, View, ScrollView, Image, ActivityIndicator,
  PermissionsAndroid, Platform
} from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import RNBluetoothClassic, { BluetoothDevice } from 'react-native-bluetooth-classic';

const { RustCoreModule } = NativeModules;

// Custom "Tibeb" Geometric Pattern Divider
const TibebDivider = () => (
  <View style={styles.tibebContainer}>
    {[...Array(12)].map((_, i) => (
      <View key={i} style={[styles.tibebDiamond, { backgroundColor: i % 2 === 0 ? '#2D5A27' : '#6F4E37' }]} />
    ))}
  </View>
);

const App = () => {
  // --- STATE MANAGEMENT ---
  const [activeTab, setActiveTab] = useState<'home' | 'crop' | 'settings' | 'profile'>('home');
  const [temperature, setTemperature] = useState<string>('--');
  const [moisture, setMoisture] = useState<string>('--');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [diagnosis, setDiagnosis] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedCrop, setSelectedCrop] = useState<'tomato' | 'coffee'>('tomato');
  
  // Bluetooth States
  const [btStatus, setBtStatus] = useState<string>('Initializing...');
  const [connectedDevice, setConnectedDevice] = useState<BluetoothDevice | null>(null);
  const [pairedDevices, setPairedDevices] = useState<BluetoothDevice[]>([]);

  useEffect(() => {
    requestBluetoothPermissions();
    return () => { if (connectedDevice) connectedDevice.disconnect(); };
  }, [connectedDevice]);

  // --- BLUETOOTH & IoT LOGIC ---
  const requestBluetoothPermissions = async () => {
    if (Platform.OS === 'android') {
      let granted = false;
      if (Number(Platform.Version) >= 31) {
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
      const devices = await RNBluetoothClassic.getBondedDevices();
      setPairedDevices(devices);
      setBtStatus(devices.length > 0 ? `Found ${devices.length} devices` : 'No paired devices');
    } catch (err) { setBtStatus('Failed to find devices'); }
  };

  const connectToDevice = async (device: BluetoothDevice) => {
    setBtStatus(`Connecting...`);
    try {
      const connected = await device.connect();
      if (connected) {
        setConnectedDevice(device);
        setBtStatus(`Connected to ${device.name} ✅`);
        device.onDataReceived((data) => parseHardwareData(data.data));
      }
    } catch (error) { setBtStatus(`Connection failed`); }
  };

  let dataBuffer = ""; 
  const parseHardwareData = (data: string) => {
    dataBuffer += data;
    if (dataBuffer.includes(';')) {
      const packets = dataBuffer.split(';');
      for (let i = 0; i < packets.length - 1; i++) {
        const packet = packets[i].trim();
        if (packet.startsWith('$TEMP:')) setTemperature(packet.replace('$TEMP:', ''));
        else if (packet.startsWith('MOIST:')) setMoisture(packet.replace('MOIST:', ''));
      }
      dataBuffer = packets[packets.length - 1]; 
    }
  };

  // --- AI LOGIC ---
  const runAI = async (uri: string) => {
    setIsProcessing(true); setDiagnosis(null); setErrorMsg(null);
    try {
      const jsonString = await RustCoreModule.scanLeaf(uri);
      const resultObj = JSON.parse(jsonString);
      if (resultObj.error) setErrorMsg(resultObj.error);
      else setDiagnosis(resultObj);
    } catch (error: any) { setErrorMsg('Inference Failed: ' + error.message); } 
    finally { setIsProcessing(false); }
  };

  const openCamera = async () => {
    const result = await ImagePicker.launchCamera({ mediaType: 'photo', quality: 0.8 });
    if (result.assets?.[0]?.uri) { setImageUri(result.assets[0].uri); runAI(result.assets[0].uri); }
  };

  const openGallery = async () => {
    const result = await ImagePicker.launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets?.[0]?.uri) { setImageUri(result.assets[0].uri); runAI(result.assets[0].uri); }
  };

  // --- RENDER SCREENS ---
const renderHome = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerAmharic}>ለገበሬው</Text>
        <Text style={styles.headerEnglish}>LeGeberew</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitleCenter}>Welcome / እንኳን ደህና መጡ</Text>
        <Text style={styles.descriptionText}>
          LeGeberew is your offline Digital Plant Doctor. Use this dashboard to monitor your soil health, 
          or navigate to the Crop Health tab to scan leaves for diseases using Edge AI.
        </Text>
        <TibebDivider />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitleCenter}>Live Soil Data (የአፈር መረጃ)</Text>
        <View style={styles.telemetryRow}>
          <View style={styles.gaugeContainer}>
            <Text style={styles.gaugeTitle}>Soil Temperature</Text>
            <Text style={styles.gaugeSub}>(የአፈር ሙቀት)</Text>
            <View style={[styles.gaugeCircle, { borderTopColor: '#2D5A27', borderRightColor: '#2D5A27' }]}>
              <Text style={styles.gaugeValue}>{temperature}°C</Text>
            </View>
            <Text style={styles.gaugeFooter}>🌡️ Optimal / ጥሩ</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.gaugeContainer}>
            <Text style={styles.gaugeTitle}>Soil Humidity</Text>
            <Text style={styles.gaugeSub}>(የአፈር እርጥበት)</Text>
            <View style={[styles.gaugeCircle, { borderTopColor: '#0277BD', borderLeftColor: '#0277BD' }]}>
              <Text style={styles.gaugeValue}>{moisture}%</Text>
            </View>
            <Text style={styles.gaugeFooter}>💧 Optimal / ጥሩ</Text>
          </View>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: '#E8F5E9', borderColor: '#2D5A27', borderWidth: 1 }]}>
        <Text style={[styles.cardTitle, { color: '#2D5A27', marginBottom: 5 }]}>💡 Tip of the Day</Text>
        <Text style={styles.tipTextAmharic}>ውሃን ለመቆጠብ እና ትነትን ለመቀነስ ሰብልዎን በማለዳ ወይም በማታ ያጠጡ።</Text>
        <Text style={styles.tipTextEnglish}>Water your crops early in the morning or late evening to save water.</Text>
      </View>

      <View style={{height: 100}} />
    </ScrollView>
  );

const renderCropHealth = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerAmharic}>የተክሉ ጤና</Text>
        <Text style={styles.headerEnglish}>Plant Health</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitleCenter}>AI Disease Scanner</Text>
        <View style={styles.cropToggleRow}>
          <TouchableOpacity style={[styles.cropBox, selectedCrop === 'tomato' ? styles.cropBoxActive : null]} onPress={() => setSelectedCrop('tomato')}>
            <Text style={styles.cropIcon}>🍅</Text>
            <Text style={styles.cropText}>ቲማቲም</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.cropBox, selectedCrop === 'coffee' ? styles.cropBoxActive : null]} onPress={() => setSelectedCrop('coffee')}>
            <Text style={styles.cropIcon}>☕</Text>
            <Text style={styles.cropText}>ቡና</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.scanBtn} onPress={openCamera}>
            <Text style={styles.scanBtnText}>📷 Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryBtn} onPress={openGallery}>
            <Text style={styles.galleryBtnText}>📁 Gallery</Text>
          </TouchableOpacity>
        </View>

        {!!imageUri && <Image source={{ uri: imageUri }} style={styles.previewImage} />}
        {!!isProcessing && <ActivityIndicator size="large" color="#2D5A27" style={{marginVertical: 10}} />}
        {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}
        
        {!!diagnosis && !isProcessing ? (
          <View style={styles.diagnosisBox}>
            <Text style={styles.resultLabel}>Diagnosis / የህመም አይነት:</Text>
            <Text style={styles.diseaseText}>{diagnosis.disease_amharic}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${diagnosis.confidence}%` }]} />
            </View>
            <Text style={styles.confidenceText}>{diagnosis.confidence?.toFixed(1)}%</Text>
          </View>
        ) : null}
      </View>

      <TouchableOpacity style={styles.historyBtnGreen}>
        <Text style={styles.historyBtnText}>AI Diagnosis History</Text>
        <Text style={styles.historyBtnSub}>(የምርመራ ታሪክ)</Text>
      </TouchableOpacity>

      <View style={{height: 100}} />
    </ScrollView>
  );
// ==========================================
  // STEP 4: THE "SETTINGS" SCREEN (Bluetooth)
  // ==========================================
  const renderSettings = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerAmharic}>ማስተካከያዎች</Text>
        <Text style={styles.headerEnglish}>Settings & Edge Node</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.btHeaderRow}>
          <Text style={styles.cardTitle}>Bluetooth Connection</Text>
          <Text style={styles.btIcon}>ᛒ</Text>
        </View>

        <Text style={styles.descriptionText}>
          Pair your phone with the LeGeberew Edge Node (HC-05) via your phone's standard Bluetooth settings first. Then, select it below.
        </Text>

        <View style={styles.btStatusBox}>
          <View style={styles.btIconBox}>
            <Text style={styles.btIconLarge}>🛜</Text>
            <View style={[styles.btDot, connectedDevice ? styles.btDotOn : styles.btDotOff]} />
          </View>
          <View style={styles.btInfo}>
            <Text style={styles.btDeviceText}>{btStatus}</Text>
            {connectedDevice ? (
              <Text style={styles.btSubText}>(መሣሪያ ተገናኝቷል - Ready!)</Text>
            ) : (
              <Text style={styles.btSubText}>(እባክዎ መሣሪያ ይምረጡ)</Text>
            )}
          </View>
        </View>

        {/* REFRESH BUTTON */}
        {!connectedDevice && (
          <TouchableOpacity style={styles.refreshBtn} onPress={getPairedDevices}>
            <Text style={styles.refreshBtnText}>🔄 Refresh Devices</Text>
          </TouchableOpacity>
        )}

        {/* DEVICE LIST */}
        {!connectedDevice && pairedDevices.length > 0 && (
          <View style={styles.deviceListContainer}>
            <Text style={styles.deviceListTitle}>Paired Devices / የተጣመሩ መሣሪያዎች:</Text>
            {pairedDevices.map(d => (
              <TouchableOpacity key={d.address} style={styles.connectBtnLarge} onPress={() => connectToDevice(d)}>
                <Text style={styles.connectBtnTextLarge}>{d.name}</Text>
                <Text style={styles.deviceAddressText}>{d.address}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* DISCONNECT BUTTON */}
        {connectedDevice && (
          <TouchableOpacity 
            style={styles.disconnectBtn} 
            onPress={() => {
              connectedDevice.disconnect();
              setConnectedDevice(null);
              setBtStatus('Disconnected');
              getPairedDevices();
            }}
          >
            <Text style={styles.disconnectBtnText}>❌ Disconnect Edge Node</Text>
          </TouchableOpacity>
        )}

        <TibebDivider />
      </View>

      <View style={{height: 90}} />
    </ScrollView>
  );
// ==========================================
  // STEP 5: THE "PROFILE" SCREEN (Farmer Info)
  // ==========================================
  const renderProfile = () => (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.headerAmharic}>የእርሶ መረጃ</Text>
        <Text style={styles.headerEnglish}>Farmer Profile</Text>
      </View>

      {/* AVATAR & NAME CARD */}
      <View style={[styles.card, { alignItems: 'center' }]}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarIcon}>👤</Text>
        </View>
        <Text style={styles.profileName}>Ato Lemi</Text>
        <Text style={styles.profileRole}>LeGeberew User / የለገበሬው ተጠቃሚ</Text>
        <TibebDivider />
      </View>

      {/* FARM DETAILS CARD */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Farm Details (የእርሻ መረጃ)</Text>
        
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Region (ክልል):</Text>
          <Text style={styles.profileValue}>Oromia (ኦሮሚያ)</Text>
        </View>
        <View style={styles.dividerHorizontal} />

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Primary Crop (ዋና ሰብል):</Text>
          <Text style={styles.profileValue}>Coffee (ቡና)</Text>
        </View>
        <View style={styles.dividerHorizontal} />

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Farm Size (የእርሻ ስፋት):</Text>
          <Text style={styles.profileValue}>2.5 Hectares (ሄክታር)</Text>
        </View>
      </View>

      {/* APP INFO CARD */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>System Information</Text>
        
        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>Edge Node ID:</Text>
          <Text style={styles.profileValue}>{connectedDevice ? connectedDevice.address : "Not Connected"}</Text>
        </View>
        <View style={styles.dividerHorizontal} />

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>AI Model Engine:</Text>
          <Text style={styles.profileValue}>Rust (Tract) v0.21</Text>
        </View>
        <View style={styles.dividerHorizontal} />

        <View style={styles.profileRow}>
          <Text style={styles.profileLabel}>App Version:</Text>
          <Text style={styles.profileValue}>1.0.0 (Offline Mode)</Text>
        </View>
      </View>

      {/* LOGOUT / SUPPORT BUTTON */}
      <TouchableOpacity style={styles.supportBtn}>
        <Text style={styles.supportBtnText}>📞 Contact Agronomist Support</Text>
      </TouchableOpacity>

      <View style={{height: 90}} />
    </ScrollView>
  );

  const renderCurrentScreen = () => {
    switch (activeTab) {
      case 'home': return renderHome();
      case 'crop': return renderCropHealth();
	case 'settings': return renderSettings();
	case 'profile': return renderProfile();
      default: return renderHome();
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {renderCurrentScreen()}
      <View style={styles.bottomNav}>
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('home')}>
          <Text style={activeTab === 'home' ? styles.navIconActive : styles.navIcon}>🏠</Text>
          <Text style={activeTab === 'home' ? styles.navTextActive : styles.navText}>Home</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('crop')}>
          <Text style={activeTab === 'crop' ? styles.navIconActive : styles.navIcon}>🌱</Text>
          <Text style={activeTab === 'crop' ? styles.navTextActive : styles.navText}>Crop Health</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('settings')}>
          <Text style={activeTab === 'settings' ? styles.navIconActive : styles.navIcon}>⚙️</Text>
          <Text style={activeTab === 'settings' ? styles.navTextActive : styles.navText}>Settings</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.navItem} onPress={() => setActiveTab('profile')}>
          <Text style={activeTab === 'profile' ? styles.navIconActive : styles.navIcon}>👤</Text>
          <Text style={activeTab === 'profile' ? styles.navTextActive : styles.navText}>Profile</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#2D5A27' },
  scrollContent: { backgroundColor: '#F5F5DC', flexGrow: 1, padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  header: { alignItems: 'center', marginVertical: 15 },
  headerAmharic: { fontSize: 28, fontWeight: 'bold', color: '#2D5A27' },
  headerEnglish: { fontSize: 18, fontWeight: '900', color: '#6F4E37' },
  card: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 15, elevation: 4 },
  cardTitleCenter: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  descriptionText: { fontSize: 13, color: '#555', textAlign: 'center' },
  tibebContainer: { flexDirection: 'row', justifyContent: 'center', marginVertical: 10 },
  tibebDiamond: { width: 8, height: 8, transform: [{ rotate: '45deg' }], marginHorizontal: 2 },
  telemetryRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  divider: { width: 1, height: 50, backgroundColor: '#EEE' },
  gaugeContainer: { alignItems: 'center' },
  gaugeTitle: { fontSize: 12, color: '#666', marginBottom: 5 },
  gaugeCircle: { width: 70, height: 70, borderRadius: 35, borderWidth: 5, borderColor: '#EEE', justifyContent: 'center', alignItems: 'center' },
  gaugeValue: { fontSize: 18, fontWeight: 'bold' },
  cropToggleRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 15 },
  cropBox: { padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#DDD', alignItems: 'center', width: '40%' },
  cropBoxActive: { borderColor: '#2D5A27', backgroundColor: '#E8F5E9' },
  cropIcon: { fontSize: 24 },
  cropText: { fontSize: 12, fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  scanBtn: { backgroundColor: '#2D5A27', padding: 12, borderRadius: 10, flex: 0.48, alignItems: 'center' },
  galleryBtn: { backgroundColor: '#6F4E37', padding: 12, borderRadius: 10, flex: 0.48, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
  previewImage: { width: '100%', height: 200, borderRadius: 15, marginTop: 15 },
  errorText: { color: 'red', textAlign: 'center', marginTop: 10 },
  diagnosisBox: { marginTop: 15, padding: 15, backgroundColor: '#F9F9F9', borderRadius: 10 },
  resultLabel: { fontSize: 12, color: '#777' },
  diseaseText: { fontSize: 18, fontWeight: 'bold', color: '#B71C1C' },
  confidenceText: { fontSize: 12, color: '#2D5A27', fontWeight: 'bold', marginTop: 5 },
  bottomNav: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: '#2D5A27', flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 12, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  navItem: { alignItems: 'center' },
  navIconActive: { fontSize: 20, color: '#FFD54F' },
  navTextActive: { color: '#FFD54F', fontSize: 10, fontWeight: 'bold' },
  navIcon: { fontSize: 20, opacity: 0.5 },
  navText: { color: '#A5D6A7', fontSize: 10 },
// --- New Styles for Step 4 (Settings / Bluetooth) ---
  refreshBtn: { backgroundColor: '#F5F5DC', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 15, borderWidth: 1, borderColor: '#6F4E37' },
  refreshBtnText: { color: '#6F4E37', fontWeight: 'bold', fontSize: 14 },
  
  deviceListContainer: { marginTop: 20 },
  deviceListTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  connectBtnLarge: { backgroundColor: '#1A4314', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2 },
  connectBtnTextLarge: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  deviceAddressText: { color: '#A5D6A7', fontSize: 12, marginTop: 2 },
  
  disconnectBtn: { backgroundColor: '#B71C1C', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 20, elevation: 2 },
  disconnectBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
// --- New Styles for Step 5 (Profile) ---
  avatarCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 3, borderColor: '#2D5A27' },
  avatarIcon: { fontSize: 50 },
  profileName: { fontSize: 24, fontWeight: '900', color: '#1A4314' },
  profileRole: { fontSize: 14, color: '#6F4E37', fontStyle: 'italic', marginBottom: 10 },
  
  profileRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  profileLabel: { fontSize: 14, color: '#555', flex: 1 },
  profileValue: { fontSize: 14, fontWeight: 'bold', color: '#333', textAlign: 'right', flex: 1 },
  dividerHorizontal: { width: '100%', height: 1, backgroundColor: '#E0E0E0' },

  supportBtn: { backgroundColor: '#FFF', padding: 15, borderRadius: 15, alignItems: 'center', borderWidth: 2, borderColor: '#6F4E37', marginBottom: 20 },
  supportBtnText: { color: '#6F4E37', fontSize: 16, fontWeight: 'bold' },
});

export default App;
