import React, { useState } from 'react';
import { SafeAreaView, Text, TouchableOpacity, NativeModules, StyleSheet, View } from 'react-native';

// Import our custom Kotlin/Rust bridge!
const { RustCoreModule } = NativeModules;

const App = () => {
  const [rustMessage, setRustMessage] = useState('Waiting for Rust Core...');

  const triggerSystemCheck = async () => {
    try {
      // THIS calls JavaScript -> Kotlin -> C -> Rust!
      const result = await RustCoreModule.systemCheck();
      setRustMessage(result);
    } catch (error) {
      setRustMessage('Error connecting to Rust: ' + error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>LeGeberew Edge Node</Text>
        <Text style={styles.subtitle}>Digital Plant Doctor</Text>
        
        <Text style={styles.rustText}>{rustMessage}</Text>
        
        <TouchableOpacity style={styles.button} onPress={triggerSystemCheck}>
          <Text style={styles.buttonText}>Ping Rust Core</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f1', justifyContent: 'center', alignItems: 'center' },
  card: { backgroundColor: '#fff', padding: 24, borderRadius: 16, width: '85%', alignItems: 'center', elevation: 4 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32', marginBottom: 4 },
  subtitle: { fontSize: 16, color: '#555', marginBottom: 32 },
  rustText: { fontSize: 16, color: '#333', textAlign: 'center', marginBottom: 32, fontStyle: 'italic' },
  button: { backgroundColor: '#2E7D32', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});

export default App;
