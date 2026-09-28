import React, { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { formatTime } from '../utils/formatTime';

function StatusTicks({ status, theme }) {
  switch (status) {
    case 'sending':
      return (
        <Text style={[styles.tick, { color: theme.messageSentMeta }]}>🕓</Text>
      );
    case 'sent':
      return (
        <Text style={[styles.tick, { color: theme.messageSentMeta }]}>✓</Text>
      );
    case 'delivered':
      return (
        <Text style={[styles.tick, { color: theme.messageSentMeta }]}>✓✓</Text>
      );
    case 'read':
      return <Text style={[styles.tick, { color: theme.tickRead }]}>✓✓</Text>;
    default:
      return null;
  }
}

function MessageBubble({ message, isMine, onPressFailed }) {
  const { theme } = useTheme();
  const failed = message.status === 'failed';

  const bubbleColor = isMine ? theme.messageSent : theme.messageReceived;
  const textColor = isMine ? theme.messageSentText : theme.messageReceivedText;
  const metaColor = isMine ? theme.messageSentMeta : theme.secondaryText;

  return (
    <View style={[styles.row, isMine ? styles.rowMine : styles.rowTheirs]}>
      <Pressable
        disabled={!failed}
        onPress={() => onPressFailed?.(message)}
        style={[
          styles.bubble,
          { backgroundColor: bubbleColor },
          isMine ? styles.bubbleMine : styles.bubbleTheirs,
          failed && { borderWidth: 1, borderColor: theme.danger },
        ]}
      >
        <Text style={[styles.text, { color: textColor }]}>{message.text}</Text>
        <View style={styles.meta}>
          <Text style={[styles.time, { color: metaColor }]}>
            {formatTime(message.createdAt)}
          </Text>
          {isMine && !failed ? (
            <StatusTicks status={message.status} theme={theme} />
          ) : null}
        </View>
        {failed ? (
          <Text style={[styles.failed, { color: theme.messageSentText }]}>
            Not sent. Tap for options
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
}

export default memo(MessageBubble);

const styles = StyleSheet.create({
  row: { paddingHorizontal: 12, marginVertical: 3, flexDirection: 'row' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 18,
  },
  bubbleMine: { borderBottomRightRadius: 4 },
  bubbleTheirs: { borderBottomLeftRadius: 4 },
  text: { fontSize: 16, lineHeight: 22 },
  meta: {
    flexDirection: 'row',
    alignSelf: 'flex-end',
    alignItems: 'center',
    marginTop: 2,
  },
  time: { fontSize: 11 },
  tick: { fontSize: 11, marginLeft: 4, fontWeight: '700' },
  failed: { fontSize: 11, marginTop: 4, fontWeight: '600' },
});
