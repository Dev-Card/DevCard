// components/ProfileLink.tsx

import React from 'react';
import {
  Linking,
  Pressable,
  Text,
  View,
  StyleSheet,
} from 'react-native';

type ProfileLinkProps = {
  platform: string;
  username: string;
  url: string;
  onPress?: () => void;
};

export default function ProfileLink({
  platform,
  username,
  url,
  onPress,
}: ProfileLinkProps) {
  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }

    Linking.openURL(url);
  };

  return (
    <Pressable style={styles.card} onPress={handlePress}>
      <View>
        <Text style={styles.platform}>{platform}</Text>
        <Text style={styles.username}>{username}</Text>
      </View>

      <Text style={styles.link}>Open</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#161616',
    marginBottom: 12,
  },
  platform: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  username: {
    marginTop: 4,
    fontSize: 14,
    color: '#a1a1aa',
  },
  link: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4f8cff',
  },
});