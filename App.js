import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity } from 'react-native';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDslPvFB_6oKx55nOy-6YcZGy3wJj-b4ho",
  authDomain: "habarim-64231.firebaseapp.com",
  projectId: "habarim-64231",
  appId: "1:65930868923:web:ac4baa99965bb18592519e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export default function App() {
  const [user, setUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  
  useEffect(() => {
    // User ma'lumotlarini yuklash
    loadUser();
  }, []);
  
  const loadUser = async () => {
    const savedUser = await AsyncStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  };
  
  const login = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    setUser(result.user);
    await AsyncStorage.setItem('user', JSON.stringify(result.user));
  };
  
  const sendMessage = async () => {
    if (!input.trim()) return;
    
    const newMessage = {
      id: Date.now(),
      text: input,
      user: user.displayName,
      time: new Date().toISOString()
    };
    
    setMessages([...messages, newMessage]);
    setInput('');
    
    // Backend ga yuborish
    const res = await fetch('https://upg-chat-backend.onrender.com/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input, userId: user.uid })
    });
    
    const data = await res.json();
    setMessages(prev => [...prev, {
      id: Date.now() + 1,
      text: data.reply,
      user: 'AI',
      time: new Date().toISOString()
    }]);
  };
  
  return (
    <View style={{ flex: 1, backgroundColor: '#212121', paddingTop: 50 }}>
      {!user ? (
        <TouchableOpacity onPress={login}>
          <Text>Google bilan kirish</Text>
        </TouchableOpacity>
      ) : (
        <>
          <FlatList
            data={messages}
            renderItem={({ item }) => (
              <View style={{ 
                alignSelf: item.user === user.displayName ? 'flex-end' : 'flex-start',
                backgroundColor: item.user === user.displayName ? '#3b82f6' : '#2f2f2f',
                padding: 10,
                margin: 5,
                borderRadius: 10
              }}>
                <Text style={{ color: '#fff' }}>{item.text}</Text>
              </View>
            )}
          />
          
          <View style={{ flexDirection: 'row', padding: 10 }}>
            <TextInput
              value={input}
              onChangeText={setInput}
              style={{ flex: 1, backgroundColor: '#2f2f2f', color: '#fff', padding: 10 }}
              placeholder="Xabar yozing..."
            />
            <TouchableOpacity onPress={sendMessage}>
              <Text>Yuborish</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}