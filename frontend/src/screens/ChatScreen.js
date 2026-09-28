import React, { useCallback, useMemo } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ConnectionBanner from '../components/ConnectionBanner';
import EmptyState from '../components/EmptyState';
import MessageBubble from '../components/MessageBubble';
import MessageInput from '../components/MessageInput';
import OnlineStatus from '../components/OnlineStatus';
import TypingIndicator from '../components/TypingIndicator';
import UserAvatar from '../components/UserAvatar';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import useChat from '../hooks/useChat';
import { displayName } from '../utils/formatTime';

export default function ChatScreen({ route, navigation }) {
  const { partner } = route.params;
  const { user } = useAuth();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const chat = useChat(user, partner);
  const partnerName = displayName(partner.username);
  const { discard, retry } = chat;

  const handleFailedPress = useCallback(
    (message) => {
      Alert.alert(
        'Message not sent',
        message.errorMessage || 'Something went wrong.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => discard(message),
          },
          { text: 'Retry', onPress: () => retry(message) },
        ],
      );
    },
    [discard, retry],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <MessageBubble
        message={item}
        isMine={item.senderId === user._id}
        onPressFailed={handleFailedPress}
      />
    ),
    [user._id, handleFailedPress],
  );

  // Inverted list: newest at the bottom, stays pinned there, older pages load on scroll up
  const data = useMemo(() => [...chat.messages].reverse(), [chat.messages]);

  let body;
  if (chat.loading) {
    body = <EmptyState loading title="Loading messages..." />;
  } else if (chat.error) {
    body = (
      <EmptyState
        title="Couldn't load messages"
        subtitle={chat.error}
        actionLabel="Try again"
        onAction={chat.reload}
      />
    );
  } else if (chat.messages.length === 0) {
    body = (
      <EmptyState
        title="No messages yet."
        subtitle="Start the conversation 👋"
      />
    );
  } else {
    body = (
      <FlatList
        inverted
        data={data}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        onEndReached={chat.loadOlder}
        onEndReachedThreshold={0.3}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListFooterComponent={
          chat.loadingMore ? (
            <Text style={[styles.loadingMore, { color: theme.secondaryText }]}>
              Loading earlier messages...
            </Text>
          ) : null
        }
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior="padding"
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.surface,
            borderBottomColor: theme.border,
            paddingTop: insets.top + 8,
          },
        ]}
      >
        <Pressable
          onPress={() => navigation.goBack()}
          hitSlop={8}
          style={styles.back}
          accessibilityLabel="Go back"
        >
          <Text style={[styles.backIcon, { color: theme.primary }]}>←</Text>
        </Pressable>
        <UserAvatar name={partner.username} size={40} />
        <View style={styles.headerText}>
          <Text style={[styles.headerName, { color: theme.text }]}>
            {partnerName}
          </Text>
          <OnlineStatus
            isOnline={chat.partnerStatus.isOnline}
            lastSeen={chat.partnerStatus.lastSeen}
          />
        </View>
      </View>

      <ConnectionBanner />
      <View style={styles.body}>{body}</View>
      {chat.isTyping ? <TypingIndicator name={partnerName} /> : null}
      <MessageInput onSend={chat.send} onTextChange={chat.handleTextChange} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: { fontSize: 24 },
  headerText: { marginLeft: 12, flex: 1 },
  headerName: { fontSize: 17, fontWeight: '700' },
  body: { flex: 1 },
  list: { paddingVertical: 10 },
  loadingMore: { textAlign: 'center', fontSize: 12, paddingVertical: 8 },
});
