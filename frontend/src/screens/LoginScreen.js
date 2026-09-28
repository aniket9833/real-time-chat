import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { getErrorMessage } from '../services/api';

const USERNAME_REGEX = /^[a-z0-9_.-]+$/;

function validate(raw) {
  const value = raw.trim().toLowerCase();
  if (!value) return 'Please enter a username';
  if (value.length < 2 || value.length > 20)
    return 'Username must be 2-20 characters';
  if (!USERNAME_REGEX.test(value))
    return 'Use only letters, numbers, dots, dashes and underscores';
  return null;
}

export default function LoginScreen() {
  const { login } = useAuth();
  const { theme } = useTheme();
  const [username, setUsername] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    const validationError = validate(username);
    if (validationError) return setError(validationError);
    setError(null);
    setSubmitting(true);
    try {
      await login(username.trim());
    } catch (err) {
      setError(getErrorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <Text style={styles.logo}>💬</Text>
        <Text style={[styles.title, { color: theme.text }]}>ChatFlow</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>
          Choose your username
        </Text>

        <TextInput
          value={username}
          onChangeText={(v) => {
            setUsername(v);
            if (error) setError(null);
          }}
          placeholder="Enter username"
          placeholderTextColor={theme.secondaryText}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={20}
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
          editable={!submitting}
          style={[
            styles.input,
            {
              backgroundColor: theme.surface,
              color: theme.text,
              borderColor: error ? theme.danger : theme.border,
            },
          ]}
        />
        {error ? (
          <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>
        ) : null}

        <Pressable
          onPress={handleSubmit}
          disabled={submitting}
          accessibilityRole="button"
          style={[
            styles.button,
            { backgroundColor: theme.primary, opacity: submitting ? 0.7 : 1 },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color={theme.onPrimary} />
          ) : (
            <Text style={[styles.buttonText, { color: theme.onPrimary }]}>
              Continue
            </Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  logo: { fontSize: 48, textAlign: 'center' },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center', marginTop: 8 },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 32,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
  },
  error: { fontSize: 13, marginTop: 8 },
  button: {
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  buttonText: { fontSize: 16, fontWeight: '700' },
});
